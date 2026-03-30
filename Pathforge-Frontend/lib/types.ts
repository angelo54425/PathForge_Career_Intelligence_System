// ─────────────────────────────────────────────────────────────────────────────
// PathForge — Shared TypeScript Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Career {
  career: string;
  sector: string;
  skills?: Array<{ skill: string; requiredLevel: number }>;
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
  readiness_label?: string;
}

export interface SimilarCareer {
  career: string;
  similarity: number;
  sector: string;
}

export interface StudentProfile {
  [skill: string]: number; // 0.0 – 1.0
}

export interface MarketData {
  career: string;
  median_salary_kes: number;
  demand_score: number;
  growth_cagr: number;
  top_employers: string[];
  skills_in_demand: { skill: string; percentage: number }[];
}

export interface LearningModule {
  id: string;
  title: string;
  duration_weeks: number;
  phase: "foundation" | "specialization" | "proficiency";
  status: "completed" | "in_progress" | "locked";
  is_critical?: boolean;
  dependencies?: string[];
}

export interface ProgressPoint {
  month: string;
  readiness: number;
}

export interface UserState {
  name: string;
  email: string;
  target_career: string;
  profile: StudentProfile;
  readiness_score: number;
}

// ── ML API Response Types ─────────────────────────────────────────────────────

export interface CareerRecommendation {
  career: string;
  readiness_score: number;
  critical_gaps: Array<{ skill: string; required: number; student: number }>;
  moderate_gaps: Array<{ skill: string; required: number; student: number }>;
  strengths: Array<{ skill: string; required: number; student: number }>;
  tips: string[];
  top_programs: Array<{ program: string; university: string; alignment_score: number; region: string }>;
}

export interface ReadinessTrajectory {
  current_readiness_percentage: number;
  trajectory: Array<{ month: number; projected_readiness: number }>;
  months_to_intermediate: number | null;
  months_to_advanced: number | null;
  months_to_expert: number | null;
}

export interface RoadmapSkill {
  skill: string;
  gap: number;
  priority: "HIGH" | "MEDIUM" | "LOW";
  start_month: number;
  end_month: number;
  duration_months: number;
  prerequisites: string[];
  cluster: string;
}

export interface RoadmapResponse {
  career: string;
  total_duration_months: number;
  total_skills_with_gaps: number;
  phases: {
    foundation: RoadmapSkill[];
    specialization: RoadmapSkill[];
    proficiency: RoadmapSkill[];
  };
  skill_clusters: {
    technical_core: string[];
    tools_platforms: string[];
    soft_skills: string[];
    domain_knowledge: string[];
  };
  critical_path: Array<{ skill: string; prerequisites: string[] }>;
}

export interface ProgressResponse {
  snapshot_count: number;
  trend: "improving" | "stable" | "declining" | "insufficient_data";
  snapshots: Array<{ timestamp: string; readiness_score: number; skills: StudentProfile }>;
}

export interface AssessmentSubmitResponse {
  student_id: string;
  career: string;
  updated_skills: StudentProfile;
  gap_analysis: GapAnalysisResult;
  snapshot_saved: boolean;
}

export interface MarketIntelResponse {
  career: string;
  region: string;
  avg_salary_monthly: number;
  salary_range: { min: number; median: number; max: number };
  open_positions: number;
  demand_score: number;
  growth_trend: string;
  top_employers: string[];
  regional_comparison: Record<string, { demand_score: number; open_positions: number }>;
}

export interface ProgramCompareResponse {
  programs: Array<{
    program_university: string;
    program_name: string;
    university: string;
    region: string;
    scores: Record<string, number>;
    overall_score: number;
  }>;
}

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
