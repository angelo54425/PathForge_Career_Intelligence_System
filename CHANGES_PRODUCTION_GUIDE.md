# PathForge — Production Change Guide
**Session date:** 2026-03-25 → 2026-03-30
**Branch these changes live on:** `dev`
**Target branch for replication:** `main` (production)

---

## Overview of All Changes

This document captures every code change made across two work sessions. It is structured so an AI agent can apply the same changes to the production (`main`) branch from scratch.

---

## PART A — Committed Changes (already in git history on `dev`)

### A1 — `Pathforge-Frontend/middleware.ts`
**Commit:** `2c2f90c` — *fix: replace custom JWT middleware with NextAuth built-in auth middleware*

**What changed:** Replaced ~50 lines of custom JWT verification logic with a single NextAuth export.

**Before:**
```ts
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('next-auth.session-token')?.value;
  // ... custom token check + redirect logic (50 lines)
}

export const config = {
  matcher: ["/dashboard/:path*", "/assessment/:path*", ...],
};
```

**After (final file content):**
```ts
export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/assessment/:path*",
    "/skill-gap/:path*",
    "/universities/:path*",
    "/market-intel/:path*",
    "/roadmap/:path*",
    "/progress/:path*",
    "/profile/:path*",
    "/resources/:path*",
  ],
};
```

---

### A2 — `PathForgeBackend/src/index.ts`
**Commit:** `e45c2a5` — *fix: enhance CORS configuration to allow specific origins*

**What changed:** Replace the single-origin CORS string with a dynamic allowlist function.

**Diff to apply:**
```ts
// REPLACE this:
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));

// WITH this:
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:3000",
  "https://pathforge.live",
  "https://www.pathforge.live",
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
}));
```

---

## PART B — Uncommitted Changes (staged/unstaged on `dev`, must be committed and ported)

These are the 7 files with pending changes (918 net insertions):

---

### B1 — `Path-Forge API/app.py` (Flask — Python)

#### B1.1 — `load_data()` — add `master_skills_df`

Find the `load_data()` function. Make these two changes:

**Change 1** — Load the master skills CSV inside `load_data()`, after the `program_vector` load:
```python
master_skills_path = os.path.join(ARTIFACTS_DIR, "master_skills.csv")
master_skills_df = pd.read_csv(master_skills_path) if os.path.isfile(master_skills_path) else pd.DataFrame()
```

**Change 2** — Update the print statement and return value:
```python
# Old print:
print(
    f"✓ Loaded {len(career_vector)} careers, "
    f"{len(program_vector)} programs, "
    f"{career_vector.shape[1]} skills"
)
return career_vector, career_meta, program_vector, program_meta, career_sim, alignment_mat

# New print + return:
print(
    f"✓ Loaded {len(career_vector)} careers, "
    f"{len(program_vector)} programs, "
    f"{career_vector.shape[1]} skills, "
    f"{len(master_skills_df)} master skills"
)
return career_vector, career_meta, program_vector, program_meta, career_sim, alignment_mat, master_skills_df
```

**Change 3** — Update the unpacking at the call site (where `load_data()` is called at startup):
```python
# Old:
(
    career_vector_matrix,
    career_metadata,
    program_vector_matrix,
    program_metadata,
    career_sim_df,
    alignment_matrix,
) = load_data()

# New (add master_skills_df):
(
    career_vector_matrix,
    career_metadata,
    program_vector_matrix,
    program_metadata,
    career_sim_df,
    alignment_matrix,
    master_skills_df,
) = load_data()
```

---

#### B1.2 — `/api/careers/<career_name>/skills` endpoint — replace implementation

Find the existing `career_skills` route and **replace its entire body** with:

```python
@app.route("/api/careers/<path:career_name>/skills", methods=["GET"])
def career_skills(career_name: str):
    """
    Return ALL non-zero weighted skills for a career, sorted by weight descending.
    Every skill returned is mandatory — the user must rate them all.
    """
    canonical = career_name_map.get(career_name.lower())
    if not canonical:
        return jsonify({"status": "error", "message": f"Career '{career_name}' not found"}), 404

    row = career_vector_matrix.loc[canonical]
    # All skills with non-zero weight, sorted by weight descending
    weighted = row[row > 0].sort_values(ascending=False)

    mandatory_skills = [
        {
            "skill":  skill,
            "label":  skill.replace("_", " ").title(),
            "weight": round(float(weight), 4),
        }
        for skill, weight in weighted.items()
    ]

    return jsonify({
        "career":            canonical,
        "mandatory_skills":  mandatory_skills,
        "additional_skills": [],  # kept for backwards compatibility
    })
```

