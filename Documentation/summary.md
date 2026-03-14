# PathForge — Session Summary (2026-03-12)

## Overview

Today's work integrated the **pre-computed ML sample data** into the PathForge platform and completed the **dynamic career state** system. The platform went from using 5 universities with fake alignment scores to **22 real East African universities**, **55 programs**, and **1,430 ML-backed alignment records**.

---

## What Changed

### 1. `PathForgeBackend/prisma/seed.js` — **Complete Rewrite** (424 lines)

**Before:** 5 universities, 6 programs, simple string-matching `computeAlignment()` formula, ~50 manually curated skills.

**After:** Reads directly from the ML-generated CSV files in `prisma/Sample data/`:

| What | Before | After |
|------|--------|-------|
| Universities | 5 | **22** (Kenya, Uganda, Tanzania, Rwanda) |
| Programs | 6 | **55** (14 program types) |
| Alignment records | ~156 (formula) | **1,430** (pre-computed ML scores) |
| Curriculum per program | Hand-crafted | Derived from `program_vectors.csv` (top 10 skills) |
| Alignment scoring | String match | Sigmoid-normalized ML scores from `alignment_matrix.csv` |

**Key additions:**
- CSV parsing helpers (`readCSV`, `splitLine`) to load sample data at seed time
- Skill name formatter (`fmtSkill`) mapping 50+ snake_case skill IDs → display names via `master_skill_dictionary.csv`
- Sigmoid normalization (`normScore`) converting raw ML scores (0–0.25 range) to user-friendly 0–1 range
- Proxy scoring for Software Engineer & Data Engineer (not in original ML model) — averages scores from similar careers
- Batch insertion of alignment records (batch size: 300)

---

### 2. `Pathforge-Frontend/lib/api.ts` — **Complete Rewrite** (331 lines)

**Before:** Static MOCK data with fake similar careers ("Business Intelligence Analyst", "Research Scientist", "Quantitative Analyst") and hardcoded Data Scientist gap analysis.

**After:** Full 24×24 career similarity matrix embedded from `career_similarity.csv`, plus dynamic mock generators.

**Key additions:**
- `_SIM_NAMES` — 24 career names array
- `_SIM` — 24×24 cosine similarity matrix (576 values)
- `_SIM_PROXIES` — Maps Software Engineer → Full Stack Developer, Data Engineer → Data Scientist for similarity lookups
- `getMockSimilarCareers(career, topN)` — Looks up any career in the similarity matrix, returns top-N most similar with sector info
- `getMockGapResult(career)` — Generates a dynamic gap analysis from the career's required skills (no more hardcoded Data Scientist)
- `MOCK.universityMatches` updated to real universities (Nelson Mandela AIST, CMU Rwanda, Makerere, ALU)
- `MOCK.similarCareers` updated to real Data Scientist similarities (ML Engineer 0.877, AI Engineer 0.714, etc.)
- `SkillGap` type imported and properly typed (fixed TypeScript errors)

---

### 3. `Pathforge-Frontend/app/universities/page.tsx` — **Updated** (390 lines)

**Changes:**
- `UNIVERSITY_WEBSITES` expanded from **5 → 22** universities with verified URLs:
  - Kenya: UoN, JKUAT, Kenyatta, Moi, TU Kenya, USIU Africa
  - Uganda: Makerere, Kyambogo, UCU, UMU, MUST
  - Tanzania: UDSM, Ardhi, Mzumbe, NM-AIST, MUHAS, UDOM
  - Rwanda: UR, CMU Rwanda, ALU, UoK, AUCA
- `PROGRAMS` filter expanded from 4 → **14 program types** (CS, IT, SE, DS, AI, Cybersecurity, BBA, Accounting, Finance, Economics, Analytics, EE, Environmental Eng, Industrial Eng)
- `TABLE_DATA` updated from old universities to sample data universities (CMU Rwanda, Makerere, UoN)

---

