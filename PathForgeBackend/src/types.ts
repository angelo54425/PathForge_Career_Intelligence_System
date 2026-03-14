// ─────────────────────────────────────────────────────────────────────────────
// PathForge — Shared TypeScript Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Career {
  career: string;
  sector: string;
}

export interface UniversityMatch {
  university: string;
  program: string;
  alignment_score: number;
  region?: string;
}

export interface SkillGap {
  skill: string;
  required: number;
  current: number;
  gap: number;
  severity: "critical" | "moderate" | "minor" | "none";
}

export interface GapAnalysisResult {
  career: string;
  overall_readiness: number;
  time_to_ready_months: number;
  skill_gaps: SkillGap[];
  top_skills_to_learn: string[];
}

export interface SimilarCareer {
  career: string;
  similarity: number;
  sector: string;
}

export interface StudentProfile {
  [skill: string]: number; // 0.0 – 1.0
}