---

#### B1.3 — Add 4 new Flask endpoints

Add the following four endpoints **after** the `career_skills` route:

```python
@app.route("/api/skills", methods=["GET"])
def search_skills():
    """
    Search the master skills list.
    Query params:
      q (str, optional) — substring filter on skill_name_normalized
    Returns up to 20 results.
    """
    if master_skills_df.empty:
        return jsonify({"skills": []})

    q = request.args.get("q", "").lower().strip()
    df = master_skills_df.copy()
    if q:
        df = df[df["skill_name_normalized"].str.lower().str.contains(q, na=False)]

    results = (
        df[["skill_id", "skill_name_normalized", "career_frequency", "program_frequency"]]
        .head(20)
        .to_dict(orient="records")
    )
    return jsonify({"skills": results})


@app.route("/api/careers/<path:career_name>/similar-skills", methods=["GET"])
def similar_career_skills(career_name: str):
    """
    Return skills from the top 3 most similar careers that are NOT already
    in the selected career's weighted skill set.
    """
    canonical = career_name_map.get(career_name.lower())
    if not canonical:
        return jsonify({"status": "error", "message": f"Career '{career_name}' not found"}), 404

    own_skills = set(career_vector_matrix.loc[canonical][career_vector_matrix.loc[canonical] > 0].index)

    sim_row = career_sim_df.loc[canonical].drop(labels=[canonical], errors="ignore")
    top_similar = sim_row.sort_values(ascending=False).head(3).index.tolist()

    seen = set()
    results = []
    for similar_career in top_similar:
        row = career_vector_matrix.loc[similar_career]
        for skill, weight in row[row > 0].sort_values(ascending=False).items():
            if skill not in own_skills and skill not in seen:
                seen.add(skill)
                results.append({
                    "skill":         skill,
                    "label":         skill.replace("_", " ").title(),
                    "weight":        round(float(weight), 4),
                    "source_career": similar_career,
                })

    return jsonify({"career": canonical, "similar_skills": results})


@app.route("/api/skills/affinity-delta", methods=["POST"])
def skill_affinity_delta():
    """
    Given a newly rated skill, return the readiness delta for every career.
    Input: { skill, rating (0.0-1.0), current_profile: {skill: score} }
    Returns careers where delta != 0, sorted by delta desc.
    """
    data = request.get_json(force=True) or {}
    skill   = data.get("skill", "").strip()
    rating  = float(data.get("rating", 0.0))
    profile = data.get("current_profile", {})

    if not skill:
        return jsonify({"status": "error", "message": "skill is required"}), 400

    old_profile = {k: v for k, v in profile.items() if k != skill}
    new_profile = {**old_profile, skill: rating}

    deltas = []
    for career in career_vector_matrix.index:
        old_gap = compute_skill_gaps(old_profile, career)
        new_gap = compute_skill_gaps(new_profile, career)
        old_score = old_gap.get("overall_readiness", 0.0)
        new_score = new_gap.get("overall_readiness", 0.0)
        delta = round(new_score - old_score, 4)
        if delta != 0:
            deltas.append({
                "career":    career,
                "delta":     delta,
                "new_score": round(new_score, 4),
            })

    deltas.sort(key=lambda x: x["delta"], reverse=True)
    return jsonify({"skill": skill, "deltas": deltas})


@app.route("/api/careers/compatibility", methods=["POST"])
def career_compatibility():
    """
    Given a full student profile, return all careers with readiness >= 30%,
    sorted by readiness score descending.
    Input: { student_profile: {skill: score} }
    """
    data = request.get_json(force=True) or {}
    profile = data.get("student_profile", {})

    if not profile:
        return jsonify({"status": "error", "message": "student_profile is required"}), 400

    results = []
    for career in career_vector_matrix.index:
        meta = career_metadata.loc[career]
        gap_data = compute_skill_gaps(profile, career)
        score = gap_data.get("overall_readiness", 0.0)
        if score >= 0.30:
            top_gaps = gap_data.get("top_gaps", [])[:3]
            readiness_pct = round(score * 100, 1)
            label = (
                "Advanced" if readiness_pct >= 80
                else "Intermediate" if readiness_pct >= 55
                else "Beginner"
            )
            results.append({
                "career":          career,
                "sector":          meta.get("career_sector", ""),
                "readiness_score": round(score, 4),
                "readiness_label": label,
                "top_gaps":        [{"skill": g["skill"], "gap": round(g["gap"], 3)} for g in top_gaps],
            })

    results.sort(key=lambda x: x["readiness_score"], reverse=True)
    return jsonify({"compatible_careers": results, "count": len(results)})
```

