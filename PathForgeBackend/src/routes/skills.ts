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

/**
 * Weighted readiness: Σ(weight × student_score) / Σ(weight)
 * Uses requiredLevel as the weight — mirrors Flask's computation.
 */
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

// ── GET /api/careers/:career/skills ──────────────────────────────────────────
// Returns ALL non-zero weighted skills for a career, sorted by requiredLevel desc.
// Every skill returned is mandatory.
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

    res.json({
      career:            record.name,
      mandatory_skills:  skills,
      additional_skills: [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch career skills' });
  }
});

// ── GET /api/skills?q= ───────────────────────────────────────────────────────
// Search the aggregated master skill list (built from all career requiredSkills).
// Returns up to 20 results.
router.get('/skills', async (req, res) => {
  const q = ((req.query.q as string) ?? '').toLowerCase().trim();
  try {
    const careers = await prisma.career.findMany({
      select: { requiredSkills: true },
    });

    // Aggregate unique skills with career_frequency count
    const freq: Record<string, number> = {};
    for (const c of careers) {
      const skills = c.requiredSkills as RequiredSkill[];
      for (const s of skills) {
        const key = slugify(s.skill);
        freq[key] = (freq[key] ?? 0) + 1;
      }
    }

    const all = Object.entries(freq)
      .map(([normalized, count]) => ({ normalized, count }))
      .sort((a, b) => b.count - a.count);

    const filtered = q
      ? all.filter((s) => s.normalized.includes(q))
      : all;

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

// ── GET /api/careers/:career/similar-skills ──────────────────────────────────
// Returns skills from the top 3 most similar careers (by cosine similarity)
// that are NOT already in the selected career's skill set.
router.get('/careers/:career/similar-skills', async (req, res) => {
  const careerName = req.params.career as string;
  try {
    const allCareers = await prisma.career.findMany({
      select: { name: true, requiredSkills: true },
    });

    const target = allCareers.find(
      (c) => c.name.toLowerCase() === careerName.toLowerCase()
    );
    if (!target) return res.status(404).json({ error: 'Career not found' });

    // Build a unified skill index
    const allSkillKeys = Array.from(
      new Set(
        allCareers.flatMap((c) =>
          (c.requiredSkills as RequiredSkill[]).map((s) => slugify(s.skill))
        )
      )
    );

    const toVec = (skills: RequiredSkill[]): number[] => {
      const map = Object.fromEntries(
        skills.map((s) => [slugify(s.skill), s.requiredLevel])
      );
      return allSkillKeys.map((k) => map[k] ?? 0);
    };

    const targetVec = toVec(target.requiredSkills as RequiredSkill[]);
    const targetSkills = new Set(
      (target.requiredSkills as RequiredSkill[]).map((s) => slugify(s.skill))
    );

    // Rank all other careers by cosine similarity
    const ranked = allCareers
      .filter((c) => c.name.toLowerCase() !== careerName.toLowerCase())
      .map((c) => ({
        name:   c.name,
        skills: c.requiredSkills as RequiredSkill[],
        sim:    cosineSimilarity(targetVec, toVec(c.requiredSkills as RequiredSkill[])),
      }))
      .sort((a, b) => b.sim - a.sim)
      .slice(0, 3);

    const seen = new Set<string>();
    const results: Array<{ skill: string; label: string; weight: number; source_career: string }> = [];

    for (const peer of ranked) {
      const sorted = [...peer.skills]
        .sort((a, b) => b.requiredLevel - a.requiredLevel);
      for (const s of sorted) {
        const key = slugify(s.skill);
        if (!targetSkills.has(key) && !seen.has(key)) {
          seen.add(key);
          results.push({
            skill:         key,
            label:         toLabel(s.skill),
            weight:        s.requiredLevel,
            source_career: peer.name,
          });
        }
      }
    }

    res.json({ career: target.name, similar_skills: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch similar skills' });
  }
});

// ── POST /api/skills/affinity-delta ─────────────────────────────────────────
// Given a newly rated skill, return readiness delta for every career.
// Input: { skill, rating (0-1), current_profile: { skill: score } }
router.post('/skills/affinity-delta', async (req, res) => {
  const { skill, rating, current_profile } = req.body as {
    skill: string;
    rating: number;
    current_profile: Record<string, number>;
  };
  if (!skill) return res.status(400).json({ error: 'skill is required' });

  try {
    const allCareers = await prisma.career.findMany({
      select: { name: true, requiredSkills: true },
    });

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

// ── POST /api/careers/compatibility ─────────────────────────────────────────
// Given a full student profile, return all careers with readiness >= 30%.
// Input: { student_profile: { skill: score } }
router.post('/careers/compatibility', async (req, res) => {
  const { student_profile } = req.body as { student_profile: Record<string, number> };
  if (!student_profile) return res.status(400).json({ error: 'student_profile is required' });

  try {
    const allCareers = await prisma.career.findMany({
      select: { name: true, sector: true, requiredSkills: true },
    });

    const results = allCareers
      .map((c) => {
        const required = c.requiredSkills as RequiredSkill[];
        const score = weightedReadiness(required, student_profile);
        if (score < 0.30) return null;

        const topGaps = required
          .map((s) => ({
            skill: slugify(s.skill),
            gap:   Math.max(0, s.requiredLevel - (student_profile[slugify(s.skill)] ?? 0)),
          }))
          .filter((g) => g.gap > 0)
          .sort((a, b) => b.gap - a.gap)
          .slice(0, 3)
          .map((g) => ({ skill: g.skill, gap: Math.round(g.gap * 1000) / 1000 }));

        const pct = score * 100;
        const label =
          pct >= 80 ? 'Advanced' : pct >= 55 ? 'Intermediate' : 'Beginner';

        return {
          career:          c.name,
          sector:          c.sector,
          readiness_score: Math.round(score * 10000) / 10000,
          readiness_label: label,
          top_gaps:        topGaps,
        };
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