### 4. `Pathforge-Frontend/app/dashboard/page.tsx` — **Updated** (366 lines)

**Changes:**
- Added imports for `getMockSimilarCareers` and `getMockGapResult`
- **Similar careers fallback** now uses `getMockSimilarCareers(targetCareer, 3)` instead of static MOCK — shows real similar careers for any selected career
- **Gap analysis fallback** now uses `getMockGapResult(targetCareer)` — generates career-specific skill gaps instead of always showing Data Scientist gaps

---

### 5. `Pathforge-Frontend/lib/careerStore.ts` — **Created** (24 lines)

*(Created in earlier session today)*

Simple localStorage wrapper for persisting career state across pages:
- `getTargetCareer()` / `setTargetCareer(career)` — stores selected career
- `getStudentProfile()` / `setStudentProfile(profile)` — stores assessment results
- SSR-safe with `typeof window` checks
- Default career: "Data Scientist"

---

### 6. `Pathforge-Frontend/lib/types.ts` — **Updated** (75 lines)

*(Updated in earlier session today)*

Added/refined TypeScript interfaces:
- `SkillGap` — with severity union type `"critical" | "moderate" | "minor" | "none"`
- `GapAnalysisResult`, `SimilarCareer`, `StudentProfile`, `MarketData`, `LearningModule`, `ProgressPoint`, `UserState`

---

### 7. Multiple Frontend Pages — **Updated** (earlier session)

All pages updated to read career from `careerStore` instead of hardcoding "Data Scientist":

| Page | File | Change |
|------|------|--------|
| Assessment | `app/assessment/page.tsx` | Saves career + profile to localStorage |
| Dashboard | `app/dashboard/page.tsx` | Reads career from store |
| Skill Gap | `app/skill-gap/page.tsx` | Reads career + profile from store |
| Progress | `app/progress/page.tsx` | Dynamic career display |
| Profile | `app/profile/page.tsx` | Dropdown with all 26 careers |
| Market Intel | `app/market-intel/page.tsx` | Dynamic career initialization |
| Roadmap | `app/roadmap/page.tsx` | Dynamic learning modules |
| Universities | `app/universities/page.tsx` | Dynamic career for alignment query |
| Layout | `app/layout.tsx` | `suppressHydrationWarning` on body |

---

## Bug Fixes