---

### B2 — `PathForgeBackend/src/index.ts` (Express — additional change on top of A2)

Add the skills router import and registration (on top of the CORS fix from A2):

```ts
// Add this import with the other route imports:
import skillsRouter from './routes/skills';

// Add this line with the other app.use() registrations:
app.use('/api', skillsRouter);
```

---

### B3 — `PathForgeBackend/src/routes/skills.ts` (NEW FILE — create it)

Create the file at `PathForgeBackend/src/routes/skills.ts` with the full content below.
This mirrors all 5 new Flask endpoints using Prisma + TypeScript:

```ts
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { cosineSimilarity } from '../utils/similarity';

const router = Router();
const prisma = new PrismaClient();

type RequiredSkill = { skill: string; requiredLevel: number };

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

function toLabel(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function weightedReadiness(
  requiredSkills: RequiredSkill[],
  profile: Record<string, number>
): number {
  const totalWeight = requiredSkills.reduce((s, r) => s + r.requiredLevel, 0);
  if (totalWeight === 0) return 0;
  const scored = requiredSkills.reduce((s, r) => {
    const key = slugify(r.skill);
    return s + r.requiredLevel * (profile[key] ?? 0);
  }, 0);
  return Math.min(scored / totalWeight, 1);
}

// GET /api/careers/:career/skills
router.get('/careers/:career/skills', async (req, res) => {
  const careerName = req.params.career as string;
  try {
    const record = await prisma.career.findFirst({
      where: { name: { equals: careerName, mode: 'insensitive' } },
      select: { name: true, requiredSkills: true },
    });
    if (!record) return res.status(404).json({ error: 'Career not found' });

    const skills = (record.requiredSkills as RequiredSkill[])
      .filter((s) => s.requiredLevel > 0)
      .sort((a, b) => b.requiredLevel - a.requiredLevel)
      .map((s) => ({
        skill:  slugify(s.skill),
        label:  toLabel(s.skill),
        weight: s.requiredLevel,
      }));

    res.json({ career: record.name, mandatory_skills: skills, additional_skills: [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch career skills' });
  }
});

// GET /api/skills?q=
router.get('/skills', async (req, res) => {
  const q = ((req.query.q as string) ?? '').toLowerCase().trim();
  try {
    const careers = await prisma.career.findMany({ select: { requiredSkills: true } });
    const freq: Record<string, number> = {};
    for (const c of careers) {
      for (const s of c.requiredSkills as RequiredSkill[]) {
        const key = slugify(s.skill);
        freq[key] = (freq[key] ?? 0) + 1;
      }
    }
    const all = Object.entries(freq)
      .map(([normalized, count]) => ({ normalized, count }))
      .sort((a, b) => b.count - a.count);
    const filtered = q ? all.filter((s) => s.normalized.includes(q)) : all;
    const results = filtered.slice(0, 20).map((s, i) => ({
      skill_id:              `SK${String(i).padStart(4, '0')}`,
      skill_name_normalized: s.normalized,
      career_frequency:      s.count,
      program_frequency:     0,
    }));
    res.json({ skills: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to search skills' });
  }
});

// GET /api/careers/:career/similar-skills
router.get('/careers/:career/similar-skills', async (req, res) => {
  const careerName = req.params.career as string;
  try {
    const allCareers = await prisma.career.findMany({ select: { name: true, requiredSkills: true } });
    const target = allCareers.find((c) => c.name.toLowerCase() === careerName.toLowerCase());
    if (!target) return res.status(404).json({ error: 'Career not found' });

    const allSkillKeys = Array.from(new Set(
      allCareers.flatMap((c) => (c.requiredSkills as RequiredSkill[]).map((s) => slugify(s.skill)))
    ));
    const toVec = (skills: RequiredSkill[]): number[] => {
      const map = Object.fromEntries(skills.map((s) => [slugify(s.skill), s.requiredLevel]));
      return allSkillKeys.map((k) => map[k] ?? 0);
    };
    const targetVec = toVec(target.requiredSkills as RequiredSkill[]);
    const targetSkills = new Set((target.requiredSkills as RequiredSkill[]).map((s) => slugify(s.skill)));

    const ranked = allCareers
      .filter((c) => c.name.toLowerCase() !== careerName.toLowerCase())
      .map((c) => ({
        name: c.name, skills: c.requiredSkills as RequiredSkill[],
        sim: cosineSimilarity(targetVec, toVec(c.requiredSkills as RequiredSkill[])),
      }))
      .sort((a, b) => b.sim - a.sim)
      .slice(0, 3);

    const seen = new Set<string>();
    const results: Array<{ skill: string; label: string; weight: number; source_career: string }> = [];
    for (const peer of ranked) {
      for (const s of [...peer.skills].sort((a, b) => b.requiredLevel - a.requiredLevel)) {
        const key = slugify(s.skill);
        if (!targetSkills.has(key) && !seen.has(key)) {
          seen.add(key);
          results.push({ skill: key, label: toLabel(s.skill), weight: s.requiredLevel, source_career: peer.name });
        }
      }
    }
    res.json({ career: target.name, similar_skills: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch similar skills' });
  }
});

// POST /api/skills/affinity-delta
router.post('/skills/affinity-delta', async (req, res) => {
  const { skill, rating, current_profile } = req.body as {
    skill: string; rating: number; current_profile: Record<string, number>;
  };
  if (!skill) return res.status(400).json({ error: 'skill is required' });
  try {
    const allCareers = await prisma.career.findMany({ select: { name: true, requiredSkills: true } });
    const profileWithout = { ...current_profile };
    delete profileWithout[skill];
    const profileWith = { ...profileWithout, [skill]: rating };
    const deltas = allCareers
      .map((c) => {
        const required = c.requiredSkills as RequiredSkill[];
        const oldScore = weightedReadiness(required, profileWithout);
        const newScore = weightedReadiness(required, profileWith);
        const delta = newScore - oldScore;
        return { career: c.name, delta: Math.round(delta * 10000) / 10000, new_score: Math.round(newScore * 10000) / 10000 };
      })
      .filter((d) => d.delta !== 0)
      .sort((a, b) => b.delta - a.delta);
    res.json({ skill, deltas });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to compute affinity delta' });
  }
});

// POST /api/careers/compatibility
router.post('/careers/compatibility', async (req, res) => {
  const { student_profile } = req.body as { student_profile: Record<string, number> };
  if (!student_profile) return res.status(400).json({ error: 'student_profile is required' });
  try {
    const allCareers = await prisma.career.findMany({ select: { name: true, sector: true, requiredSkills: true } });
    const results = allCareers
      .map((c) => {
        const required = c.requiredSkills as RequiredSkill[];
        const score = weightedReadiness(required, student_profile);
        if (score < 0.30) return null;
        const topGaps = required
          .map((s) => ({ skill: slugify(s.skill), gap: Math.max(0, s.requiredLevel - (student_profile[slugify(s.skill)] ?? 0)) }))
          .filter((g) => g.gap > 0)
          .sort((a, b) => b.gap - a.gap)
          .slice(0, 3)
          .map((g) => ({ skill: g.skill, gap: Math.round(g.gap * 1000) / 1000 }));
        const pct = score * 100;
        const label = pct >= 80 ? 'Advanced' : pct >= 55 ? 'Intermediate' : 'Beginner';
        return { career: c.name, sector: c.sector, readiness_score: Math.round(score * 10000) / 10000, readiness_label: label, top_gaps: topGaps };
      })
      .filter(Boolean)
      .sort((a, b) => b!.readiness_score - a!.readiness_score);
    res.json({ compatible_careers: results, count: results.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to compute career compatibility' });
  }
});

export default router;
```

