// ─────────────────────────────────────────────────────────────────────────────
// PathForge — API Service Layer
// All endpoints connect to the Flask API at NEXT_PUBLIC_API_BASE_URL.
// Falls back to mock data if the API is unreachable (development mode).
// ─────────────────────────────────────────────────────────────────────────────

import type {
  Career,
  UniversityMatch,
  GapAnalysisResult,
  SkillGap,
  SimilarCareer,
  StudentProfile,
  CareerRecommendation,
  ReadinessTrajectory,
  RoadmapResponse,
  ProgressResponse,
  AssessmentSubmitResponse,
  MarketIntelResponse,
  ProgramCompareResponse,
  WeightedSkill,
  SkillEntry,
  SkillAffinityDelta,
  CareerCompatibility,
} from "./types";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options?.headers as Record<string, string>) || {}),
  };
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

// ── GET /careers ──────────────────────────────────────────────────────────────
export async function getCareers(): Promise<Career[]> {
  const res = await apiFetch<{ careers?: Array<{ career_name: string; sector: string }> } | Career[]>("/careers");
  // Flask wraps in { status, careers: [{ career_name, sector, ... }] } — unwrap + remap
  if (Array.isArray(res)) return res;
  return ((res as { careers?: Array<{ career_name: string; sector: string }> }).careers ?? []).map((c) => ({
    career: c.career_name,
    sector: c.sector,
  }));
}

// ── GET /careers/sector/:sector ───────────────────────────────────────────────
export async function getCareersBySector(sector: string): Promise<Career[]> {
  const res = await apiFetch<{ sector?: string; careers?: Array<{ career_name: string }> } | Career[]>(
    `/careers/sector/${encodeURIComponent(sector)}`
  );
  // Flask wraps in { sector, careers: [{ career_name }] } with no skills — unwrap + merge MOCK skills
  if (Array.isArray(res)) return res;
  const resolvedSector = (res as { sector?: string }).sector ?? sector;
  return ((res as { careers?: Array<{ career_name: string }> }).careers ?? []).map((c) => ({
    career: c.career_name,
    sector: resolvedSector,
    skills: MOCK.careers.find((m) => m.career === c.career_name)?.skills,
  }));
}

// ── GET /api/alignment/:career ────────────────────────────────────────────────
export async function getCareerAlignment(
  career: string,
  options?: { region?: string; top_n?: number }
): Promise<UniversityMatch[]> {
  const params = new URLSearchParams();
  if (options?.region) params.set("region", options.region);
  if (options?.top_n) params.set("top_n", String(options.top_n));
  const qs = params.toString() ? `?${params}` : "";
  const res = await apiFetch<{ results?: UniversityMatch[] } | UniversityMatch[]>(
    `/api/alignment/${encodeURIComponent(career)}${qs}`
  );
  // Flask wraps results in { status, results: [...] } — unwrap if needed
  if (Array.isArray(res)) return res;
  return (res as { results?: UniversityMatch[] }).results ?? [];
}

// ── POST /api/gap ─────────────────────────────────────────────────────────────
// Flask returns { career, overall_readiness, top_gaps: [{skill, required_weight, student_proficiency, gap, status}], top_strengths: [...] }
export async function getSkillGap(
  career: string,
  studentProfile: StudentProfile
): Promise<GapAnalysisResult> {
  type FlaskGap = { skill: string; required_weight: number; student_proficiency: number; gap: number };
  type FlaskRes = { career?: string; overall_readiness?: number; readiness_label?: string; top_gaps?: FlaskGap[]; top_strengths?: FlaskGap[] };
  const res = await apiFetch<FlaskRes | GapAnalysisResult>("/api/gap", {
    method: "POST",
    body: JSON.stringify({ career, student_profile: studentProfile }),
  });
  if ("skill_gaps" in res) return res as GapAnalysisResult;
  const r = res as FlaskRes;
  const allGaps: FlaskGap[] = [...(r.top_gaps ?? []), ...(r.top_strengths ?? [])];
  const skill_gaps: SkillGap[] = allGaps.map((g) => ({
    skill: g.skill,
    required: g.required_weight,
    current: g.student_proficiency,
    gap: g.gap,
    severity: g.gap > 0.4 ? "critical" : g.gap > 0.2 ? "moderate" : g.gap > 0.05 ? "minor" : "none",
  }));
  const readiness = r.overall_readiness ?? 0;
  return {
    career: r.career ?? career,
    overall_readiness: readiness,
    readiness_label: r.readiness_label,
    time_to_ready_months: Math.max(3, Math.ceil((1 - readiness) * 18)),
    skill_gaps,
    top_skills_to_learn: (r.top_gaps ?? []).map((g) => g.skill),
  };
}