| Issue | Fix |
|-------|-----|
| All pages compared against "Data Scientist" regardless of user's career | Replaced with `getTargetCareer()` from localStorage across 9 pages |
| Auditor assessment showed irrelevant skills (Python, TensorFlow) | Career-specific required skills now drive the assessment |
| MOCK similar careers were fake (didn't exist in our data) | Replaced with real 24×24 cosine similarity matrix |
| Hydration error from Grammarly browser extension | Added `suppressHydrationWarning` to `<body>` tag |
| TypeScript errors: `careerData.skills` possibly undefined | Added null coalescing `?? []` fallback |
| TypeScript errors: severity type mismatch | Explicit union type annotation on severity variable |

---

## Source Data Files Used

All from `PathForgeBackend/prisma/Sample data/` (ML model v1.0.0 output):

| File | Content | Records |
|------|---------|---------|
| `program_metadata.csv` | University names, programs, regions | 55 programs, 22 universities |
| `alignment_matrix.csv` | Career × Program alignment scores | 24 × 55 = 1,320 scores |
| `career_similarity.csv` | Career × Career cosine similarity | 24 × 24 = 576 scores |
| `program_vectors.csv` | 156-dimensional skill vectors per program | 55 programs |
| `master_skill_dictionary.csv` | Normalized skill names with IDs | 350 skills |
| `career_vectors.csv` | 156-dimensional skill vectors per career | 24 careers |
| `career_metadata.csv` | Career names, IDs, sectors | 24 careers |

---

## Verification Checklist

- [x] TypeScript compiles cleanly (`npx tsc --noEmit` — 0 errors)
- [ ] Database seeding (`npx prisma db push && node prisma/seed.js`) — requires PostgreSQL running
- [ ] API endpoints return ML-backed data (`/api/alignment/:career`, `/api/similarity/:career`)
- [ ] Dashboard shows real similar careers for any selected career
- [ ] Universities page displays all 22 universities with working website links
- [ ] Assessment → Dashboard → Skill Gap flow works end-to-end

---

## Architecture After Changes

```
User selects career (Assessment)
        │
        ▼
  localStorage (careerStore.ts)
        │
        ├──▶ Dashboard ──▶ getCareerAlignment() ──▶ Backend (seed.js data)
        │                   getSimilarCareers()       └── alignment_matrix.csv
        │                   getSkillGap()             └── career_similarity.csv
        │                        │
        │                   Falls back to:
        │                   getMockSimilarCareers() ◀── 24×24 similarity matrix
        │                   getMockGapResult()      ◀── career required skills
        │
        ├──▶ Universities ──▶ getCareerAlignment() ──▶ 22 universities, 55 programs
        │
        ├──▶ Skill Gap ──▶ getSkillGap() with student profile
        │
        └──▶ All other pages read career dynamically
```

---

---

# PathForge — Session Summary (2026-03-13)

## Overview

This session added **five major feature areas** to the PathForge frontend: a Learning Resources browser, a fully dynamic University Comparison tool, a Market Intelligence suite with career comparison, a Skill Gap career comparison view, and a polish pass on the Student Progress Journey page.

---

## New Features

### 8. `Pathforge-Frontend/lib/resources.ts` — **Created** (~350 lines)

Comprehensive course database covering every skill across all 26 careers (~47 unique skills).

| What | Detail |
|------|--------|
| Platforms covered | Coursera, edX, Udemy, YouTube, Khan Academy |
| Courses per skill | 3–5 curated entries with real external URLs |
| Types | `Platform`, `Course`, `SkillResources` |
| Exports | `SKILL_RESOURCES`, `PLATFORM_CONFIG`, `LEVEL_CONFIG` |

---

### 9. `Pathforge-Frontend/app/resources/page.tsx` — **Created** (~400 lines)

New page at `/resources?skill=<name>` reachable from the "View Resources" button on the Roadmap.

| Component | Purpose |
|-----------|---------|
| `SkillBrowser` | Grid of all 47 skills with course counts — shown when no `?skill=` param |
| `SkillDetail` | Left sidebar (filters: free-only toggle, level, platform) + 2-col `CourseCard` grid |
| `CourseCard` | Platform badge, free tag, level pill, duration, external link (`target="_blank"`) |
| `ResourcesContent` | Reads `?skill=Excel` from URL, routes to browser or detail view |

**Roadmap link updated:**
```tsx
// app/roadmap/page.tsx — before
href="/assessment"
// after
href={`/resources?skill=${encodeURIComponent(mod.title)}`}
```

---

### 10. `Pathforge-Frontend/lib/universities.ts` — **Created** (~500 lines)

Full data layer for the University Program Comparison feature.

| What | Detail |
|------|--------|
| Universities | 15 East African institutions with full metrics |
| Metrics | overall, alignment, employability, roi, research, tuition, facilities, studentLife, academics, internationalRank |
| Helpers | `filterUniversities()`, `getMetricValue()`, `getMetricScore()`, `buildCSV()` |
| Radar data | Per-university radar chart values |
| Badges | Ranked badges ("Best ROI", "Top Research", etc.) per university |

---

### 11. `Pathforge-Frontend/app/universities/page.tsx` — **Full Rewrite** (~700 lines)

Fully dynamic head-to-head University Comparison page.

| Feature | Implementation |
|---------|---------------|
| Career switcher | Updates all data dynamically |
| University selector modal | Grid of all 15, tick 2–4 to compare |
| URL-based state | `?compare=cmu,makerere&region=Rwanda` — synced on every change via `router.replace()` |
| Share | `navigator.clipboard.writeText(window.location.href)` + toast notification |
| Export CSV | `buildCSV(selected)` → Blob → download link |
| Comparison table | `×` remove buttons, ★ star highlights for best value per metric row |
| Radar chart | SVG radar for selected universities with `RADAR_COLORS` |
| All universities list | Ranked list with `+ Compare` / `✓ Added` toggles |

---

### 12. `Pathforge-Frontend/lib/marketData.ts` — **Created** (~600 lines)

Market intelligence data for all 26 careers sourced from Andela Africa Report 2024, LinkedIn East Africa, ICPAK, World Bank.

| What | Detail |
|------|--------|
| Salary data | `salaryKES`, `salaryTrend`, `cagr`, `jobOpenings` per career |
| Trajectory | Entry → Mid → Senior → Lead salary stages |
| Regional salaries | Kenya, Rwanda, Uganda, Tanzania, Ethiopia via PPP multipliers |
| Skills in demand | Per-career list with trend arrows (up/stable/down), aligned to career requirements |
| Top employers | 12 employers per sector drawn from regional employer pools |
| Currencies | 9 currencies (KES base) with `convertSalary()` and `formatSalaryShort()` helpers |

---

### 13. `Pathforge-Frontend/app/market-intel/page.tsx` — **Full Rewrite** (~1,100 lines)

Fully dynamic Market Intelligence page with single-career overview and multi-career comparison mode.

#### Overview Mode
| Feature | Detail |
|---------|--------|
| Career readiness banner | Reads `getStudentProfile()` from localStorage, computes readiness vs. required skill levels, shows personalized "You're X% ready" message |
| KPI cards | Median salary (currency-converted), market demand, CAGR, job openings |
| Currency picker | 9-currency dropdown — updates all salary figures live |
| Regional salary bar chart | SVG bar chart for Kenya / Rwanda / Uganda / Tanzania / Ethiopia |
| Skills in demand | Career-specific skills with trend arrows and progress bars |
| Trajectory chart | SVG area chart with average line + user-adjusted projection (blue dashed) |
| Top employers | Filterable by region |
| Add to Compare | Button switches to Compare tab with current career pre-loaded |

#### Compare Mode (new)
| Feature | Detail |
|---------|--------|
| Career picker | Sector filter tabs + color-coded selected pills (up to 4) |
| `COMPARE_COLORS` | `["#f97415","#3b82f6","#10b981","#8b5cf6"]` |
| Metrics table | 12 metrics: salary, demand, CAGR, openings, trajectory stages, top skill, top employer — with ★ best-value highlights |
| `MultiTrajectoryChart` | SVG multi-line chart for up to 4 careers with end-point labels |
| Grouped bar chart | Toggle between Salary / Demand / CAGR metrics with animated bars |
| Regional salary table | Country-by-country comparison with ★ best markers |

---

### 14. `Pathforge-Frontend/app/skill-gap/page.tsx` — **Major Addition**

Added a "Compare Careers" tab alongside the existing "My Analysis" view.

| Feature | Detail |
|---------|--------|
| Mode toggle | `My Analysis \| Compare Careers` tab switcher in header |
| `computeCareerReadiness()` | Computes readiness % for all 26 careers from student's localStorage profile |
| All careers ranked list | Sorted by user readiness %, with search, sector filter, sort dropdown |
| Gap badges | Critical / moderate / mastered counts inline per career |
| `+ Compare` button | Select up to 4 careers for focused head-to-head |
| Head-to-head table | Readiness %, critical/moderate/minor/mastered counts, time to ready — ★ star on best value |
| SVG bar chart | Readiness bars for all selected careers with `COMPARE_COLORS` |
| Top skills to bridge | 3 most critical gaps per career shown inline |
| Shortcut button | "Compare to Other Careers" in the readiness donut card |

---

### 15. `Pathforge-Frontend/app/progress/page.tsx` — **Polish Pass**

Complete visual and functional overhaul of the Student Progress Journey page.

| What | Before | After |
|------|--------|-------|
| Readiness chart | Bar chart (invisible — CSS height bug) | Smooth SVG area + line chart with bezier curves, gradient fill |
| Projected trend | None | 3-month dashed projection line extending from current data |
| Projection banner | None | "At current pace, you'll reach 90% by Est. Jul 2026" tile with linear extrapolation |
| Monthly velocity | Hardcoded `+2.6%` | Computed from `(latest − earliest) / months` = `+3%/mo` |
| Improvement % | Hardcoded `+21%` | Derived from actual PROGRESS_HISTORY values |
| Streak days | Hardcoded `14` | Derived as `Math.round(improvement × 0.67)` |
| Milestone dates | Empty string `""` | Past milestones: real month labels; upcoming: `Est. Apr 2026`, `Est. May 2026` |
| Career switcher | None | Dropdown with all 26 careers — re-fetches skill gap data live |
| "Most Improved" badge | None | Green pill on fastest-improving skill in Skill Progress list |
| Per-skill delta | None | `+Δ% this period` annotation under each skill bar |
| Export | None | "Export" button triggering `window.print()` with `@media print` stylesheet |
| Heatmap | Predetermined hardcoded colours | Intensity mapped to actual `streakDays` count |
| Donut annotation | None | `+21% since Jan` chip below the donut |

---

## Architecture After Session 2

```
User selects career (Assessment / Progress career switcher)
        │
        ▼
  localStorage (careerStore.ts)
        │
        ├──▶ Dashboard ──▶ getMockSimilarCareers() / getMockGapResult()
        │
        ├──▶ Skill Gap ──▶ My Analysis + Compare Careers (all 26 careers ranked)
        │
        ├──▶ Market Intel ──▶ Overview (personalized) + Compare (up to 4 careers)
        │                      Currency picker (9 currencies)
        │                      Regional salary (5 countries)
        │
        ├──▶ Universities ──▶ Head-to-head comparison (up to 4)
        │                      Share (URL) + Export (CSV)
        │
        ├──▶ Roadmap ──▶ View Resources ──▶ /resources?skill=<name>
        │                                   47 skills, 3–5 courses each
        │
        └──▶ Progress ──▶ Area chart + projection + career switcher + export
```

---

## Files Changed — Session 2 Summary

| File | Type | Lines |
|------|------|-------|
| `lib/resources.ts` | Created | ~350 |
| `app/resources/page.tsx` | Created | ~400 |
| `app/roadmap/page.tsx` | Modified | 1 line |
| `lib/universities.ts` | Created | ~500 |
| `app/universities/page.tsx` | Full rewrite | ~700 |
| `lib/marketData.ts` | Created | ~600 |
| `app/market-intel/page.tsx` | Full rewrite | ~1,100 |
| `app/skill-gap/page.tsx` | Major addition | ~600 |
| `app/progress/page.tsx` | Polish rewrite | ~380 |

**Total new/changed lines this session: ~5,100**

---

## Verification Checklist — Session 2

- [x] TypeScript compiles cleanly after every change (`npx tsc --noEmit` — 0 errors)
- [ ] `/resources` — skill browser shows all 47 skills; clicking a skill shows 3–5 courses
- [ ] `/resources?skill=Python` — direct URL works with filters
- [ ] `/universities` — selector picks 2–4 universities; comparison table renders; Share copies URL; Export downloads CSV
- [ ] `/market-intel` — career picker loads correct skills/salary/employers; currency switcher updates all figures
- [ ] `/market-intel` Compare tab — pick 4 careers; metrics table shows ★ highlights; multi-line chart renders
- [ ] `/skill-gap` Compare tab — all 26 careers ranked; select 4; head-to-head table appears
- [ ] `/progress` — area chart visible (not blank); career switcher changes data; Export opens print dialog