---

### B4 — `PathForgeBackend/src/routes/assessment.ts`

**What changed:** Accept and persist `customSkills` from the POST body.

Find `router.post('/', optionalAuth, async (req, res) => {` and apply:

```ts
// CHANGE destructuring from:
const { deviceId, career, profile } = req.body;

// TO:
const { deviceId, career, profile, customSkills } = req.body;

// ADD after the validation check (before the try block):
// Merge customSkills into the JSON profile under a reserved key so no schema change is needed
const storedProfile = Array.isArray(customSkills) && customSkills.length > 0
  ? { ...profile, _customSkills: customSkills }
  : profile;

// CHANGE the prisma.assessment.create data from:
data: { deviceId, userId: req.user?.userId || null, career, profile }

// TO:
data: { deviceId, userId: req.user?.userId || null, career, profile: storedProfile }
```

---

### B5 — `Pathforge-Frontend/lib/types.ts`

Append these 4 interfaces to the **end** of the file:

```ts
// ── Expanded Skills Assessment ────────────────────────────────────────────────

export interface WeightedSkill {
  skill: string;
  label: string;
  weight: number;
  source_career?: string; // set when coming from similar-career suggestions
}

export interface SkillEntry {
  skill_id: string;
  skill_name_normalized: string;
  career_frequency: number;
  program_frequency: number;
}

export interface SkillAffinityDelta {
  career: string;
  delta: number;     // positive = boosts compatibility, negative = drags
  new_score: number;
}

export interface CareerCompatibility {
  career: string;
  sector: string;
  readiness_score: number;
  readiness_label: "Advanced" | "Intermediate" | "Beginner";
  top_gaps: Array<{ skill: string; gap: number }>;
}
```