// ── GET /api/similarity/:career ───────────────────────────────────────────────
export async function getSimilarCareers(
  career: string,
  top_n = 5
): Promise<SimilarCareer[]> {
  const res = await apiFetch<
    | { similar_careers?: Array<{ similar_career: string; similarity_score: number; sector: string }> }
    | SimilarCareer[]
  >(`/api/similarity/${encodeURIComponent(career)}?top_n=${top_n}`);
  // Flask wraps results in { status, similar_careers: [...] } with different field names — unwrap + remap
  if (Array.isArray(res)) return res;
  const items = (res as { similar_careers?: Array<{ similar_career: string; similarity_score: number; sector: string }> }).similar_careers ?? [];
  return items.map((c) => ({
    career: c.similar_career,
    similarity: c.similarity_score,
    sector: c.sector,
  }));
}

// ── POST /api/recommend ───────────────────────────────────────────────────────
// Flask returns { status, top_careers: [...] }
export async function getCareerRecommendations(
  studentProfile: StudentProfile,
  options?: { top_n?: number; region?: string }
): Promise<CareerRecommendation[]> {
  const res = await apiFetch<{ top_careers?: CareerRecommendation[] } | CareerRecommendation[]>("/api/recommend", {
    method: "POST",
    body: JSON.stringify({
      student_profile: studentProfile,
      top_n: options?.top_n ?? 3,
      region: options?.region,
    }),
  });
  if (Array.isArray(res)) return res;
  return (res as { top_careers?: CareerRecommendation[] }).top_careers ?? [];
}