---

### B6 — `Pathforge-Frontend/lib/api.ts`

**Step 1** — Add 4 new type imports to the existing import block at the top:
```ts
// Add to the existing import from "./types":
import type {
  // ... existing imports ...
  WeightedSkill,
  SkillEntry,
  SkillAffinityDelta,
  CareerCompatibility,
} from "./types";
```

**Step 2** — Append these 5 functions to the **end** of the file:

```ts
// ── Expanded Skills Assessment API ───────────────────────────────────────────

export async function getCareerSkills(
  career: string
): Promise<{ career: string; mandatory_skills: WeightedSkill[] }> {
  return apiFetch(`/api/careers/${encodeURIComponent(career)}/skills`);
}

export async function searchSkills(query: string): Promise<SkillEntry[]> {
  const params = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
  const res = await apiFetch<{ skills: SkillEntry[] }>(`/api/skills${params}`);
  return res.skills ?? [];
}

export async function getSimilarCareerSkills(
  career: string
): Promise<WeightedSkill[]> {
  const res = await apiFetch<{ similar_skills: WeightedSkill[] }>(
    `/api/careers/${encodeURIComponent(career)}/similar-skills`
  );
  return res.similar_skills ?? [];
}

export async function getSkillAffinityDelta(
  skill: string,
  rating: number,
  currentProfile: StudentProfile
): Promise<SkillAffinityDelta[]> {
  const res = await apiFetch<{ deltas: SkillAffinityDelta[] }>(
    "/api/skills/affinity-delta",
    {
      method: "POST",
      body: JSON.stringify({ skill, rating, current_profile: currentProfile }),
    }
  );
  return res.deltas ?? [];
}

export async function getCareerCompatibility(
  profile: StudentProfile
): Promise<CareerCompatibility[]> {
  const res = await apiFetch<{ compatible_careers: CareerCompatibility[] }>(
    "/api/careers/compatibility",
    {
      method: "POST",
      body: JSON.stringify({ student_profile: profile }),
    }
  );
  return res.compatible_careers ?? [];
}
```

---

### B7 — `Pathforge-Frontend/app/assessment/page.tsx`

This is the largest change (~600 lines net). The assessment Step 3 (skill rating) was completely overhauled.

**Summary of changes:**

1. **New imports** — add `useCallback`, `useRef` to React import; add `getCareerSkills`, `searchSkills`, `getSimilarCareerSkills`, `getSkillAffinityDelta` to api import; add `WeightedSkill`, `SkillEntry`, `SkillAffinityDelta` to types import.

2. **New state variables** — add inside the component before the existing state:
```tsx
const [mandatorySkills, setMandatorySkills] = useState<WeightedSkill[]>([]);
const [loadingSkills, setLoadingSkills] = useState(false);
const [extraSkills, setExtraSkills] = useState<WeightedSkill[]>([]);
const [customSkills, setCustomSkills] = useState<string[]>([]);
const [showAddMore, setShowAddMore] = useState(false);
const [skillSearch, setSkillSearch] = useState("");
const [searchResults, setSearchResults] = useState<SkillEntry[]>([]);
const [similarSkills, setSimilarSkills] = useState<WeightedSkill[]>([]);
const [affinityDeltas, setAffinityDeltas] = useState<Record<string, SkillAffinityDelta[]>>({});
const [customInput, setCustomInput] = useState("");
const [submitError, setSubmitError] = useState<string | null>(null);
const [softCapWarning, setSoftCapWarning] = useState(false);
const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
const [dropdownIndex, setDropdownIndex] = useState(-1);
const [highlightedSkill, setHighlightedSkill] = useState<string | null>(null);
const affinityTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
const skillCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
const searchInputRef = useRef<HTMLInputElement>(null);
const dropdownRef = useRef<HTMLDivElement>(null);
```

3. **Update derived progress values:**
```tsx
// Replace:
const careerSkills = selectedCareer?.skills ?? [];
const allSkills = careerSkills.map((s) => s.skill);
const answered = Object.keys(levels).length;
const pct = allSkills.length > 0 ? (answered / allSkills.length) * 100 : 0;

// With:
const selectedCareer = sectorCareers.find((c) => c.career === career);
const mandatoryAnswered = mandatorySkills.filter((s) => levels[s.skill] !== undefined).length;
const pct = mandatorySkills.length > 0 ? (mandatoryAnswered / mandatorySkills.length) * 100 : 0;
const totalSkillCount = mandatorySkills.length + extraSkills.length + customSkills.length;
```

4. **Add `useEffect` to fetch mandatory + similar-career skills when entering Step 3:**
```tsx
useEffect(() => {
  if (step !== "skills" || !career) return;
  setLoadingSkills(true);
  setMandatorySkills([]);
  setExtraSkills([]);
  setCustomSkills([]);
  setAffinityDeltas({});
  setSoftCapWarning(false);

  Promise.all([getCareerSkills(career), getSimilarCareerSkills(career)])
    .then(([skillsRes, simSkills]) => {
      setMandatorySkills(skillsRes.mandatory_skills ?? []);
      setSimilarSkills(simSkills);
    })
    .catch(() => {
      const fallback: WeightedSkill[] = (selectedCareer?.skills ?? []).map((s) => ({
        skill: s.skill,
        label: s.skill.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        weight: s.requiredLevel,
      }));
      setMandatorySkills(fallback);
    })
    .finally(() => setLoadingSkills(false));
}, [step, career]); // eslint-disable-line react-hooks/exhaustive-deps
```

5. **Add debounced skill search `useEffect`:**
```tsx
useEffect(() => {
  if (!skillSearch.trim()) { setSearchResults([]); return; }
  const timer = setTimeout(() => {
    searchSkills(skillSearch).then(setSearchResults).catch(() => {});
  }, 400);
  return () => clearTimeout(timer);
}, [skillSearch]);
```