// ── Student Profile Management ────────────────────────────────────────────────
export async function saveStudentProfile(
  studentId: string,
  data: { name?: string; email?: string; skills: StudentProfile; region?: string; target_careers?: string[] }
): Promise<void> {
  await apiFetch(`/api/students/${encodeURIComponent(studentId)}/profile`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getStudentGaps(
  studentId: string,
  career: string
): Promise<GapAnalysisResult> {
  return apiFetch<GapAnalysisResult>(
    `/api/students/${encodeURIComponent(studentId)}/gaps/${encodeURIComponent(career)}`
  );
}

// ── GET /api/students/:id/readiness/:career ───────────────────────────────────
export async function getStudentReadiness(
  studentId: string,
  career: string,
  velocity?: number
): Promise<ReadinessTrajectory> {
  const params = velocity ? `?velocity=${velocity}` : "";
  return apiFetch<ReadinessTrajectory>(
    `/api/students/${encodeURIComponent(studentId)}/readiness/${encodeURIComponent(career)}${params}`
  );
}

// ── GET /api/students/:id/roadmap/:career ─────────────────────────────────────
export async function getStudentRoadmap(
  studentId: string,
  career: string
): Promise<RoadmapResponse> {
  return apiFetch<RoadmapResponse>(
    `/api/students/${encodeURIComponent(studentId)}/roadmap/${encodeURIComponent(career)}`
  );
}

// ── GET /api/students/:id/progress/:career ────────────────────────────────────
export async function getStudentProgress(
  studentId: string,
  career: string
): Promise<ProgressResponse> {
  return apiFetch<ProgressResponse>(
    `/api/students/${encodeURIComponent(studentId)}/progress/${encodeURIComponent(career)}`
  );
}

// ── POST /api/assessments/:id/submit ──────────────────────────────────────────
// Flask returns { status, assessment_id, student_id, career, gap_analysis: { overall_readiness, top_gaps, ... }, snapshot_saved }
export async function submitAssessment(
  assessmentId: string,
  data: { student_id: string; career: string; skill_scores: StudentProfile }
): Promise<AssessmentSubmitResponse> {
  type FlaskGap = { skill: string; required_weight: number; student_proficiency: number; gap: number };
  type FlaskRes = { student_id?: string; career?: string; snapshot_saved?: boolean; gap_analysis?: { overall_readiness?: number; readiness_label?: string; top_gaps?: FlaskGap[]; top_strengths?: FlaskGap[] } };
  const res = await apiFetch<FlaskRes>(
    `/api/assessments/${encodeURIComponent(assessmentId)}/submit`,
    { method: "POST", body: JSON.stringify(data) }
  );
  const ga = res.gap_analysis ?? {};
  const allGaps: FlaskGap[] = [...(ga.top_gaps ?? []), ...(ga.top_strengths ?? [])];
  const skill_gaps: SkillGap[] = allGaps.map((g) => ({
    skill: g.skill, required: g.required_weight, current: g.student_proficiency, gap: g.gap,
    severity: g.gap > 0.4 ? "critical" : g.gap > 0.2 ? "moderate" : g.gap > 0.05 ? "minor" : "none",
  }));
  const readiness = ga.overall_readiness ?? 0;
  return {
    student_id: res.student_id ?? data.student_id,
    career: res.career ?? data.career,
    updated_skills: data.skill_scores,
    snapshot_saved: res.snapshot_saved ?? false,
    gap_analysis: {
      career: res.career ?? data.career,
      overall_readiness: readiness,
      readiness_label: ga.readiness_label,
      time_to_ready_months: Math.max(3, Math.ceil((1 - readiness) * 18)),
      skill_gaps,
      top_skills_to_learn: (ga.top_gaps ?? []).map((g) => g.skill),
    },
  };
}

// ── GET /api/market-intelligence/:career ──────────────────────────────────────
export async function getMarketIntelligence(
  career: string,
  region?: string
): Promise<MarketIntelResponse> {
  const params = region ? `?region=${encodeURIComponent(region)}` : "";
  return apiFetch<MarketIntelResponse>(
    `/api/market-intelligence/${encodeURIComponent(career)}${params}`
  );
}

// ── GET /api/programs/compare ─────────────────────────────────────────────────
// Flask returns { status, career, dimensions, results: [...] } — TS expects { programs: [...] }
export async function comparePrograms(
  programs: string[],
  career: string,
  dimensions?: string[]
): Promise<ProgramCompareResponse> {
  const params = new URLSearchParams();
  params.set("programs", programs.join(","));
  params.set("career", career);
  if (dimensions) params.set("dimensions", dimensions.join(","));
  const res = await apiFetch<{ results?: ProgramCompareResponse["programs"] } | ProgramCompareResponse>(
    `/api/programs/compare?${params}`
  );
  if ("programs" in res) return res as ProgramCompareResponse;
  return { programs: (res as { results?: ProgramCompareResponse["programs"] }).results ?? [] };
}

// ── Sectors ───────────────────────────────────────────────────────────────────
export const SECTORS = ["IT", "Business & Finance", "Engineering"] as const;

// ── Career Similarity Matrix (from ML model — career_similarity.csv) ─────────
// 24 careers from the model. Software Engineer & Data Engineer use proxies.
const _SIM_NAMES = [
  "AI Engineer","Accountant","Actuary","Auditor","Biomedical Engineering",
  "Blockchain Developer","Business Analyst","Chemical Engineering",
  "Civil Engineering","Computer Engineering","Cybersecurity Engineer",
  "Data Analyst","Data Scientist","DevOps Engineer","Economist",
  "Electrical Engineering","Environmental Engineering","Financial Analyst",
  "Full Stack Developer","Industrial Engineering","Investment Banker",
  "Machine Learning Engineer","Mechanical Engineering","Risk Analyst",
];

const _SIM: number[][] = [
  [0,.220,.231,.224,.137,.658,.280,.132,.133,.132,.662,.651,.714,.659,.218,.147,.136,.299,.647,.130,.228,.771,.145,.253],
  [.220,0,.669,.697,.138,.222,.644,.132,.132,.133,.224,.263,.222,.216,.647,.147,.137,.645,.216,.190,.657,.221,.146,.687],
  [.231,.669,0,.661,.147,.233,.664,.140,.141,.142,.235,.275,.283,.226,.665,.157,.146,.664,.228,.139,.678,.232,.155,.709],
  [.224,.697,.661,0,.140,.226,.634,.134,.135,.135,.227,.259,.225,.218,.638,.150,.139,.638,.219,.132,.652,.224,.148,.682],
  [.137,.138,.147,.140,0,.129,.133,.635,.640,.634,.132,.131,.142,.136,.123,.641,.642,.143,.138,.623,.137,.142,.634,.156],
  [.658,.222,.233,.226,.129,0,.272,.124,.125,.125,.717,.646,.653,.655,.221,.139,.129,.290,.642,.122,.231,.649,.137,.254],
  [.280,.644,.664,.634,.133,.272,0,.128,.128,.128,.283,.374,.273,.264,.642,.142,.133,.764,.267,.125,.653,.271,.141,.681],
  [.132,.132,.140,.134,.635,.124,.128,0,.653,.648,.126,.126,.137,.131,.118,.655,.655,.137,.131,.637,.133,.137,.711,.151],
  [.133,.132,.141,.135,.640,.125,.128,.653,0,.651,.127,.126,.138,.131,.119,.659,.658,.138,.132,.640,.134,.138,.653,.152],
  [.132,.133,.142,.135,.634,.125,.128,.648,.651,0,.127,.127,.137,.132,.119,.710,.653,.138,.133,.636,.133,.137,.645,.151],
  [.662,.224,.235,.227,.132,.717,.283,.126,.127,.127,0,.652,.657,.662,.222,.141,.131,.300,.648,.125,.232,.654,.139,.254],
  [.651,.263,.275,.259,.131,.646,.374,.126,.126,.127,.652,0,.645,.652,.259,.141,.130,.385,.638,.124,.266,.647,.138,.287],
  [.714,.222,.283,.225,.142,.653,.273,.137,.138,.137,.657,.645,0,.657,.218,.152,.142,.289,.642,.134,.230,.877,.151,.252],
  [.659,.216,.226,.218,.136,.655,.264,.131,.131,.132,.662,.652,.657,0,.212,.146,.136,.280,.646,.128,.223,.655,.145,.245],
  [.218,.647,.665,.638,.123,.221,.642,.118,.119,.119,.222,.259,.218,.212,0,.132,.122,.692,.213,.116,.655,.217,.130,.685],
  [.147,.147,.157,.150,.641,.139,.142,.655,.659,.710,.141,.141,.152,.146,.132,0,.660,.153,.147,.645,.148,.152,.655,.168],
  [.136,.137,.146,.139,.642,.129,.133,.655,.658,.653,.131,.130,.142,.136,.122,.660,0,.142,.136,.641,.137,.142,.653,.155],
  [.299,.645,.664,.638,.143,.290,.764,.137,.138,.138,.300,.385,.289,.280,.692,.153,.142,0,.284,.134,.773,.289,.151,.687],
  [.647,.216,.228,.219,.138,.642,.267,.131,.132,.133,.648,.638,.642,.646,.213,.147,.136,.284,0,.131,.223,.639,.145,.245],
  [.130,.190,.139,.132,.623,.122,.125,.637,.640,.636,.125,.124,.134,.128,.116,.645,.641,.134,.131,0,.130,.133,.634,.148],
  [.228,.657,.678,.652,.137,.231,.653,.133,.134,.133,.232,.266,.230,.223,.655,.148,.137,.773,.223,.130,0,.229,.146,.698],
  [.771,.221,.232,.224,.142,.649,.271,.137,.138,.137,.654,.647,.877,.655,.217,.152,.142,.289,.639,.133,.229,0,.151,.252],
  [.145,.146,.155,.148,.634,.137,.141,.711,.653,.645,.139,.138,.151,.145,.130,.655,.653,.151,.145,.634,.146,.151,0,.165],
  [.253,.687,.709,.682,.156,.254,.681,.151,.152,.151,.254,.287,.252,.245,.685,.168,.155,.687,.245,.148,.698,.252,.165,0],
];

// Proxy map for careers not in the ML similarity matrix
const _SIM_PROXIES: Record<string, string> = {
  "Software Engineer": "Full Stack Developer",
  "Data Engineer": "Data Scientist",
};

export function getMockSimilarCareers(career: string, topN = 5): SimilarCareer[] {
  let lookupName = _SIM_PROXIES[career] || career;
  const idx = _SIM_NAMES.indexOf(lookupName);
  if (idx === -1) return [];
  const row = _SIM[idx];
  return _SIM_NAMES
    .map((name, i) => ({
      career: name,
      similarity: Math.round(row[i] * 1000) / 1000,
      sector: (MOCK.careers.find(c => c.career === name)?.sector || "IT").toLowerCase(),
    }))
    .filter(p => p.career !== lookupName && p.career !== career && p.similarity > 0.15)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topN);
}

// ── Dynamic mock gap result from career skills ───────────────────────────────
export function getMockGapResult(career: string): GapAnalysisResult {
  const careerData = MOCK.careers.find(c => c.career === career);
  if (!careerData) return MOCK.gapResult;

  const skills = careerData.skills ?? [];
  const skill_gaps: SkillGap[] = skills.map((s, i) => {
    const current = Math.max(0.1, s.requiredLevel - 0.15 - (i * 0.08));
    const gap = Math.round(Math.max(0, s.requiredLevel - current) * 100) / 100;
    const severity: "critical" | "moderate" | "minor" | "none" = gap > 0.4 ? "critical" : gap > 0.2 ? "moderate" : gap > 0.05 ? "minor" : "none";
    return { skill: s.skill, required: s.requiredLevel, current: Math.round(current * 100) / 100, gap, severity };
  });

  const avgReadiness = skill_gaps.reduce((sum, g) => sum + (g.current / g.required), 0) / skill_gaps.length;

  return {
    career,
    overall_readiness: Math.round(avgReadiness * 100) / 100,
    time_to_ready_months: Math.max(3, Math.ceil((1 - avgReadiness) * 18)),
    skill_gaps,
    top_skills_to_learn: skill_gaps
      .filter(g => g.severity === "critical" || g.severity === "moderate")
      .map(g => g.skill),
  };
}

// ── Mock data helpers (used when API is unavailable) ──────────────────────────
export const MOCK = {
  careers: [
    // IT
    { career: "Data Analyst", sector: "IT", skills: [
      { skill: "Python", requiredLevel: 0.8 }, { skill: "SQL", requiredLevel: 0.9 },
      { skill: "Statistics", requiredLevel: 0.8 }, { skill: "Data Visualization", requiredLevel: 0.85 },
      { skill: "Excel", requiredLevel: 0.8 },
    ]},
    { career: "Data Scientist", sector: "IT", skills: [
      { skill: "Python", requiredLevel: 0.9 }, { skill: "Machine Learning", requiredLevel: 0.95 },
      { skill: "Statistics", requiredLevel: 0.85 }, { skill: "SQL", requiredLevel: 0.85 },
      { skill: "Data Visualization", requiredLevel: 0.8 }, { skill: "Cloud Computing", requiredLevel: 0.75 },
    ]},
    { career: "Full Stack Developer", sector: "IT", skills: [
      { skill: "JavaScript", requiredLevel: 0.95 }, { skill: "Python", requiredLevel: 0.8 },
      { skill: "SQL", requiredLevel: 0.8 }, { skill: "Cloud Computing", requiredLevel: 0.7 },
      { skill: "Data Structures", requiredLevel: 0.85 }, { skill: "DevOps", requiredLevel: 0.7 },
    ]},
    { career: "Cybersecurity Engineer", sector: "IT", skills: [
      { skill: "Network Security", requiredLevel: 0.95 }, { skill: "Python", requiredLevel: 0.75 },
      { skill: "Cloud Security", requiredLevel: 0.85 }, { skill: "Cryptography", requiredLevel: 0.8 },
      { skill: "Operating Systems", requiredLevel: 0.85 },
    ]},
    { career: "Blockchain Developer", sector: "IT", skills: [
      { skill: "Solidity", requiredLevel: 0.9 }, { skill: "JavaScript", requiredLevel: 0.85 },
      { skill: "Cryptography", requiredLevel: 0.85 }, { skill: "Data Structures", requiredLevel: 0.8 },
      { skill: "Distributed Systems", requiredLevel: 0.85 },
    ]},
    { career: "DevOps Engineer", sector: "IT", skills: [
      { skill: "Cloud Computing", requiredLevel: 0.95 }, { skill: "DevOps", requiredLevel: 0.95 },
      { skill: "Python", requiredLevel: 0.8 }, { skill: "Linux", requiredLevel: 0.9 },
      { skill: "Networking", requiredLevel: 0.8 },
    ]},
    { career: "AI Engineer", sector: "IT", skills: [
      { skill: "Python", requiredLevel: 0.95 }, { skill: "Machine Learning", requiredLevel: 0.9 },
      { skill: "Deep Learning", requiredLevel: 0.95 }, { skill: "Cloud Computing", requiredLevel: 0.8 },
      { skill: "Mathematics", requiredLevel: 0.85 },
    ]},
    { career: "Machine Learning Engineer", sector: "IT", skills: [
      { skill: "Python", requiredLevel: 0.95 }, { skill: "Machine Learning", requiredLevel: 0.95 },
      { skill: "Deep Learning", requiredLevel: 0.9 }, { skill: "Statistics", requiredLevel: 0.85 },
      { skill: "Cloud Computing", requiredLevel: 0.8 },
    ]},
    { career: "Software Engineer", sector: "IT", skills: [
      { skill: "Python", requiredLevel: 0.8 }, { skill: "JavaScript", requiredLevel: 0.9 },
      { skill: "SQL", requiredLevel: 0.7 }, { skill: "Cloud Computing", requiredLevel: 0.7 },
      { skill: "Data Structures", requiredLevel: 0.9 },
    ]},
    { career: "Data Engineer", sector: "IT", skills: [
      { skill: "Python", requiredLevel: 0.85 }, { skill: "SQL", requiredLevel: 0.9 },
      { skill: "Data Pipelines", requiredLevel: 0.9 }, { skill: "Cloud Computing", requiredLevel: 0.85 },
      { skill: "Spark/Big Data", requiredLevel: 0.8 },
    ]},
    // Business & Finance
    { career: "Financial Analyst", sector: "Business & Finance", skills: [
      { skill: "Excel", requiredLevel: 0.9 }, { skill: "Statistics", requiredLevel: 0.8 },
      { skill: "SQL", requiredLevel: 0.6 }, { skill: "Data Visualization", requiredLevel: 0.7 },
      { skill: "Financial Modeling", requiredLevel: 0.9 },
    ]},
    { career: "Investment Banker", sector: "Business & Finance", skills: [
      { skill: "Financial Modeling", requiredLevel: 0.95 }, { skill: "Excel", requiredLevel: 0.9 },
      { skill: "Statistics", requiredLevel: 0.75 }, { skill: "Data Visualization", requiredLevel: 0.7 },
      { skill: "Accounting", requiredLevel: 0.8 },
    ]},
    { career: "Accountant", sector: "Business & Finance", skills: [
      { skill: "Accounting", requiredLevel: 0.95 }, { skill: "Excel", requiredLevel: 0.9 },
      { skill: "Tax Law", requiredLevel: 0.85 }, { skill: "Financial Reporting", requiredLevel: 0.9 },
      { skill: "SQL", requiredLevel: 0.5 },
    ]},
    { career: "Auditor", sector: "Business & Finance", skills: [
      { skill: "Accounting", requiredLevel: 0.9 }, { skill: "Financial Reporting", requiredLevel: 0.9 },
      { skill: "Excel", requiredLevel: 0.85 }, { skill: "Risk Management", requiredLevel: 0.8 },
      { skill: "Compliance", requiredLevel: 0.85 },
    ]},
    { career: "Business Analyst", sector: "Business & Finance", skills: [
      { skill: "SQL", requiredLevel: 0.8 }, { skill: "Data Visualization", requiredLevel: 0.8 },
      { skill: "Excel", requiredLevel: 0.8 }, { skill: "Statistics", requiredLevel: 0.7 },
      { skill: "Requirements Analysis", requiredLevel: 0.85 },
    ]},
    { career: "Risk Analyst", sector: "Business & Finance", skills: [
      { skill: "Risk Management", requiredLevel: 0.95 }, { skill: "Statistics", requiredLevel: 0.85 },
      { skill: "Excel", requiredLevel: 0.85 }, { skill: "Financial Modeling", requiredLevel: 0.8 },
      { skill: "SQL", requiredLevel: 0.7 },
    ]},
    { career: "Actuary", sector: "Business & Finance", skills: [
      { skill: "Mathematics", requiredLevel: 0.95 }, { skill: "Statistics", requiredLevel: 0.95 },
      { skill: "Excel", requiredLevel: 0.85 }, { skill: "Risk Management", requiredLevel: 0.9 },
      { skill: "Financial Modeling", requiredLevel: 0.85 },
    ]},
    { career: "Economist", sector: "Business & Finance", skills: [
      { skill: "Statistics", requiredLevel: 0.9 }, { skill: "Mathematics", requiredLevel: 0.85 },
      { skill: "Data Visualization", requiredLevel: 0.75 }, { skill: "Excel", requiredLevel: 0.8 },
      { skill: "Python", requiredLevel: 0.7 },
    ]},
    // Engineering
    { career: "Civil Engineering", sector: "Engineering", skills: [
      { skill: "CAD", requiredLevel: 0.9 }, { skill: "Structural Analysis", requiredLevel: 0.95 },
      { skill: "Mathematics", requiredLevel: 0.85 }, { skill: "Project Management", requiredLevel: 0.8 },
      { skill: "Geotechnics", requiredLevel: 0.8 },
    ]},
    { career: "Mechanical Engineering", sector: "Engineering", skills: [
      { skill: "CAD", requiredLevel: 0.9 }, { skill: "Thermodynamics", requiredLevel: 0.85 },
      { skill: "Materials Science", requiredLevel: 0.8 }, { skill: "Mathematics", requiredLevel: 0.85 },
      { skill: "Fluid Mechanics", requiredLevel: 0.8 },
    ]},
    { career: "Electrical Engineering", sector: "Engineering", skills: [
      { skill: "Circuit Design", requiredLevel: 0.95 }, { skill: "Mathematics", requiredLevel: 0.9 },
      { skill: "Signal Processing", requiredLevel: 0.85 }, { skill: "CAD", requiredLevel: 0.8 },
      { skill: "Embedded Systems", requiredLevel: 0.8 },
    ]},
    { career: "Computer Engineering", sector: "Engineering", skills: [
      { skill: "Embedded Systems", requiredLevel: 0.9 }, { skill: "Python", requiredLevel: 0.8 },
      { skill: "Circuit Design", requiredLevel: 0.8 }, { skill: "Data Structures", requiredLevel: 0.85 },
      { skill: "Operating Systems", requiredLevel: 0.85 },
    ]},
    { career: "Chemical Engineering", sector: "Engineering", skills: [
      { skill: "Chemistry", requiredLevel: 0.95 }, { skill: "Thermodynamics", requiredLevel: 0.9 },
      { skill: "Mathematics", requiredLevel: 0.85 }, { skill: "Process Engineering", requiredLevel: 0.9 },
      { skill: "Fluid Mechanics", requiredLevel: 0.8 },
    ]},
    { career: "Industrial Engineering", sector: "Engineering", skills: [
      { skill: "Operations Research", requiredLevel: 0.9 }, { skill: "Statistics", requiredLevel: 0.85 },
      { skill: "Project Management", requiredLevel: 0.85 }, { skill: "Mathematics", requiredLevel: 0.8 },
      { skill: "Supply Chain Management", requiredLevel: 0.85 },
    ]},
    { career: "Environmental Engineering", sector: "Engineering", skills: [
      { skill: "Environmental Science", requiredLevel: 0.95 }, { skill: "Chemistry", requiredLevel: 0.8 },
      { skill: "CAD", requiredLevel: 0.75 }, { skill: "Mathematics", requiredLevel: 0.8 },
      { skill: "Hydrology", requiredLevel: 0.85 },
    ]},
    { career: "Biomedical Engineering", sector: "Engineering", skills: [
      { skill: "Biology", requiredLevel: 0.9 }, { skill: "CAD", requiredLevel: 0.8 },
      { skill: "Mathematics", requiredLevel: 0.85 }, { skill: "Signal Processing", requiredLevel: 0.8 },
      { skill: "Materials Science", requiredLevel: 0.8 },
    ]},
  ] as Career[],

  gapResult: {
    career: "Data Scientist",
    overall_readiness: 0.68,
    time_to_ready_months: 9,
    skill_gaps: [
      { skill: "Machine Learning", required: 0.95, current: 0.35, gap: 0.60, severity: "critical" },
      { skill: "Cloud Computing", required: 0.75, current: 0.20, gap: 0.55, severity: "critical" },
      { skill: "Data Visualization", required: 0.80, current: 0.60, gap: 0.20, severity: "moderate" },
      { skill: "SQL", required: 0.85, current: 0.70, gap: 0.15, severity: "minor" },
      { skill: "Python", required: 0.90, current: 0.80, gap: 0.10, severity: "minor" },
      { skill: "Statistics", required: 0.85, current: 0.75, gap: 0.10, severity: "minor" },
    ],
    top_skills_to_learn: ["Machine Learning", "Cloud Computing", "Data Visualization"],
  } as GapAnalysisResult,

  universityMatches: [
    { university: "Nelson Mandela African Institution of Science and Technology", program: "BSc Artificial Intelligence", alignment_score: 0.89, region: "Tanzania" },
    { university: "Carnegie Mellon University Rwanda", program: "BSc Data Science", alignment_score: 0.88, region: "Rwanda" },
    { university: "Makerere University", program: "BSc Business Analytics", alignment_score: 0.88, region: "Uganda" },
    { university: "Carnegie Mellon University Rwanda", program: "BSc Artificial Intelligence", alignment_score: 0.88, region: "Rwanda" },
    { university: "African Leadership University", program: "BSc Business Analytics", alignment_score: 0.86, region: "Rwanda" },
  ] as UniversityMatch[],

  similarCareers: [
    { career: "Machine Learning Engineer", similarity: 0.877, sector: "it" },
    { career: "AI Engineer", similarity: 0.714, sector: "it" },
    { career: "Cybersecurity Engineer", similarity: 0.657, sector: "it" },
    { career: "DevOps Engineer", similarity: 0.657, sector: "it" },
    { career: "Blockchain Developer", similarity: 0.653, sector: "it" },
  ] as SimilarCareer[],
};

// ── Expanded Skills Assessment API ───────────────────────────────────────────

/**
 * Fetch ALL non-zero weighted skills for a career, ranked by weight descending.
 * Every skill returned is mandatory — the user must rate all of them.
 */
export async function getCareerSkills(
  career: string
): Promise<{ career: string; mandatory_skills: WeightedSkill[] }> {
  return apiFetch(`/api/careers/${encodeURIComponent(career)}/skills`);
}

/**
 * Search the master skills list. Returns up to 20 matches.
 */
export async function searchSkills(query: string): Promise<SkillEntry[]> {
  const params = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : "";
  const res = await apiFetch<{ skills: SkillEntry[] }>(`/api/skills${params}`);
  return res.skills ?? [];
}

/**
 * Return skills from the top 3 most similar careers that are NOT already
 * in the selected career's weighted skill set.
 */
export async function getSimilarCareerSkills(
  career: string
): Promise<WeightedSkill[]> {
  const res = await apiFetch<{ similar_skills: WeightedSkill[] }>(
    `/api/careers/${encodeURIComponent(career)}/similar-skills`
  );
  return res.similar_skills ?? [];
}

/**
 * Given a newly rated extra skill, return readiness delta per career.
 * Used to show the inline ↑/↓ affinity chips on extra skill cards.
 */
export async function getSkillAffinityDelta(
  skill: string,
  rating: number,
  currentProfile: StudentProfile
): Promise<SkillAffinityDelta[]> {
  const res = await apiFetch<{ deltas: SkillAffinityDelta[] }>(
    "/api/skills/affinity-delta",
    {
      method: "POST",
      body: JSON.stringify({
        skill,
        rating,
        current_profile: currentProfile,
      }),
    }
  );
  return res.deltas ?? [];
}

/**
 * Given a full student profile, return all careers with compatibility >= 30%,
 * sorted by readiness score descending.
 * Called post-submission to populate the alternative careers section.
 */
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