6. **Add helper functions** (after `handleSectorSelect`):
```tsx
const buildProfile = useCallback((): StudentProfile => {
  const profile: StudentProfile = {};
  for (const s of mandatorySkills) {
    if (levels[s.skill] !== undefined)
      profile[slugify(s.skill)] = (levels[s.skill] as Level) / 4;
  }
  for (const s of extraSkills) {
    if (levels[s.skill] !== undefined)
      profile[slugify(s.skill)] = (levels[s.skill] as Level) / 4;
  }
  return profile;
}, [mandatorySkills, extraSkills, levels]);

function handleExtraSkillRate(skill: string, level: Level) {
  setLevel(skill, level);
  if (affinityTimers.current[skill]) clearTimeout(affinityTimers.current[skill]);
  affinityTimers.current[skill] = setTimeout(() => {
    const profileWithoutSkill = buildProfile();
    delete profileWithoutSkill[slugify(skill)];
    getSkillAffinityDelta(slugify(skill), level / 4, profileWithoutSkill)
      .then((deltas) => setAffinityDeltas((prev) => ({ ...prev, [skill]: deltas.slice(0, 3) })))
      .catch(() => {});
  }, 500);
}

function addExtraSkill(entry: WeightedSkill | SkillEntry) {
  const skillName = "skill_name_normalized" in entry
    ? (entry as SkillEntry).skill_name_normalized
    : (entry as WeightedSkill).skill;
  const existing = [...mandatorySkills.map((s) => s.skill), ...extraSkills.map((s) => s.skill), ...customSkills];
  if (existing.includes(skillName)) return;
  if (totalSkillCount >= 30) setSoftCapWarning(true);
  const newSkill: WeightedSkill = {
    skill: skillName,
    label: skillName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    weight: "weight" in entry ? (entry as WeightedSkill).weight : 0,
    source_career: "source_career" in entry ? (entry as WeightedSkill).source_career : undefined,
  };
  setExtraSkills((prev) => [...prev, newSkill]);
  setSkillSearch(""); setSearchResults([]); setSearchDropdownOpen(false); setDropdownIndex(-1);
  setHighlightedSkill(skillName);
  setTimeout(() => skillCardRefs.current[skillName]?.scrollIntoView({ behavior: "smooth", block: "center" }), 120);
  setTimeout(() => setHighlightedSkill(null), 3500);
}

function addCustomSkill() {
  const name = customInput.trim();
  if (!name) return;
  const existing = [...mandatorySkills.map((s) => s.skill), ...extraSkills.map((s) => s.skill), ...customSkills];
  if (existing.includes(name)) { setCustomInput(""); return; }
  if (totalSkillCount >= 30) setSoftCapWarning(true);
  setCustomSkills((prev) => [...prev, name]);
  setCustomInput("");
}

function removeExtraSkill(skill: string) {
  setExtraSkills((prev) => prev.filter((s) => s.skill !== skill));
  setLevels((prev) => { const n = { ...prev }; delete n[skill]; return n; });
  setAffinityDeltas((prev) => { const n = { ...prev }; delete n[skill]; return n; });
}

function removeCustomSkill(skill: string) {
  setCustomSkills((prev) => prev.filter((s) => s !== skill));
  setLevels((prev) => { const n = { ...prev }; delete n[skill]; return n; });
}
```

7. **Update `handleSubmit`** — add mandatory-skills validation guard and use `buildProfile()`:
```tsx
async function handleSubmit() {
  const unrated = mandatorySkills.filter((s) => levels[s.skill] === undefined);
  if (unrated.length > 0) {
    setSubmitError(`Please rate all ${unrated.length} required skill${unrated.length > 1 ? "s" : ""} before submitting.`);
    return;
  }
  setSubmitError(null);
  setLoading(true);
  const profile = buildProfile();
  // ... rest of submit logic unchanged, but pass customSkills in the payload:
  await apiFetch("/api/assessment", {
    method: "POST",
    body: JSON.stringify({ deviceId, career, profile, customSkills }),
  });
}
```

8. **Replace the Step 3 JSX** — The entire `{step === "skills" && ...}` block must be replaced with the new version that renders:
   - A soft-cap warning banner (shows when `totalSkillCount >= 30`)
   - **Mandatory Skills card** — numbered list, loading spinner, amber highlight for unrated skills when `submitError` is set, shows `Required XX%` badge
   - **Add More Skills card** — collapsible section with:
     - Searchable skill dropdown (keyboard navigable: ArrowUp/Down, Enter, Escape)
     - Similar-career skill suggestions (chips from top 3 similar careers)
     - Custom skill free-text input
     - Rated extra skills with affinity delta chips (↑/↓ career impact)
     - Rated custom skills
   - A submit error banner above the submit button

  > **Note for agent:** The full JSX for this section is ~400 lines. Reference the `dev` branch file `Pathforge-Frontend/app/assessment/page.tsx` starting around line 491 through end of the `{step === "skills"}` block as the exact source of truth.

---

### B8 — `Pathforge-Frontend/app/skill-gap/page.tsx`

Two changes to add the "Other careers that match your profile" section on the analysis view.

**Change 1** — Update imports at top of file:
```tsx
// Change:
import { MOCK, getSkillGap, getMockGapResult } from "@/lib/api";
import type { GapAnalysisResult, SkillGap, StudentProfile } from "@/lib/types";

// To:
import { MOCK, getSkillGap, getMockGapResult, getCareerCompatibility } from "@/lib/api";
import type { GapAnalysisResult, SkillGap, StudentProfile, CareerCompatibility } from "@/lib/types";
```

**Change 2** — Add state variables inside the component:
```tsx
const [altCareers, setAltCareers] = useState<CareerCompatibility[]>([]);
const [loadingAlt, setLoadingAlt] = useState(false);
```

**Change 3** — Inside the `useEffect` that calls `getSkillGap`, after it resolves, add the compatibility fetch:
```tsx
// After: getSkillGap(career, prof).then(setData).catch(...)
// Add:
setLoadingAlt(true);
getCareerCompatibility(prof)
  .then((results) => setAltCareers(results.filter((c) => c.career !== career)))
  .catch(() => {})
  .finally(() => setLoadingAlt(false));
```

**Change 4** — After the `{mode === "compare" && <CompareView ... />}` block, add the Alternative Careers section:
```tsx
{mode === "analysis" && (
  <div className="mt-8">
    <div className="flex items-center gap-3 mb-4">
      <div className="bg-primary/10 p-2 rounded-lg">
        <span className="material-symbols-outlined text-primary text-[22px]">explore</span>
      </div>
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Other careers that match your profile
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Based on all skills you rated — careers where your compatibility is above 30%.
        </p>
      </div>
    </div>

    {loadingAlt ? (
      <div className="card p-8 flex items-center justify-center gap-2 text-slate-500">
        <span className="material-symbols-outlined text-xl animate-spin">autorenew</span>
        Calculating compatibility…
      </div>
    ) : altCareers.length === 0 ? (
      <div className="card p-8 text-center text-slate-500 dark:text-slate-400">
        <span className="material-symbols-outlined text-4xl mb-2 block text-slate-300">work_off</span>
        No strong alternative matches found — add more skills to your assessment to explore broader options.
      </div>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {altCareers.map((c) => {
          const pctScore = Math.round(c.readiness_score * 100);
          const labelColor =
            c.readiness_label === "Advanced"
              ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400"
              : c.readiness_label === "Intermediate"
              ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
              : "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400";
          return (
            <div key={c.career} className="card p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-white">{c.career}</p>
                  <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full mt-1 inline-block">
                    {c.sector}
                  </span>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border shrink-0 ${labelColor}`}>
                  {c.readiness_label}
                </span>
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Compatibility</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{pctScore}%</span>
                </div>
                <ProgressBar value={pctScore} showLabel={false} />
              </div>
              {c.top_gaps.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Top gaps
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {c.top_gaps.map((g) => (
                      <span key={g.skill} className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                        {g.skill.replace(/_/g, " ")} ({Math.round(g.gap * 100)}%)
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    )}
  </div>
)}
```

---

## PART C — Agent Execution Order for Production Branch

Apply changes in this exact sequence to avoid build errors:

```
1.  Pathforge-Frontend/lib/types.ts          — add 4 interfaces (B5)
2.  Pathforge-Frontend/lib/api.ts            — add imports + 5 functions (B6)
3.  PathForgeBackend/src/routes/skills.ts    — CREATE new file (B3)
4.  PathForgeBackend/src/routes/assessment.ts — customSkills support (B4)
5.  PathForgeBackend/src/index.ts            — CORS fix (A2) + register skills router (B2)
6.  Path-Forge API/app.py                    — load_data + 5 endpoints (B1)
7.  Pathforge-Frontend/app/assessment/page.tsx — full skills step overhaul (B7)
8.  Pathforge-Frontend/app/skill-gap/page.tsx  — alternative careers section (B8)
9.  Pathforge-Frontend/middleware.ts         — replace with NextAuth export (A1)
```

---

## PART D — Quick Verification Checklist

After applying all changes, verify:

- [ ] `GET /api/careers/{career}/skills` returns `mandatory_skills` array (no `additional_skills`)
- [ ] `GET /api/skills?q=python` returns up to 20 skill entries
- [ ] `GET /api/careers/{career}/similar-skills` returns skills from peer careers
- [ ] `POST /api/skills/affinity-delta` returns `deltas` array
- [ ] `POST /api/careers/compatibility` returns `compatible_careers` array with readiness >= 30%
- [ ] Assessment Step 3 shows all mandatory skills with numbered list and Required % badge
- [ ] "Add More Skills" section expands and shows similar-career suggestions
- [ ] Skill search dropdown is keyboard navigable
- [ ] Submitting without rating all mandatory skills shows error
- [ ] Skill-gap page shows "Other careers that match your profile" grid after load
- [ ] CORS allows `https://pathforge.live` and `https://www.pathforge.live`
- [ ] Protected routes redirect unauthenticated users (middleware uses NextAuth)
