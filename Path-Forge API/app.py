"""
PathForge Career Intelligence System — Flask API v2.0
=====================================================
Loads pre-computed model artifacts produced by the notebook and
exposes analytical capabilities as REST endpoints.

Artifacts loaded from ../model_artifacts/:
  career_vectors.csv      — career × skill weight matrix  (Title Case index)
  program_vectors.csv     — program × skill coverage matrix (Title Case index)
  alignment_matrix.csv    — career × program alignment scores (pre-computed)
  career_similarity.csv   — career × career cosine similarity (pre-computed)
  career_metadata.csv     — career_id, career_sector per career
  program_metadata.csv    — program_id, program_name, university, region per program

Student profiles are persisted to students_db.json (auto-created on first write).

Endpoints:
  GET  /                                              → Health check
  GET  /careers                                       → List all available careers
  GET  /careers/sector/<sector>                       → Careers by sector
  GET  /api/alignment/<career>                        → Top university programs for a career
  POST /api/gap                                       → Skill gap for a known target career
  GET  /api/similarity/<career>                       → Similar careers
  POST /api/recommend                                 → Career discovery from a raw skill profile
  GET  /api/students/<student_id>/profile             → Get student profile
  POST /api/students/<student_id>/profile             → Create or update student profile
  POST /api/students/<student_id>/update-skill        → Update single skill proficiency
  GET  /api/students/<student_id>/gaps/<career>       → Personalised gap analysis
  GET  /api/students/<student_id>/readiness/<career>  → Readiness + trajectory projection
  GET  /api/students/<student_id>/roadmap/<career>    → Learning roadmap
  GET  /api/students/<student_id>/progress/<career>   → Progress history & trend
  GET  /api/programs/compare                          → Multi-dimensional program comparison
  GET  /api/market-intelligence/<career>              → Job market data
  POST /api/assessments/<assessment_id>/submit        → Submit assessment results
"""

from flask import Flask, request, jsonify, render_template_string
import pandas as pd
import numpy as np
import os
import json
import math
from datetime import datetime
from collections import deque, defaultdict

app = Flask(__name__)

# ── PATHS ─────────────────────────────────────────────────────────────────────

BASE_DIR      = os.path.dirname(os.path.abspath(__file__))
ARTIFACTS_DIR = os.path.normpath(os.path.join(BASE_DIR, "..", "model_artifacts"))
STUDENTS_DB_PATH = os.path.join(BASE_DIR, "students_db.json")


# ── STUDENT PERSISTENCE ───────────────────────────────────────────────────────

def load_students() -> dict:
    """Load the student JSON file. Returns empty dict if file does not exist."""
    if not os.path.exists(STUDENTS_DB_PATH):
        return {}
    with open(STUDENTS_DB_PATH, "r") as f:
        return json.load(f)


def save_students(db: dict) -> None:
    """Persist the student dict to disk."""
    with open(STUDENTS_DB_PATH, "w") as f:
        json.dump(db, f, indent=2)


# ── DATA LOADING ──────────────────────────────────────────────────────────────

def load_data():
    """Load all pre-computed model artifacts saved by the notebook."""
    print(f"Loading PathForge model artifacts from: {ARTIFACTS_DIR}")

    career_vector  = pd.read_csv(
        os.path.join(ARTIFACTS_DIR, "career_vectors.csv"),
        index_col="career_name"
    )
    program_vector = pd.read_csv(
        os.path.join(ARTIFACTS_DIR, "program_vectors.csv"),
        index_col="program_university"
    )
    alignment_mat  = pd.read_csv(
        os.path.join(ARTIFACTS_DIR, "alignment_matrix.csv"),
        index_col="career_name"
    )
    # career_similarity.csv has an unnamed first column (the row index)
    career_sim     = pd.read_csv(
        os.path.join(ARTIFACTS_DIR, "career_similarity.csv"),
        index_col=0
    )
    career_meta    = pd.read_csv(
        os.path.join(ARTIFACTS_DIR, "career_metadata.csv"),
        index_col="career_name"
    )
    program_meta   = pd.read_csv(
        os.path.join(ARTIFACTS_DIR, "program_metadata.csv"),
        index_col="program_university"
    )

    print(
        f"✓ Loaded {len(career_vector)} careers, "
        f"{len(program_vector)} programs, "
        f"{career_vector.shape[1]} skills"
    )
    return career_vector, career_meta, program_vector, program_meta, career_sim, alignment_mat


# Load once at startup
(
    career_vector_matrix,
    career_metadata,
    program_vector_matrix,
    program_metadata,
    career_sim_df,
    alignment_matrix,
) = load_data()


# ── CASE-INSENSITIVE LOOKUP MAPS ──────────────────────────────────────────────
# Model artifacts use Title Case names (e.g. "Data Scientist", "AI Engineer").
# API accepts lowercase user input and resolves it to the canonical name.

career_name_map = {name.lower(): name for name in career_vector_matrix.index}
sector_name_map = {
    s.lower(): s for s in career_metadata["career_sector"].unique()
}


# ── MARKET INTELLIGENCE DATABASE ──────────────────────────────────────────────
# Hardcoded market data for East African job markets (prototype data).
# Salary in KES/month. Growth trend derived deterministically from demand_score.

MARKET_INTELLIGENCE_DB = {
    "Data Scientist": {
        "Kenya":    {"avg_salary_monthly": 240000, "open_positions": 1420, "demand_score": 92},
        "Rwanda":   {"avg_salary_monthly": 180000, "open_positions": 340,  "demand_score": 85},
        "Uganda":   {"avg_salary_monthly": 150000, "open_positions": 280,  "demand_score": 78},
        "Tanzania": {"avg_salary_monthly": 160000, "open_positions": 310,  "demand_score": 80},
    },
    "Software Engineer": {
        "Kenya":    {"avg_salary_monthly": 220000, "open_positions": 2340, "demand_score": 95},
        "Rwanda":   {"avg_salary_monthly": 170000, "open_positions": 580,  "demand_score": 88},
        "Uganda":   {"avg_salary_monthly": 140000, "open_positions": 420,  "demand_score": 82},
        "Tanzania": {"avg_salary_monthly": 155000, "open_positions": 490,  "demand_score": 84},
    },
    "Data Analyst": {
        "Kenya":    {"avg_salary_monthly": 180000, "open_positions": 980,  "demand_score": 87},
        "Rwanda":   {"avg_salary_monthly": 140000, "open_positions": 210,  "demand_score": 79},
        "Uganda":   {"avg_salary_monthly": 120000, "open_positions": 170,  "demand_score": 75},
        "Tanzania": {"avg_salary_monthly": 130000, "open_positions": 195,  "demand_score": 77},
    },
    "Machine Learning Engineer": {
        "Kenya":    {"avg_salary_monthly": 260000, "open_positions": 890,  "demand_score": 91},
        "Rwanda":   {"avg_salary_monthly": 195000, "open_positions": 180,  "demand_score": 83},
        "Uganda":   {"avg_salary_monthly": 165000, "open_positions": 140,  "demand_score": 76},
        "Tanzania": {"avg_salary_monthly": 175000, "open_positions": 160,  "demand_score": 79},
    },
    "AI Engineer": {
        "Kenya":    {"avg_salary_monthly": 270000, "open_positions": 650,  "demand_score": 90},
        "Rwanda":   {"avg_salary_monthly": 200000, "open_positions": 140,  "demand_score": 82},
        "Uganda":   {"avg_salary_monthly": 170000, "open_positions": 110,  "demand_score": 74},
        "Tanzania": {"avg_salary_monthly": 180000, "open_positions": 130,  "demand_score": 76},
    },
    "Cybersecurity Analyst": {
        "Kenya":    {"avg_salary_monthly": 230000, "open_positions": 740,  "demand_score": 89},
        "Rwanda":   {"avg_salary_monthly": 175000, "open_positions": 160,  "demand_score": 81},
        "Uganda":   {"avg_salary_monthly": 150000, "open_positions": 130,  "demand_score": 76},
        "Tanzania": {"avg_salary_monthly": 160000, "open_positions": 145,  "demand_score": 78},
    },
    "Cloud Architect": {
        "Kenya":    {"avg_salary_monthly": 280000, "open_positions": 420,  "demand_score": 88},
        "Rwanda":   {"avg_salary_monthly": 210000, "open_positions": 90,   "demand_score": 80},
        "Uganda":   {"avg_salary_monthly": 175000, "open_positions": 70,   "demand_score": 73},
        "Tanzania": {"avg_salary_monthly": 185000, "open_positions": 80,   "demand_score": 75},
    },
    "DevOps Engineer": {
        "Kenya":    {"avg_salary_monthly": 240000, "open_positions": 560,  "demand_score": 87},
        "Rwanda":   {"avg_salary_monthly": 180000, "open_positions": 120,  "demand_score": 79},
        "Uganda":   {"avg_salary_monthly": 155000, "open_positions": 95,   "demand_score": 74},
        "Tanzania": {"avg_salary_monthly": 165000, "open_positions": 108,  "demand_score": 76},
    },
    "Business Analyst": {
        "Kenya":    {"avg_salary_monthly": 190000, "open_positions": 860,  "demand_score": 82},
        "Rwanda":   {"avg_salary_monthly": 145000, "open_positions": 195,  "demand_score": 74},
        "Uganda":   {"avg_salary_monthly": 125000, "open_positions": 160,  "demand_score": 70},
        "Tanzania": {"avg_salary_monthly": 135000, "open_positions": 175,  "demand_score": 72},
    },
    "Financial Analyst": {
        "Kenya":    {"avg_salary_monthly": 200000, "open_positions": 640,  "demand_score": 80},
        "Rwanda":   {"avg_salary_monthly": 155000, "open_positions": 145,  "demand_score": 73},
        "Uganda":   {"avg_salary_monthly": 135000, "open_positions": 120,  "demand_score": 69},
        "Tanzania": {"avg_salary_monthly": 145000, "open_positions": 135,  "demand_score": 71},
    },
    "Accountant": {
        "Kenya":    {"avg_salary_monthly": 160000, "open_positions": 1200, "demand_score": 78},
        "Rwanda":   {"avg_salary_monthly": 120000, "open_positions": 280,  "demand_score": 71},
        "Uganda":   {"avg_salary_monthly": 105000, "open_positions": 240,  "demand_score": 68},
        "Tanzania": {"avg_salary_monthly": 115000, "open_positions": 260,  "demand_score": 70},
    },
    "Investment Analyst": {
        "Kenya":    {"avg_salary_monthly": 220000, "open_positions": 320,  "demand_score": 77},
        "Rwanda":   {"avg_salary_monthly": 165000, "open_positions": 75,   "demand_score": 70},
        "Uganda":   {"avg_salary_monthly": 145000, "open_positions": 60,   "demand_score": 65},
        "Tanzania": {"avg_salary_monthly": 155000, "open_positions": 68,   "demand_score": 67},
    },
    "Marketing Analyst": {
        "Kenya":    {"avg_salary_monthly": 170000, "open_positions": 540,  "demand_score": 75},
        "Rwanda":   {"avg_salary_monthly": 130000, "open_positions": 125,  "demand_score": 68},
        "Uganda":   {"avg_salary_monthly": 115000, "open_positions": 105,  "demand_score": 65},
        "Tanzania": {"avg_salary_monthly": 122000, "open_positions": 115,  "demand_score": 67},
    },
    "Project Manager": {
        "Kenya":    {"avg_salary_monthly": 210000, "open_positions": 720,  "demand_score": 83},
        "Rwanda":   {"avg_salary_monthly": 160000, "open_positions": 165,  "demand_score": 75},
        "Uganda":   {"avg_salary_monthly": 140000, "open_positions": 135,  "demand_score": 71},
        "Tanzania": {"avg_salary_monthly": 150000, "open_positions": 148,  "demand_score": 73},
    },
    "Supply Chain Manager": {
        "Kenya":    {"avg_salary_monthly": 195000, "open_positions": 480,  "demand_score": 78},
        "Rwanda":   {"avg_salary_monthly": 150000, "open_positions": 110,  "demand_score": 71},
        "Uganda":   {"avg_salary_monthly": 130000, "open_positions": 90,   "demand_score": 67},
        "Tanzania": {"avg_salary_monthly": 140000, "open_positions": 100,  "demand_score": 69},
    },
    "HR Manager": {
        "Kenya":    {"avg_salary_monthly": 175000, "open_positions": 580,  "demand_score": 73},
        "Rwanda":   {"avg_salary_monthly": 135000, "open_positions": 135,  "demand_score": 66},
        "Uganda":   {"avg_salary_monthly": 118000, "open_positions": 110,  "demand_score": 63},
        "Tanzania": {"avg_salary_monthly": 128000, "open_positions": 120,  "demand_score": 65},
    },
    "Civil Engineer": {
        "Kenya":    {"avg_salary_monthly": 190000, "open_positions": 560,  "demand_score": 72},
        "Rwanda":   {"avg_salary_monthly": 150000, "open_positions": 180,  "demand_score": 68},
        "Uganda":   {"avg_salary_monthly": 135000, "open_positions": 145,  "demand_score": 65},
        "Tanzania": {"avg_salary_monthly": 145000, "open_positions": 220,  "demand_score": 70},
    },
    "Mechanical Engineer": {
        "Kenya":    {"avg_salary_monthly": 185000, "open_positions": 420,  "demand_score": 70},
        "Rwanda":   {"avg_salary_monthly": 145000, "open_positions": 100,  "demand_score": 64},
        "Uganda":   {"avg_salary_monthly": 130000, "open_positions": 82,   "demand_score": 61},
        "Tanzania": {"avg_salary_monthly": 140000, "open_positions": 115,  "demand_score": 66},
    },
    "Electrical Engineer": {
        "Kenya":    {"avg_salary_monthly": 195000, "open_positions": 380,  "demand_score": 73},
        "Rwanda":   {"avg_salary_monthly": 152000, "open_positions": 90,   "demand_score": 66},
        "Uganda":   {"avg_salary_monthly": 136000, "open_positions": 74,   "demand_score": 63},
        "Tanzania": {"avg_salary_monthly": 146000, "open_positions": 100,  "demand_score": 68},
    },
    "Chemical Engineer": {
        "Kenya":    {"avg_salary_monthly": 200000, "open_positions": 220,  "demand_score": 67},
        "Rwanda":   {"avg_salary_monthly": 155000, "open_positions": 52,   "demand_score": 60},
        "Uganda":   {"avg_salary_monthly": 140000, "open_positions": 42,   "demand_score": 57},
        "Tanzania": {"avg_salary_monthly": 150000, "open_positions": 60,   "demand_score": 63},
    },
    "Environmental Engineer": {
        "Kenya":    {"avg_salary_monthly": 180000, "open_positions": 280,  "demand_score": 71},
        "Rwanda":   {"avg_salary_monthly": 140000, "open_positions": 65,   "demand_score": 64},
        "Uganda":   {"avg_salary_monthly": 125000, "open_positions": 53,   "demand_score": 61},
        "Tanzania": {"avg_salary_monthly": 135000, "open_positions": 75,   "demand_score": 66},
    },
    "Industrial Engineer": {
        "Kenya":    {"avg_salary_monthly": 188000, "open_positions": 260,  "demand_score": 69},
        "Rwanda":   {"avg_salary_monthly": 148000, "open_positions": 60,   "demand_score": 62},
        "Uganda":   {"avg_salary_monthly": 132000, "open_positions": 50,   "demand_score": 59},
        "Tanzania": {"avg_salary_monthly": 142000, "open_positions": 70,   "demand_score": 64},
    },
    "Network Engineer": {
        "Kenya":    {"avg_salary_monthly": 210000, "open_positions": 440,  "demand_score": 80},
        "Rwanda":   {"avg_salary_monthly": 162000, "open_positions": 100,  "demand_score": 73},
        "Uganda":   {"avg_salary_monthly": 143000, "open_positions": 82,   "demand_score": 70},
        "Tanzania": {"avg_salary_monthly": 153000, "open_positions": 92,   "demand_score": 72},
    },
    "Software QA Engineer": {
        "Kenya":    {"avg_salary_monthly": 200000, "open_positions": 350,  "demand_score": 79},
        "Rwanda":   {"avg_salary_monthly": 155000, "open_positions": 80,   "demand_score": 72},
        "Uganda":   {"avg_salary_monthly": 138000, "open_positions": 65,   "demand_score": 68},
        "Tanzania": {"avg_salary_monthly": 148000, "open_positions": 72,   "demand_score": 70},
    },
}

TOP_EMPLOYERS_DB = {
    "Data Scientist": ["Safaricom", "Equity Bank", "Andela", "Microsoft Africa", "MTN"],
    "Software Engineer": ["Safaricom", "Equity Bank", "Andela", "Microsoft Africa", "JUMO"],
    "Data Analyst": ["Safaricom", "KCB Bank", "Deloitte", "PwC", "KPMG"],
    "Machine Learning Engineer": ["Andela", "Microsoft Africa", "Safaricom", "Cellulant", "JUMO"],
    "AI Engineer": ["Microsoft Africa", "Google Kenya", "Andela", "Safaricom", "IBM"],
    "Cybersecurity Analyst": ["KCB Bank", "Equity Bank", "Safaricom", "Deloitte", "PwC"],
    "Cloud Architect": ["Microsoft Africa", "Amazon AWS", "Google Kenya", "Safaricom", "Andela"],
    "DevOps Engineer": ["Andela", "Safaricom", "JUMO", "Microsoft Africa", "Cellulant"],
    "Business Analyst": ["Deloitte", "PwC", "KPMG", "KCB Bank", "Equity Bank"],
    "Financial Analyst": ["KCB Bank", "Equity Bank", "Standard Chartered", "Deloitte", "PwC"],
    "Accountant": ["Deloitte", "PwC", "KPMG", "KCB Bank", "Equity Bank"],
    "Investment Analyst": ["NSE", "KCB Bank", "Equity Bank", "Standard Chartered", "Centum"],
    "Marketing Analyst": ["Safaricom", "KCB Bank", "Nation Media", "Unilever", "Procter & Gamble"],
    "Project Manager": ["Deloitte", "PwC", "Safaricom", "KCB Bank", "China Road & Bridge"],
    "Supply Chain Manager": ["Unilever", "Kenya Airways", "Port of Mombasa", "Bidco", "EABL"],
    "HR Manager": ["Safaricom", "KCB Bank", "Equity Bank", "Deloitte", "PwC"],
    "Civil Engineer": ["China Road & Bridge", "Vinci Construction", "Bechtel", "ARM Cement", "Bamburi"],
    "Mechanical Engineer": ["Toyota Kenya", "KenGen", "KPLC", "Bamburi Cement", "EABL"],
    "Electrical Engineer": ["KenGen", "KPLC", "Kenya Power", "Safaricom", "China Road & Bridge"],
    "Chemical Engineer": ["EABL", "Bamburi Cement", "ARM Cement", "Shell", "Total"],
    "Environmental Engineer": ["NEMA", "WWF Kenya", "World Bank", "Vinci", "UNEP"],
    "Industrial Engineer": ["EABL", "Unilever", "Kenya Airways", "KPLC", "Bidco"],
    "Network Engineer": ["Safaricom", "Airtel", "Telkom Kenya", "MTN", "KCB Bank"],
    "Software QA Engineer": ["Andela", "Safaricom", "JUMO", "Microsoft Africa", "Cellulant"],
}

# Sector-based defaults for any career not in the DB
_SECTOR_DEFAULTS = {
    "IT": {
        "Kenya":    {"avg_salary_monthly": 210000, "open_positions": 500, "demand_score": 83},
        "Rwanda":   {"avg_salary_monthly": 162000, "open_positions": 120, "demand_score": 76},
        "Uganda":   {"avg_salary_monthly": 143000, "open_positions": 95,  "demand_score": 72},
        "Tanzania": {"avg_salary_monthly": 153000, "open_positions": 108, "demand_score": 74},
    },
    "Business & Finance": {
        "Kenya":    {"avg_salary_monthly": 185000, "open_positions": 420, "demand_score": 76},
        "Rwanda":   {"avg_salary_monthly": 143000, "open_positions": 96,  "demand_score": 69},
        "Uganda":   {"avg_salary_monthly": 126000, "open_positions": 78,  "demand_score": 65},
        "Tanzania": {"avg_salary_monthly": 136000, "open_positions": 87,  "demand_score": 67},
    },
    "Engineering": {
        "Kenya":    {"avg_salary_monthly": 190000, "open_positions": 350, "demand_score": 71},
        "Rwanda":   {"avg_salary_monthly": 148000, "open_positions": 82,  "demand_score": 65},
        "Uganda":   {"avg_salary_monthly": 132000, "open_positions": 67,  "demand_score": 62},
        "Tanzania": {"avg_salary_monthly": 142000, "open_positions": 75,  "demand_score": 67},
    },
}


# ── HELPER FUNCTIONS ──────────────────────────────────────────────────────────

def compute_alignment(career_name: str, region: str = None, top_n: int = 10) -> pd.DataFrame:
    """
    Rank programs by alignment to a career using the pre-computed alignment
    matrix (weighted average of program skill coverage by career skill weights).
    """
    scores  = alignment_matrix.loc[career_name]
    results = []

    for prog, score in scores.items():
        if prog not in program_metadata.index:
            continue
        meta = program_metadata.loc[prog]

        if region and meta["region"].lower() != region.lower():
            continue

        results.append({
            "program":         prog,
            "program_name":    meta["program_name"],
            "university":      meta["university"],
            "region":          meta["region"],
            "alignment_score": round(float(score), 4)
        })

    return (
        pd.DataFrame(results)
        .sort_values("alignment_score", ascending=False)
        .head(top_n)
        .reset_index(drop=True)
    )


def compute_skill_gaps(student_profile: dict, career_name: str) -> dict:
    """Compute per-skill gaps between student proficiency and career requirements."""
    career_vec = career_vector_matrix.loc[career_name]
    required   = career_vec[career_vec > 0]

    gaps = []
    for skill, req_weight in required.items():
        student_prof = student_profile.get(skill, 0.0)
        gap          = req_weight - student_prof
        gaps.append({
            "skill":               skill,
            "required_weight":     round(float(req_weight), 4),
            "student_proficiency": round(float(student_prof), 4),
            "gap":                 round(float(gap), 4),
            "status": (
                "strong"       if gap <= 0   else
                "moderate_gap" if gap < 0.3  else
                "critical_gap"
            )
        })

    gaps_df        = pd.DataFrame(gaps).sort_values("gap", ascending=False)
    weights        = required.values
    student_scores = np.array([student_profile.get(s, 0.0) for s in required.index])
    readiness      = (
        float(np.sum(weights * student_scores) / np.sum(weights))
        if np.sum(weights) > 0 else 0.0
    )

    return {
        "overall_readiness":     round(readiness, 4),
        "readiness_percentage":  round(readiness * 100, 2),
        "total_skills_required": len(required),
        "strong_skills_count":   int((gaps_df["status"] == "strong").sum()),
        "gap_skills_count":      int((gaps_df["status"] != "strong").sum()),
        "critical_gaps_count":   int((gaps_df["status"] == "critical_gap").sum()),
        "top_gaps":              gaps_df[gaps_df["status"] != "strong"].head(5).to_dict("records"),
        "top_strengths":         gaps_df[gaps_df["status"] == "strong"].head(5).to_dict("records"),
    }


def get_similar_careers_list(career_name: str, top_n: int = 10) -> list:
    """Return top-N similar careers with metadata using the pre-computed similarity matrix."""
    scores  = career_sim_df.loc[career_name].sort_values(ascending=False)
    results = []

    for sim_career, score in scores.items():
        if sim_career == career_name or score == 0:
            continue
        meta   = career_metadata.loc[sim_career]
        vec_a  = career_vector_matrix.loc[career_name]
        vec_b  = career_vector_matrix.loc[sim_career]
        shared = int(((vec_a > 0) & (vec_b > 0)).sum())
        union  = int(((vec_a > 0) | (vec_b > 0)).sum())

        results.append({
            "similar_career":   sim_career,
            "sector":           meta["career_sector"],
            "similarity_score": round(float(score), 4),
            "shared_skills":    shared,
            "union_skills":     union,
            "overlap_ratio":    round(shared / union, 4) if union > 0 else 0
        })
        if len(results) == top_n:
            break

    return results


def recommend_careers(student_profile: dict, top_n: int = 3, region: str = None) -> list:
    """
    Rank all careers by fit to the student profile, then return the top_n with
    full skill-gap breakdown, actionable tips, and program recommendations.
    """
    # ── 1. Score every career ─────────────────────────────────────────────────
    ranked = []
    for career in career_vector_matrix.index:
        career_vec = career_vector_matrix.loc[career]
        required   = career_vec[career_vec > 0]
        weights    = required.values
        scores     = np.array([min(float(student_profile.get(s, 0.0)), 1.0) for s in required.index])
        readiness  = float(np.sum(weights * scores) / np.sum(weights)) if np.sum(weights) > 0 else 0.0
        matched    = int(sum(1 for s in required.index if student_profile.get(s, 0.0) > 0))
        ranked.append((readiness, career, required, matched))

    ranked.sort(key=lambda x: x[0], reverse=True)

    # ── 2. Build full detail for top_n careers ────────────────────────────────
    results = []
    for rank_idx, (readiness, career, required, matched) in enumerate(ranked[:top_n], start=1):

        # Skill gaps
        gaps = []
        for skill, req_w in required.items():
            prof = min(float(student_profile.get(skill, 0.0)), 1.0)
            gap  = req_w - prof
            gaps.append({
                "skill":               skill,
                "required_weight":     round(float(req_w), 4),
                "student_proficiency": round(prof, 4),
                "gap":                 round(float(gap), 4),
                "status": (
                    "strong"       if gap <= 0   else
                    "moderate_gap" if gap < 0.3  else
                    "critical_gap"
                )
            })
        gaps_df   = pd.DataFrame(gaps).sort_values("gap", ascending=False)
        critical  = gaps_df[gaps_df["status"] == "critical_gap"].head(5).to_dict("records")
        moderate  = gaps_df[gaps_df["status"] == "moderate_gap"].head(5).to_dict("records")
        strengths = gaps_df[gaps_df["status"] == "strong"].head(5).to_dict("records")

        # Tips
        tips = []
        for g in critical[:3]:
            tips.append(
                f"Build foundation in '{g['skill']}' "
                f"(need {g['required_weight']:.2f}, you have {g['student_proficiency']:.2f})"
            )
        for g in moderate[:3]:
            tips.append(
                f"Improve '{g['skill']}' "
                f"from {g['student_proficiency']:.2f} \u2192 {g['required_weight']:.2f}"
            )
        focus = [g["skill"] for g in (critical + moderate)[:3]]
        if focus:
            tips.append(
                "Build a portfolio project using: " + ", ".join(focus)
            )

        # Top programs (from alignment_matrix + optional region filter)
        prog_scores = alignment_matrix.loc[career]
        prog_list   = []
        for prog, score in prog_scores.items():
            if prog not in program_metadata.index:
                continue
            meta = program_metadata.loc[prog]
            if region and meta["region"].lower() != region.lower():
                continue
            prog_list.append({
                "program_name":    meta["program_name"],
                "university":      meta["university"],
                "region":          meta["region"],
                "alignment_score": round(float(score), 4)
            })
        top_progs = sorted(prog_list, key=lambda x: x["alignment_score"], reverse=True)[:5]

        meta = career_metadata.loc[career]
        pct  = round(readiness * 100, 2)
        results.append({
            "rank":                  rank_idx,
            "career":                career,
            "career_id":             meta["career_id"],
            "sector":                meta["career_sector"],
            "readiness_score":       round(readiness, 4),
            "readiness_percentage":  pct,
            "readiness_label": (
                "Advanced"     if pct >= 80 else
                "Intermediate" if pct >= 55 else
                "Beginner"
            ),
            "skills_matched":        matched,
            "total_skills_required": len(required),
            "critical_gaps":         critical,
            "moderate_gaps":         moderate,
            "strengths":             strengths,
            "tips":                  tips,
            "top_programs":          top_progs,
        })

    return results


# ── NEW INLINE HELPER FUNCTIONS ───────────────────────────────────────────────

def _classify_skill(skill_name: str) -> str:
    """Classify skill into one of four clusters."""
    skill_lower = skill_name.lower()

    technical_keywords = [
        "python", "java", "c++", "algorithm", "data structure", "programming",
        "calculus", "linear algebra", "statistics", "probability", "mathematics",
        "machine_learning", "deep_learning", "neural", "reinforcement"
    ]
    tools_keywords = [
        "aws", "azure", "gcp", "docker", "kubernetes", "react", "angular", "vue",
        "node", "sql", "mongodb", "postgresql", "git", "jenkins", "tensorflow",
        "pytorch", "scikit", "pandas", "numpy", "hadoop", "spark", "tableau",
        "power_bi", "excel", "cloud", "database", "api", "rest"
    ]
    soft_keywords = [
        "communication", "leadership", "teamwork", "agile", "scrum", "mentorship",
        "presentation", "negotiation", "collaboration", "management", "interpersonal",
        "critical_thinking", "problem_solving", "adaptability", "time_management"
    ]

    if any(kw in skill_lower for kw in technical_keywords):
        return "technical_core"
    elif any(kw in skill_lower for kw in tools_keywords):
        return "tools_platforms"
    elif any(kw in skill_lower for kw in soft_keywords):
        return "soft_skills"
    else:
        return "domain_knowledge"


def _estimate_learning_time(skill_name: str, gap: float, current_level: float) -> float:
    """Estimate months needed to close a skill gap."""
    if gap <= 0.2:
        base_time = 1.5
    elif gap <= 0.5:
        base_time = 3.0
    else:
        base_time = 5.0

    complexity_multipliers = {
        "technical_core":   1.2,
        "tools_platforms":  1.0,
        "soft_skills":      0.8,
        "domain_knowledge": 1.0,
    }
    cluster = _classify_skill(skill_name)
    return base_time * complexity_multipliers.get(cluster, 1.0)


def _get_skill_dependencies(career_name: str) -> dict:
    """Return prerequisite relationships for skills in a career."""
    common = {
        "machine_learning": ["python", "statistics"],
        "deep_learning": ["machine_learning"],
        "natural_language_processing": ["machine_learning", "python"],
        "computer_vision": ["machine_learning"],
        "model_deployment": ["machine_learning", "cloud_computing"],
        "mlops": ["model_deployment"],
        "data_visualization": ["python"],
        "feature_engineering": ["python", "statistics"],
        "neural_networks": ["machine_learning"],
        "time_series_analysis": ["statistics", "python"],
        "big_data_processing": ["python"],
    }
    career_specific = {
        "Data Analyst": {
            "data_visualization": ["sql"],
            "statistical_analysis": ["statistics", "python"],
        },
        "Software Engineer": {
            "system_design": ["databases"],
            "api_development": ["programming"],
        },
    }
    return career_specific.get(career_name, common)


def _topological_sort_skills(gaps_df: pd.DataFrame, dependencies: dict) -> list:
    """Sort skills in recommended learning order using topological sort."""
    all_skills = gaps_df["skill"].tolist()
    skill_gaps = dict(zip(gaps_df["skill"], gaps_df["gap"]))

    graph     = defaultdict(list)
    in_degree = defaultdict(int)

    for skill in all_skills:
        if skill not in in_degree:
            in_degree[skill] = 0

    for skill in all_skills:
        for prereq in dependencies.get(skill, []):
            if prereq in all_skills:
                graph[prereq].append(skill)
                in_degree[skill] += 1

    queue = deque(sorted(
        [s for s in all_skills if in_degree[s] == 0],
        key=lambda s: skill_gaps.get(s, 0),
        reverse=True
    ))

    sorted_skills = []
    while queue:
        queue = deque(sorted(queue, key=lambda s: skill_gaps.get(s, 0), reverse=True))
        current = queue.popleft()
        sorted_skills.append(current)
        for neighbor in graph[current]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    # Handle any cycles (shouldn't occur with clean data)
    remaining = [s for s in all_skills if s not in sorted_skills]
    sorted_skills.extend(sorted(remaining, key=lambda s: skill_gaps.get(s, 0), reverse=True))

    return sorted_skills


def generate_roadmap_inline(student_profile: dict, career_name: str) -> dict:
    """
    Generate a time-sequenced learning roadmap.
    Ported from notebook's generate_learning_roadmap function.
    """
    career_vec = career_vector_matrix.loc[career_name]
    required   = career_vec[career_vec > 0]

    # Build full gap list (not truncated — roadmap needs all skills)
    gaps = []
    for skill, req_weight in required.items():
        student_prof = student_profile.get(skill, 0.0)
        gap          = req_weight - student_prof
        if gap > 0:
            gaps.append({
                "skill":              skill,
                "required_weight":    float(req_weight),
                "student_proficiency": float(student_prof),
                "gap":                float(gap),
            })

    if not gaps:
        return {
            "total_duration_months":   0,
            "total_skills_with_gaps":  0,
            "message":                 "No skill gaps — you are well prepared for this career.",
            "phases":                  {"foundation": [], "specialization": [], "proficiency": []},
            "skill_clusters":          {},
            "critical_path":           [],
        }

    gaps_df      = pd.DataFrame(gaps).sort_values("gap", ascending=False)
    dependencies = _get_skill_dependencies(career_name)
    order        = _topological_sort_skills(gaps_df, dependencies)

    roadmap_items = []
    current_month = 0.0

    for skill_name in order:
        row = gaps_df[gaps_df["skill"] == skill_name]
        if row.empty:
            continue
        row       = row.iloc[0]
        gap       = row["gap"]
        learn_t   = _estimate_learning_time(skill_name, gap, student_profile.get(skill_name, 0))
        cluster   = _classify_skill(skill_name)
        priority  = "HIGH" if gap >= 0.4 else "MEDIUM" if gap >= 0.2 else "LOW"

        roadmap_items.append({
            "skill":            skill_name,
            "start_month":      round(current_month, 1),
            "end_month":        round(current_month + learn_t, 1),
            "duration_months":  round(learn_t, 1),
            "gap":              round(gap, 4),
            "priority":         priority,
            "cluster":          cluster,
            "prerequisites":    dependencies.get(skill_name, []),
        })
        current_month += learn_t

    phases = {"foundation": [], "specialization": [], "proficiency": []}
    for item in roadmap_items:
        if item["start_month"] < 4:
            phases["foundation"].append(item)
        elif item["start_month"] < 12:
            phases["specialization"].append(item)
        else:
            phases["proficiency"].append(item)

    skill_clusters = {
        cluster: [i for i in roadmap_items if i["cluster"] == cluster]
        for cluster in ["technical_core", "tools_platforms", "soft_skills", "domain_knowledge"]
    }
    critical_path = [i for i in roadmap_items if i["prerequisites"]]

    return {
        "total_duration_months":  round(current_month, 1),
        "total_skills_with_gaps": len(roadmap_items),
        "phases":                 phases,
        "skill_clusters":         skill_clusters,
        "critical_path":          critical_path,
    }


def get_market_intelligence_inline(career_name: str, region: str = "Kenya") -> dict:
    """
    Return job market data for a career and region.
    Falls back to sector-based defaults for careers not in MARKET_INTELLIGENCE_DB.
    Growth trend is derived deterministically from demand_score.
    """
    valid_regions = {"Kenya", "Rwanda", "Uganda", "Tanzania"}
    # Normalise region
    region_resolved = next((r for r in valid_regions if r.lower() == region.lower()), None)
    if region_resolved is None:
        return None

    career_data = MARKET_INTELLIGENCE_DB.get(career_name, {})
    region_data = career_data.get(region_resolved)

    if not region_data:
        # Sector-based fallback
        sector = (
            career_metadata.loc[career_name]["career_sector"]
            if career_name in career_metadata.index
            else "IT"
        )
        region_data = _SECTOR_DEFAULTS.get(sector, _SECTOR_DEFAULTS["IT"]).get(
            region_resolved,
            {"avg_salary_monthly": 150000, "open_positions": 200, "demand_score": 70}
        )

    avg_salary   = region_data["avg_salary_monthly"]
    demand_score = region_data["demand_score"]

    growth_trend = (
        "Growing" if demand_score >= 85 else
        "Stable"  if demand_score >= 70 else
        "Declining"
    )

    # Regional comparison (demand + positions across all 4 regions)
    regional_comparison = {}
    for r in valid_regions:
        r_data = MARKET_INTELLIGENCE_DB.get(career_name, {}).get(r)
        if not r_data:
            sector = (
                career_metadata.loc[career_name]["career_sector"]
                if career_name in career_metadata.index else "IT"
            )
            r_data = _SECTOR_DEFAULTS.get(sector, _SECTOR_DEFAULTS["IT"]).get(
                r, {"demand_score": 70, "open_positions": 200}
            )
        regional_comparison[r] = {
            "demand_score":  r_data["demand_score"],
            "open_positions": r_data["open_positions"],
        }

    return {
        "career":                career_name,
        "region":                region_resolved,
        "avg_salary_monthly":    avg_salary,
        "salary_range": {
            "min":    int(avg_salary * 0.8),
            "median": avg_salary,
            "max":    int(avg_salary * 1.2),
        },
        "open_positions":        region_data["open_positions"],
        "demand_score":          demand_score,
        "top_employers":         TOP_EMPLOYERS_DB.get(career_name, ["Various companies"]),
        "growth_trend":          growth_trend,
        "currency":              "KES",
        "regional_comparison":   regional_comparison,
    }


def _stable_hash(s: str) -> int:
    """Deterministic hash that is consistent across Python runs."""
    h = 0
    for c in s:
        h = (h * 31 + ord(c)) & 0xFFFFFFFF
    return h


def compare_programs_inline(program_ids: list, career_name: str, dimensions: list) -> list:
    """
    Compare programs across multiple dimensions.
    - alignment: from pre-computed alignment_matrix
    - other dimensions: deterministic heuristic scores (prototype placeholder)
    """
    results = []
    for prog_id in program_ids:
        # Case-insensitive lookup
        if prog_id not in program_metadata.index:
            match = next(
                (p for p in program_metadata.index if p.lower() == prog_id.lower()), None
            )
            if match:
                prog_id = match
            else:
                continue

        meta   = program_metadata.loc[prog_id]
        scores = {
            "program_id":   prog_id,
            "program_name": meta["program_name"],
            "university":   meta["university"],
            "region":       meta["region"],
        }

        for dim in dimensions:
            if dim == "alignment":
                if (career_name in alignment_matrix.index
                        and prog_id in alignment_matrix.columns):
                    scores["alignment"] = round(float(alignment_matrix.loc[career_name, prog_id]), 4)
                else:
                    scores["alignment"] = 0.5
            else:
                # Deterministic heuristic: stable hash maps to range 0.55-0.90
                seed = _stable_hash(prog_id + dim) % 1000
                scores[dim] = round(0.55 + (seed / 1000) * 0.35, 4)

        dim_vals = [scores[d] for d in dimensions if d in scores]
        scores["overall_score"] = round(sum(dim_vals) / len(dim_vals), 4) if dim_vals else 0.5
        results.append(scores)

    results.sort(key=lambda x: x.get("overall_score", 0), reverse=True)
    return results


# ── ROUTES ────────────────────────────────────────────────────────────────────

@app.route("/", methods=["GET"])
def health():
    return jsonify({
        "status":   "ok",
        "service":  "PathForge Career Intelligence API",
        "version":  "2.0.0",
        "careers":  len(career_vector_matrix),
        "programs": len(program_vector_matrix),
        "skills":   career_vector_matrix.shape[1],
        "endpoints": [
            "GET  /careers",
            "GET  /careers/sector/<sector>",
            "GET  /api/alignment/<career>?region=<region>&top_n=<n>",
            "POST /api/gap",
            "GET  /api/similarity/<career>?top_n=<n>",
            "POST /api/recommend",
            "GET  /api/students/<student_id>/profile",
            "POST /api/students/<student_id>/profile",
            "POST /api/students/<student_id>/update-skill",
            "GET  /api/students/<student_id>/gaps/<career>",
            "GET  /api/students/<student_id>/readiness/<career>?velocity=<v>",
            "GET  /api/students/<student_id>/roadmap/<career>",
            "GET  /api/students/<student_id>/progress/<career>",
            "GET  /api/programs/compare?programs=<p1,p2>&career=<c>&dimensions=<d1,d2>",
            "GET  /api/market-intelligence/<career>?region=<region>",
            "POST /api/assessments/<assessment_id>/submit",
        ]
    })


@app.route("/careers", methods=["GET"])
def list_careers():
    """List all available careers with sector info."""
    data = []
    for career in career_vector_matrix.index:
        meta   = career_metadata.loc[career]
        skills = int((career_vector_matrix.loc[career] > 0).sum())
        data.append({
            "career_name":  career,
            "career_id":    meta["career_id"],
            "sector":       meta["career_sector"],
            "total_skills": skills
        })
    return jsonify({
        "status":  "ok",
        "count":   len(data),
        "careers": data
    })


@app.route("/careers/sector/<path:sector>", methods=["GET"])
def careers_by_sector(sector: str):
    """Get all careers in a specific sector (case-insensitive)."""
    resolved_sector = sector_name_map.get(sector.lower().strip())
    if resolved_sector is None:
        return jsonify({
            "status":    "error",
            "message":   f"Sector '{sector}' not found",
            "available": list(sector_name_map.values())
        }), 404

    matches = career_metadata[career_metadata["career_sector"] == resolved_sector]
    data    = []
    for career, row in matches.iterrows():
        data.append({
            "career_name":  career,
            "career_id":    row["career_id"],
            "total_skills": int((career_vector_matrix.loc[career] > 0).sum())
        })

    return jsonify({
        "status":  "ok",
        "sector":  resolved_sector,
        "count":   len(data),
        "careers": data
    })


@app.route("/api/alignment/<path:career_name>", methods=["GET"])
def career_alignment(career_name: str):
    """
    GET /api/alignment/data scientist?region=kenya&top_n=5
    Returns top university programs aligned to the given career.
    """
    resolved = career_name_map.get(career_name.lower().strip())
    if resolved is None:
        close = [v for k, v in career_name_map.items() if career_name.lower() in k]
        return jsonify({
            "status":      "error",
            "message":     f"Career '{career_name}' not found",
            "suggestions": close[:5]
        }), 404

    region = request.args.get("region", None)
    top_n  = int(request.args.get("top_n", 10))

    results = compute_alignment(resolved, region=region, top_n=top_n)

    if results.empty:
        return jsonify({
            "status":  "error",
            "message": f"No programs found for region '{region}'"
        }), 404

    return jsonify({
        "status":        "ok",
        "career":        resolved,
        "region_filter": region if region else "all",
        "total_results": len(results),
        "results":       results.to_dict("records"),
        "metadata": {
            "avg_alignment": round(float(results["alignment_score"].mean()), 4),
            "max_alignment": round(float(results["alignment_score"].max()), 4),
            "min_alignment": round(float(results["alignment_score"].min()), 4)
        }
    })


@app.route("/api/gap", methods=["POST"])
def skill_gap():
    """
    POST /api/gap
    Body (JSON):
    {
        "career": "data scientist",
        "student_profile": {
            "python": 0.8,
            "machine_learning": 0.6,
            "sql": 0.7
        }
    }
    Returns skill gap analysis and overall readiness score.
    """
    body = request.get_json(silent=True)

    if not body:
        return jsonify({
            "status":  "error",
            "message": "Request body must be JSON"
        }), 400

    career_input    = body.get("career", "").lower().strip()
    student_profile = body.get("student_profile", {})

    if not career_input:
        return jsonify({"status": "error", "message": "'career' field is required"}), 400

    resolved = career_name_map.get(career_input)
    if resolved is None:
        return jsonify({"status": "error", "message": f"Career '{career_input}' not found"}), 404

    if not isinstance(student_profile, dict) or len(student_profile) == 0:
        return jsonify({"status": "error", "message": "'student_profile' must be a non-empty dict"}), 400

    # Normalise profile keys to match snake_case skill names in the model
    student_profile = {k.lower().strip(): float(v) for k, v in student_profile.items()}

    result = compute_skill_gaps(student_profile, resolved)

    return jsonify({
        "status":                "ok",
        "career":                resolved,
        "overall_readiness":     result["overall_readiness"],
        "readiness_percentage":  result["readiness_percentage"],
        "readiness_label": (
            "Advanced"     if result["readiness_percentage"] >= 80 else
            "Intermediate" if result["readiness_percentage"] >= 55 else
            "Beginner"
        ),
        "total_skills_required": result["total_skills_required"],
        "strong_skills_count":   result["strong_skills_count"],
        "gap_skills_count":      result["gap_skills_count"],
        "critical_gaps_count":   result["critical_gaps_count"],
        "top_gaps":              result["top_gaps"],
        "top_strengths":         result["top_strengths"]
    })


@app.route("/api/similarity/<path:career_name>", methods=["GET"])
def career_similarity(career_name: str):
    """
    GET /api/similarity/data scientist?top_n=5
    Returns careers with similar skill requirements.
    """
    resolved = career_name_map.get(career_name.lower().strip())
    if resolved is None:
        return jsonify({
            "status":  "error",
            "message": f"Career '{career_name}' not found"
        }), 404

    top_n   = int(request.args.get("top_n", 10))
    results = get_similar_careers_list(resolved, top_n=top_n)

    return jsonify({
        "status":          "ok",
        "career":          resolved,
        "total_results":   len(results),
        "similar_careers": results,
        "metadata": {
            "avg_similarity": round(np.mean([r["similarity_score"] for r in results]), 4),
            "max_similarity": round(max(r["similarity_score"]      for r in results), 4)
        } if results else {}
    })


@app.route("/api/recommend", methods=["POST"])
def career_recommend():
    """
    POST /api/recommend
    Body (JSON):
    {
        "student_profile": {
            "python": 0.8,
            "sql": 0.6,
            "statistics": 0.7
        },
        "top_n":  3,        (optional, 1-5, default 3)
        "region": "kenya"   (optional, filter programs by country)
    }
    Returns the top matching careers ranked by readiness.
    """
    body = request.get_json(silent=True)

    if not body:
        return jsonify({"status": "error", "message": "Request body must be JSON"}), 400

    student_profile = body.get("student_profile", {})
    if not isinstance(student_profile, dict) or len(student_profile) == 0:
        return jsonify({"status": "error", "message": "'student_profile' must be a non-empty dict"}), 400

    # Clamp top_n to 1-5
    try:
        top_n = max(1, min(5, int(body.get("top_n", 3))))
    except (TypeError, ValueError):
        return jsonify({"status": "error", "message": "'top_n' must be an integer between 1 and 5"}), 400

    region = body.get("region", None)

    # Normalise profile keys to snake_case (same convention as career vectors)
    student_profile = {k.lower().strip(): float(v) for k, v in student_profile.items()}

    results = recommend_careers(student_profile, top_n=top_n, region=region)

    return jsonify({
        "status":        "ok",
        "input_skills":  len(student_profile),
        "region_filter": region if region else "all",
        "top_careers":   results,
    })


# ── STUDENT ROUTES ────────────────────────────────────────────────────────────

@app.route("/api/students/<student_id>/profile", methods=["GET"])
def get_student_profile(student_id: str):
    """
    GET /api/students/stu_001/profile
    Returns the stored student profile. 404 if not found.
    """
    db = load_students()
    if student_id not in db:
        return jsonify({
            "status":  "error",
            "message": f"Student '{student_id}' not found"
        }), 404
    return jsonify({"status": "ok", "student": db[student_id]})


@app.route("/api/students/<student_id>/profile", methods=["POST"])
def upsert_student_profile(student_id: str):
    """
    POST /api/students/stu_001/profile
    Body (JSON):
    {
        "name": "Alice Nakato",            (optional)
        "email": "alice@example.com",      (optional)
        "skills": {"python": 0.8, ...},    (required on first create)
        "region": "Uganda",                (optional)
        "target_careers": ["Data Scientist"] (optional)
    }
    Creates or updates a student profile. On update, skills are merged.
    """
    body = request.get_json(silent=True)
    if not body:
        return jsonify({"status": "error", "message": "Request body must be JSON"}), 400

    now = datetime.utcnow().isoformat()
    db  = load_students()

    if student_id in db:
        student = db[student_id]
        action  = "updated"
        if "skills" in body:
            raw = body["skills"]
            if not isinstance(raw, dict):
                return jsonify({"status": "error", "message": "'skills' must be a dict"}), 400
            normalized = {
                k.lower().strip().replace(" ", "_"): max(0.0, min(1.0, float(v)))
                for k, v in raw.items()
            }
            student["skills"].update(normalized)
        for field in ("name", "email", "region"):
            if field in body:
                student[field] = body[field]
        if "target_careers" in body:
            student["target_careers"] = body["target_careers"]
        student["updated_at"] = now
    else:
        if "skills" not in body:
            return jsonify({
                "status":  "error",
                "message": "'skills' is required when creating a new student profile"
            }), 400
        raw = body["skills"]
        if not isinstance(raw, dict) or not raw:
            return jsonify({"status": "error", "message": "'skills' must be a non-empty dict"}), 400
        normalized = {
            k.lower().strip().replace(" ", "_"): max(0.0, min(1.0, float(v)))
            for k, v in raw.items()
        }
        student = {
            "student_id":        student_id,
            "name":              body.get("name", ""),
            "email":             body.get("email", ""),
            "skills":            normalized,
            "region":            body.get("region", "Kenya"),
            "target_careers":    body.get("target_careers", []),
            "created_at":        now,
            "updated_at":        now,
            "progress_snapshots": [],
        }
        action = "created"

    db[student_id] = student
    save_students(db)

    return jsonify({
        "status":     "ok",
        "student_id": student_id,
        "action":     action,
        "updated_at": now,
    })


@app.route("/api/students/<student_id>/update-skill", methods=["POST"])
def update_student_skill(student_id: str):
    """
    POST /api/students/stu_001/update-skill
    Body (JSON):
    {
        "skill": "python",
        "proficiency": 0.85,
        "career": "data scientist"   (optional – saves a progress snapshot when provided)
    }
    """
    body = request.get_json(silent=True)
    if not body:
        return jsonify({"status": "error", "message": "Request body must be JSON"}), 400

    skill       = body.get("skill", "").lower().strip().replace(" ", "_")
    proficiency = body.get("proficiency")
    career_hint = body.get("career", None)

    if not skill:
        return jsonify({"status": "error", "message": "'skill' is required"}), 400
    if proficiency is None:
        return jsonify({"status": "error", "message": "'proficiency' is required"}), 400
    try:
        proficiency = float(proficiency)
        if not 0.0 <= proficiency <= 1.0:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({"status": "error", "message": "'proficiency' must be a number between 0.0 and 1.0"}), 400

    db = load_students()
    if student_id not in db:
        return jsonify({
            "status":  "error",
            "message": f"Student '{student_id}' not found — create a profile first via POST /api/students/{student_id}/profile"
        }), 404

    student          = db[student_id]
    old_proficiency  = student["skills"].get(skill)
    student["skills"][skill] = proficiency
    now              = datetime.utcnow().isoformat()
    student["updated_at"] = now

    snapshot_saved   = False
    if career_hint:
        resolved_career = career_name_map.get(career_hint.lower().strip())
        if resolved_career:
            gap_result = compute_skill_gaps(student["skills"], resolved_career)
            student.setdefault("progress_snapshots", []).append({
                "date":            now[:10],
                "career":          resolved_career,
                "readiness_score": gap_result["overall_readiness"],
                "skills":          dict(student["skills"]),
            })
            snapshot_saved = True

    db[student_id] = student
    save_students(db)

    return jsonify({
        "status":           "ok",
        "student_id":       student_id,
        "skill":            skill,
        "old_proficiency":  old_proficiency,
        "new_proficiency":  proficiency,
        "snapshot_saved":   snapshot_saved,
    })


@app.route("/api/students/<student_id>/gaps/<path:career>", methods=["GET"])
def student_gap_analysis(student_id: str, career: str):
    """
    GET /api/students/stu_001/gaps/data scientist
    Personalised gap analysis using the student's stored skill profile.
    """
    resolved = career_name_map.get(career.lower().strip())
    if resolved is None:
        return jsonify({"status": "error", "message": f"Career '{career}' not found"}), 404

    db = load_students()
    if student_id not in db:
        return jsonify({"status": "error", "message": f"Student '{student_id}' not found"}), 404

    result = compute_skill_gaps(db[student_id]["skills"], resolved)
    pct    = result["readiness_percentage"]

    return jsonify({
        "status":                "ok",
        "student_id":            student_id,
        "career":                resolved,
        "overall_readiness":     result["overall_readiness"],
        "readiness_percentage":  pct,
        "readiness_label": (
            "Advanced"     if pct >= 80 else
            "Intermediate" if pct >= 55 else
            "Beginner"
        ),
        "total_skills_required": result["total_skills_required"],
        "strong_skills_count":   result["strong_skills_count"],
        "gap_skills_count":      result["gap_skills_count"],
        "critical_gaps_count":   result["critical_gaps_count"],
        "top_gaps":              result["top_gaps"],
        "top_strengths":         result["top_strengths"],
    })


@app.route("/api/students/<student_id>/readiness/<path:career>", methods=["GET"])
def student_readiness(student_id: str, career: str):
    """
    GET /api/students/stu_001/readiness/data scientist?velocity=0.04
    Current readiness + 36-month trajectory projection.
    velocity = readiness fraction gained per month (default 0.03, clamped 0.01-0.10).
    """
    resolved = career_name_map.get(career.lower().strip())
    if resolved is None:
        return jsonify({"status": "error", "message": f"Career '{career}' not found"}), 404

    db = load_students()
    if student_id not in db:
        return jsonify({"status": "error", "message": f"Student '{student_id}' not found"}), 404

    try:
        velocity = float(request.args.get("velocity", 0.03))
        velocity = max(0.01, min(0.10, velocity))
    except (TypeError, ValueError):
        velocity = 0.03

    result      = compute_skill_gaps(db[student_id]["skills"], resolved)
    current_pct = result["readiness_percentage"]
    current     = current_pct / 100.0

    trajectory = [
        {
            "month":          month,
            "projected_pct":  round(min(1.0, current + month * velocity) * 100, 1),
            "label": (
                "Advanced"     if min(1.0, current + month * velocity) * 100 >= 80 else
                "Intermediate" if min(1.0, current + month * velocity) * 100 >= 55 else
                "Beginner"
            ),
        }
        for month in range(0, 37)
    ]

    def months_to(threshold_pct: float):
        if current_pct >= threshold_pct:
            return 0
        needed = (threshold_pct / 100.0) - current
        return math.ceil(needed / velocity) if velocity > 0 else None

    return jsonify({
        "status":                     "ok",
        "student_id":                 student_id,
        "career":                     resolved,
        "current_readiness_percentage": current_pct,
        "readiness_label": (
            "Advanced"     if current_pct >= 80 else
            "Intermediate" if current_pct >= 55 else
            "Beginner"
        ),
        "learning_velocity_per_month": velocity,
        "months_to_intermediate":     months_to(55),
        "months_to_advanced":         months_to(80),
        "months_to_expert":           months_to(95),
        "trajectory":                 trajectory,
    })


@app.route("/api/students/<student_id>/roadmap/<path:career>", methods=["GET"])
def student_roadmap(student_id: str, career: str):
    """
    GET /api/students/stu_001/roadmap/data scientist
    Generates a personalised time-sequenced learning roadmap.
    """
    resolved = career_name_map.get(career.lower().strip())
    if resolved is None:
        return jsonify({"status": "error", "message": f"Career '{career}' not found"}), 404

    db = load_students()
    if student_id not in db:
        return jsonify({"status": "error", "message": f"Student '{student_id}' not found"}), 404

    roadmap = generate_roadmap_inline(db[student_id]["skills"], resolved)

    return jsonify({
        "status":     "ok",
        "student_id": student_id,
        "career":     resolved,
        **roadmap,
    })


@app.route("/api/students/<student_id>/progress/<path:career>", methods=["GET"])
def student_progress(student_id: str, career: str):
    """
    GET /api/students/stu_001/progress/data scientist
    Returns snapshot history and trend for the student's journey toward a career.
    """
    resolved = career_name_map.get(career.lower().strip())
    if resolved is None:
        return jsonify({"status": "error", "message": f"Career '{career}' not found"}), 404

    db = load_students()
    if student_id not in db:
        return jsonify({"status": "error", "message": f"Student '{student_id}' not found"}), 404

    student  = db[student_id]
    all_snaps = student.get("progress_snapshots", [])
    snaps     = sorted(
        [s for s in all_snaps if s.get("career") == resolved],
        key=lambda s: s.get("date", "")
    )

    # Current readiness from live profile
    result      = compute_skill_gaps(student["skills"], resolved)
    current_pct = result["readiness_percentage"]

    # Trend from last two snapshots
    if len(snaps) < 2:
        trend = "insufficient_data"
    else:
        delta = (snaps[-1]["readiness_score"] - snaps[-2]["readiness_score"]) * 100
        trend = "improving" if delta > 2 else "declining" if delta < -2 else "stable"

    snapshot_list = [
        {
            "date":               s.get("date"),
            "readiness_score":    s.get("readiness_score"),
            "readiness_percentage": round(s.get("readiness_score", 0) * 100, 2),
            "label": (
                "Advanced"     if s.get("readiness_score", 0) * 100 >= 80 else
                "Intermediate" if s.get("readiness_score", 0) * 100 >= 55 else
                "Beginner"
            ),
        }
        for s in snaps
    ]

    return jsonify({
        "status":                     "ok",
        "student_id":                 student_id,
        "career":                     resolved,
        "current_readiness_percentage": current_pct,
        "current_label": (
            "Advanced"     if current_pct >= 80 else
            "Intermediate" if current_pct >= 55 else
            "Beginner"
        ),
        "snapshot_count": len(snaps),
        "trend":          trend,
        "snapshots":      snapshot_list,
    })


# ── SYSTEM ENDPOINTS ──────────────────────────────────────────────────────────

@app.route("/api/programs/compare", methods=["GET"])
def programs_compare():
    """
    GET /api/programs/compare?programs=<p1,p2>&career=<career>&dimensions=<d1,d2>
    Compare programs across multiple dimensions for a target career.
    programs  — comma-separated program_university keys (required)
    career    — target career name (required, case-insensitive)
    dimensions — comma-separated subset of: alignment,employability,roi,research,network,facilities
                 (default: all six)
    """
    programs_param  = request.args.get("programs", "").strip()
    career_param    = request.args.get("career", "").strip()
    dimensions_param = request.args.get(
        "dimensions", "alignment,employability,roi,research,network,facilities"
    )

    if not programs_param:
        return jsonify({"status": "error", "message": "'programs' query parameter is required (comma-separated program names)"}), 400
    if not career_param:
        return jsonify({"status": "error", "message": "'career' query parameter is required"}), 400

    resolved_career = career_name_map.get(career_param.lower())
    if resolved_career is None:
        return jsonify({"status": "error", "message": f"Career '{career_param}' not found"}), 404

    valid_dims  = {"alignment", "employability", "roi", "research", "network", "facilities"}
    program_ids = [p.strip() for p in programs_param.split(",") if p.strip()]
    dimensions  = [d.strip() for d in dimensions_param.split(",") if d.strip() in valid_dims]
    if not dimensions:
        dimensions = list(valid_dims)

    results = compare_programs_inline(program_ids, resolved_career, dimensions)
    if not results:
        return jsonify({
            "status":  "error",
            "message": "No matching programs found. Check program names match the program_university format."
        }), 404

    return jsonify({
        "status":     "ok",
        "career":     resolved_career,
        "dimensions": dimensions,
        "results":    results,
    })


@app.route("/api/market-intelligence/<path:career>", methods=["GET"])
def market_intelligence(career: str):
    """
    GET /api/market-intelligence/data scientist?region=Kenya
    Returns job market data for a career in a specific East African region.
    region — one of: Kenya (default), Uganda, Tanzania, Rwanda
    """
    resolved = career_name_map.get(career.lower().strip())
    if resolved is None:
        close = [v for k, v in career_name_map.items() if career.lower() in k]
        return jsonify({
            "status":      "error",
            "message":     f"Career '{career}' not found",
            "suggestions": close[:5],
        }), 404

    region = request.args.get("region", "Kenya").strip()
    data   = get_market_intelligence_inline(resolved, region)

    if data is None:
        return jsonify({
            "status":    "error",
            "message":   f"Region '{region}' not recognised",
            "available": ["Kenya", "Uganda", "Tanzania", "Rwanda"],
        }), 404

    return jsonify({"status": "ok", **data})


@app.route("/api/assessments/<assessment_id>/submit", methods=["POST"])
def submit_assessment(assessment_id: str):
    """
    POST /api/assessments/ASSESS_001/submit
    Body (JSON):
    {
        "student_id": "stu_001",
        "career": "data scientist",
        "skill_scores": {"python": 0.85, "deep_learning": 0.6, ...}
    }
    Merges skill scores into the student profile, saves a progress snapshot,
    and returns the updated gap analysis.
    """
    body = request.get_json(silent=True)
    if not body:
        return jsonify({"status": "error", "message": "Request body must be JSON"}), 400

    student_id   = body.get("student_id")
    career_input = body.get("career", "")
    skill_scores = body.get("skill_scores", {})

    if not student_id:
        return jsonify({"status": "error", "message": "'student_id' is required"}), 400
    if not career_input:
        return jsonify({"status": "error", "message": "'career' is required"}), 400
    if not isinstance(skill_scores, dict) or not skill_scores:
        return jsonify({"status": "error", "message": "'skill_scores' must be a non-empty dict"}), 400

    resolved = career_name_map.get(career_input.lower().strip())
    if resolved is None:
        return jsonify({"status": "error", "message": f"Career '{career_input}' not found"}), 404

    db = load_students()
    if student_id not in db:
        return jsonify({"status": "error", "message": f"Student '{student_id}' not found"}), 404

    student    = db[student_id]
    normalized = {
        k.lower().strip().replace(" ", "_"): max(0.0, min(1.0, float(v)))
        for k, v in skill_scores.items()
    }
    student["skills"].update(normalized)

    now               = datetime.utcnow().isoformat()
    student["updated_at"] = now

    gap_result = compute_skill_gaps(student["skills"], resolved)
    student.setdefault("progress_snapshots", []).append({
        "date":            now[:10],
        "career":          resolved,
        "readiness_score": gap_result["overall_readiness"],
        "skills":          dict(student["skills"]),
    })

    db[student_id] = student
    save_students(db)

    pct = gap_result["readiness_percentage"]
    return jsonify({
        "status":         "ok",
        "assessment_id":  assessment_id,
        "student_id":     student_id,
        "career":         resolved,
        "skills_updated": len(normalized),
        "gap_analysis": {
            "overall_readiness":     gap_result["overall_readiness"],
            "readiness_percentage":  pct,
            "readiness_label": (
                "Advanced"     if pct >= 80 else
                "Intermediate" if pct >= 55 else
                "Beginner"
            ),
            "total_skills_required": gap_result["total_skills_required"],
            "critical_gaps_count":   gap_result["critical_gaps_count"],
            "top_gaps":              gap_result["top_gaps"],
            "top_strengths":         gap_result["top_strengths"],
        },
        "snapshot_saved": True,
    })


# ── DOCS ──────────────────────────────────────────────────────────────────────

@app.route("/openapi.json", methods=["GET"])
def openapi_spec():
    """Return the OpenAPI 3.0 specification."""
    spec = {
        "openapi": "3.0.0",
        "info": {
            "title": "PathForge Career Intelligence API",
            "version": "2.0.0",
            "description": (
                "Recommends university programs aligned to career goals, "
                "analyses student skill gaps, generates learning roadmaps, "
                "and tracks student progress over time. "
                "Covers 24 careers across IT, Business & Finance, and Engineering "
                "with 55 East African university programs (Uganda, Kenya, Tanzania, Rwanda)."
            )
        },
        "servers": [{"url": "/"}],
        "paths": {
            "/": {
                "get": {
                    "summary": "Health check",
                    "tags": ["General"],
                    "responses": {
                        "200": {"description": "API status, version, and endpoint list"}
                    }
                }
            },
            "/careers": {
                "get": {
                    "summary": "List all available careers",
                    "tags": ["Careers"],
                    "responses": {
                        "200": {"description": "Array of career objects with sector and skill count"}
                    }
                }
            },
            "/careers/sector/{sector}": {
                "get": {
                    "summary": "Careers by sector",
                    "tags": ["Careers"],
                    "parameters": [{
                        "name": "sector",
                        "in": "path",
                        "required": True,
                        "schema": {"type": "string", "enum": ["IT", "Business & Finance", "Engineering"]},
                        "description": "Sector name (case-insensitive)"
                    }],
                    "responses": {
                        "200": {"description": "Careers in the requested sector"},
                        "404": {"description": "Sector not found"}
                    }
                }
            },
            "/api/alignment/{career}": {
                "get": {
                    "summary": "Top university programs for a career",
                    "tags": ["Alignment"],
                    "parameters": [
                        {
                            "name": "career",
                            "in": "path",
                            "required": True,
                            "schema": {"type": "string"},
                            "description": "Career name (case-insensitive, e.g. data scientist)"
                        },
                        {
                            "name": "region",
                            "in": "query",
                            "required": False,
                            "schema": {"type": "string", "enum": ["Kenya", "Uganda", "Tanzania", "Rwanda"]},
                            "description": "Filter results by country (case-insensitive)"
                        },
                        {
                            "name": "top_n",
                            "in": "query",
                            "required": False,
                            "schema": {"type": "integer", "default": 10},
                            "description": "Number of programs to return"
                        }
                    ],
                    "responses": {
                        "200": {"description": "Ranked list of programs with alignment scores"},
                        "404": {"description": "Career or region not found"}
                    }
                }
            },
            "/api/gap": {
                "post": {
                    "summary": "Stateless skill gap analysis",
                    "tags": ["Skill Gap"],
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "required": ["career", "student_profile"],
                                    "properties": {
                                        "career": {"type": "string", "example": "data scientist"},
                                        "student_profile": {
                                            "type": "object",
                                            "description": "Skill name → proficiency score (0.0–1.0)",
                                            "example": {
                                                "python": 0.7,
                                                "sql": 0.5,
                                                "machine_learning": 0.4,
                                                "statistics": 0.6
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "responses": {
                        "200": {"description": "Readiness score, top gaps, and top strengths"},
                        "400": {"description": "Missing or invalid fields"},
                        "404": {"description": "Career not found"}
                    }
                }
            },
            "/api/similarity/{career}": {
                "get": {
                    "summary": "Similar careers by skill overlap",
                    "tags": ["Similarity"],
                    "parameters": [
                        {
                            "name": "career",
                            "in": "path",
                            "required": True,
                            "schema": {"type": "string"},
                            "description": "Career name (case-insensitive)"
                        },
                        {
                            "name": "top_n",
                            "in": "query",
                            "required": False,
                            "schema": {"type": "integer", "default": 10},
                            "description": "Number of similar careers to return"
                        }
                    ],
                    "responses": {
                        "200": {"description": "Ranked list of similar careers with similarity scores"},
                        "404": {"description": "Career not found"}
                    }
                }
            },
            "/api/recommend": {
                "post": {
                    "summary": "Career recommendation from a skill profile",
                    "tags": ["Recommend"],
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "required": ["student_profile"],
                                    "properties": {
                                        "student_profile": {
                                            "type": "object",
                                            "description": "Skill name (snake_case) → proficiency 0.0–1.0",
                                            "example": {
                                                "python": 0.8,
                                                "sql": 0.6,
                                                "statistics": 0.7,
                                                "communication": 0.8
                                            }
                                        },
                                        "top_n": {
                                            "type": "integer",
                                            "default": 3,
                                            "minimum": 1,
                                            "maximum": 5
                                        },
                                        "region": {
                                            "type": "string",
                                            "enum": ["Kenya", "Uganda", "Tanzania", "Rwanda"]
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "responses": {
                        "200": {"description": "Top career matches with gaps, tips, and programs"},
                        "400": {"description": "Missing or invalid request body"}
                    }
                }
            },
            "/api/students/{student_id}/profile": {
                "get": {
                    "summary": "Get student profile",
                    "tags": ["Students"],
                    "parameters": [{
                        "name": "student_id",
                        "in": "path",
                        "required": True,
                        "schema": {"type": "string"},
                        "description": "Unique student identifier"
                    }],
                    "responses": {
                        "200": {"description": "Student profile with skills and progress snapshots"},
                        "404": {"description": "Student not found"}
                    }
                },
                "post": {
                    "summary": "Create or update student profile",
                    "tags": ["Students"],
                    "parameters": [{
                        "name": "student_id",
                        "in": "path",
                        "required": True,
                        "schema": {"type": "string"}
                    }],
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "name":           {"type": "string"},
                                        "email":          {"type": "string"},
                                        "skills":         {"type": "object", "description": "skill → proficiency (0–1)"},
                                        "region":         {"type": "string", "enum": ["Kenya", "Uganda", "Tanzania", "Rwanda"]},
                                        "target_careers": {"type": "array", "items": {"type": "string"}}
                                    }
                                },
                                "example": {
                                    "name": "Alice Nakato",
                                    "skills": {"python": 0.7, "sql": 0.6, "machine_learning": 0.3},
                                    "region": "Uganda",
                                    "target_careers": ["Data Scientist"]
                                }
                            }
                        }
                    },
                    "responses": {
                        "200": {"description": "Profile created or updated"},
                        "400": {"description": "Missing or invalid fields"}
                    }
                }
            },
            "/api/students/{student_id}/update-skill": {
                "post": {
                    "summary": "Update a single skill proficiency",
                    "tags": ["Students"],
                    "parameters": [{
                        "name": "student_id",
                        "in": "path",
                        "required": True,
                        "schema": {"type": "string"}
                    }],
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "required": ["skill", "proficiency"],
                                    "properties": {
                                        "skill":       {"type": "string"},
                                        "proficiency": {"type": "number", "minimum": 0.0, "maximum": 1.0},
                                        "career":      {"type": "string", "description": "If provided, saves a readiness snapshot"}
                                    }
                                }
                            }
                        }
                    },
                    "responses": {
                        "200": {"description": "Skill updated"},
                        "400": {"description": "Invalid input"},
                        "404": {"description": "Student not found"}
                    }
                }
            },
            "/api/students/{student_id}/gaps/{career}": {
                "get": {
                    "summary": "Personalised gap analysis using stored profile",
                    "tags": ["Students"],
                    "parameters": [
                        {"name": "student_id", "in": "path", "required": True, "schema": {"type": "string"}},
                        {"name": "career",     "in": "path", "required": True, "schema": {"type": "string"}}
                    ],
                    "responses": {
                        "200": {"description": "Gap analysis identical to POST /api/gap"},
                        "404": {"description": "Student or career not found"}
                    }
                }
            },
            "/api/students/{student_id}/readiness/{career}": {
                "get": {
                    "summary": "Readiness score + 36-month trajectory",
                    "tags": ["Students"],
                    "parameters": [
                        {"name": "student_id", "in": "path", "required": True, "schema": {"type": "string"}},
                        {"name": "career",     "in": "path", "required": True, "schema": {"type": "string"}},
                        {
                            "name": "velocity",
                            "in": "query",
                            "required": False,
                            "schema": {"type": "number", "default": 0.03, "minimum": 0.01, "maximum": 0.10},
                            "description": "Expected readiness gain per month (fraction)"
                        }
                    ],
                    "responses": {
                        "200": {"description": "Current readiness, milestones, and monthly trajectory"},
                        "404": {"description": "Student or career not found"}
                    }
                }
            },
            "/api/students/{student_id}/roadmap/{career}": {
                "get": {
                    "summary": "Personalised learning roadmap",
                    "tags": ["Students"],
                    "parameters": [
                        {"name": "student_id", "in": "path", "required": True, "schema": {"type": "string"}},
                        {"name": "career",     "in": "path", "required": True, "schema": {"type": "string"}}
                    ],
                    "responses": {
                        "200": {"description": "Phased roadmap with time estimates and skill clusters"},
                        "404": {"description": "Student or career not found"}
                    }
                }
            },
            "/api/students/{student_id}/progress/{career}": {
                "get": {
                    "summary": "Progress history and trend",
                    "tags": ["Students"],
                    "parameters": [
                        {"name": "student_id", "in": "path", "required": True, "schema": {"type": "string"}},
                        {"name": "career",     "in": "path", "required": True, "schema": {"type": "string"}}
                    ],
                    "responses": {
                        "200": {"description": "Readiness snapshots with trend (improving/declining/stable)"},
                        "404": {"description": "Student or career not found"}
                    }
                }
            },
            "/api/programs/compare": {
                "get": {
                    "summary": "Multi-dimensional program comparison",
                    "tags": ["Programs"],
                    "parameters": [
                        {
                            "name": "programs",
                            "in": "query",
                            "required": True,
                            "schema": {"type": "string"},
                            "description": "Comma-separated program_university keys"
                        },
                        {
                            "name": "career",
                            "in": "query",
                            "required": True,
                            "schema": {"type": "string"},
                            "description": "Target career name (case-insensitive)"
                        },
                        {
                            "name": "dimensions",
                            "in": "query",
                            "required": False,
                            "schema": {"type": "string", "default": "alignment,employability,roi,research,network,facilities"},
                            "description": "Comma-separated dimension names"
                        }
                    ],
                    "responses": {
                        "200": {"description": "Programs ranked by overall score across requested dimensions"},
                        "400": {"description": "Missing required parameters"},
                        "404": {"description": "Career or programs not found"}
                    }
                }
            },
            "/api/market-intelligence/{career}": {
                "get": {
                    "summary": "Job market data for a career",
                    "tags": ["Market Intelligence"],
                    "parameters": [
                        {
                            "name": "career",
                            "in": "path",
                            "required": True,
                            "schema": {"type": "string"},
                            "description": "Career name (case-insensitive)"
                        },
                        {
                            "name": "region",
                            "in": "query",
                            "required": False,
                            "schema": {"type": "string", "default": "Kenya",
                                       "enum": ["Kenya", "Uganda", "Tanzania", "Rwanda"]},
                            "description": "East African region"
                        }
                    ],
                    "responses": {
                        "200": {"description": "Salary, demand, employers, and regional comparison"},
                        "404": {"description": "Career or region not found"}
                    }
                }
            },
            "/api/assessments/{assessment_id}/submit": {
                "post": {
                    "summary": "Submit assessment results and update student profile",
                    "tags": ["Assessments"],
                    "parameters": [{
                        "name": "assessment_id",
                        "in": "path",
                        "required": True,
                        "schema": {"type": "string"}
                    }],
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "required": ["student_id", "career", "skill_scores"],
                                    "properties": {
                                        "student_id":   {"type": "string"},
                                        "career":       {"type": "string"},
                                        "skill_scores": {"type": "object", "description": "skill → score (0–1)"}
                                    }
                                },
                                "example": {
                                    "student_id":   "stu_001",
                                    "career":       "data scientist",
                                    "skill_scores": {"python": 0.85, "deep_learning": 0.6}
                                }
                            }
                        }
                    },
                    "responses": {
                        "200": {"description": "Updated gap analysis and confirmation of profile update"},
                        "400": {"description": "Missing or invalid fields"},
                        "404": {"description": "Student or career not found"}
                    }
                }
            }
        }
    }
    return jsonify(spec)


_SWAGGER_HTML = """<!DOCTYPE html>
<html>
<head>
  <title>PathForge API Docs</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>
  SwaggerUIBundle({
    url: "/openapi.json",
    dom_id: "#swagger-ui",
    presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
    layout: "BaseLayout",
    deepLinking: true
  });
</script>
</body>
</html>"""


@app.route("/api/careers/<path:career_name>/skills", methods=["GET"])
def career_skills(career_name: str):
    """
    Return the skill profile for a career, split into mandatory (top N by weight)
    and additional (remaining) skills.

    Query params:
      top_n (int, default 5, max 15) — number of mandatory skills to return
    """
    canonical = career_name_map.get(career_name.lower())
    if not canonical:
        return jsonify({"status": "error", "message": f"Career '{career_name}' not found"}), 404

    top_n = min(int(request.args.get("top_n", 5)), 15)

    row = career_vector_matrix.loc[canonical]
    # Keep only skills with non-zero weight, sort by weight descending
    skills_sorted = (
        row[row > 0]
        .sort_values(ascending=False)
        .items()
    )

    mandatory, additional = [], []
    for i, (skill, weight) in enumerate(skills_sorted):
        entry = {
            "skill":  skill,
            "label":  skill.replace("_", " ").title(),
            "weight": round(float(weight), 4),
        }
        if i < top_n:
            mandatory.append(entry)
        else:
            additional.append(entry)

    return jsonify({
        "career":           canonical,
        "mandatory_skills": mandatory,
        "additional_skills": additional,
    })


_ONBOARD_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>PathForge — Career Onboarding</title>
<style>
  :root {
    --brand:   #2563eb;
    --brand-d: #1d4ed8;
    --accent:  #7c3aed;
    --bg:      #f8fafc;
    --card:    #ffffff;
    --text:    #0f172a;
    --muted:   #64748b;
    --border:  #e2e8f0;
    --red:     #ef4444;
    --orange:  #f97316;
    --yellow:  #eab308;
    --teal:    #0d9488;
    --green:   #16a34a;
    --radius:  12px;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, sans-serif; background: var(--bg);
         color: var(--text); min-height: 100vh; display: flex; flex-direction: column; align-items: center; }

  /* ── Progress bar ── */
  .progress-wrap { width: 100%; max-width: 680px; padding: 24px 24px 0; }
  .progress-steps { display: flex; gap: 6px; align-items: center; }
  .step-dot { flex: 1; height: 6px; border-radius: 3px; background: var(--border); transition: background .3s; }
  .step-dot.done { background: var(--brand); }
  .step-dot.active { background: var(--accent); }
  .step-label { font-size: 12px; color: var(--muted); margin-top: 8px; }

  /* ── Card ── */
  .card { background: var(--card); border-radius: var(--radius); border: 1px solid var(--border);
          box-shadow: 0 1px 3px rgba(0,0,0,.06); padding: 32px; width: 100%;
          max-width: 680px; margin: 24px; }
  h1 { font-size: 22px; font-weight: 700; margin-bottom: 6px; }
  h2 { font-size: 18px; font-weight: 600; margin-bottom: 16px; }
  p.sub { color: var(--muted); font-size: 14px; margin-bottom: 24px; }

  /* ── Form elements ── */
  label { font-size: 14px; font-weight: 500; display: block; margin-bottom: 6px; }
  input[type=text] { width: 100%; padding: 10px 14px; border: 1px solid var(--border);
                     border-radius: 8px; font-size: 15px; outline: none; transition: border .2s; }
  input[type=text]:focus { border-color: var(--brand); }

  /* ── Region cards ── */
  .region-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 12px; }
  .region-card { padding: 16px; border: 2px solid var(--border); border-radius: var(--radius);
                 cursor: pointer; text-align: center; transition: all .2s; }
  .region-card:hover { border-color: var(--brand); background: #eff6ff; }
  .region-card.selected { border-color: var(--brand); background: #eff6ff; font-weight: 600; }
  .region-flag { font-size: 28px; display: block; margin-bottom: 6px; }

  /* ── Career grid ── */
  .sector-label { font-size: 11px; font-weight: 700; letter-spacing: .08em;
                  text-transform: uppercase; color: var(--muted); margin: 20px 0 8px; }
  .career-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .career-btn { padding: 12px 14px; border: 2px solid var(--border); border-radius: 8px;
                cursor: pointer; font-size: 14px; background: var(--card); text-align: left;
                transition: all .2s; }
  .career-btn:hover { border-color: var(--brand); background: #eff6ff; }
  .career-btn.selected { border-color: var(--accent); background: #f5f3ff; font-weight: 600; }

  /* ── Skill sliders ── */
  .skill-row { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
  .skill-name { flex: 0 0 180px; font-size: 14px; }
  .skill-name .badge { font-size: 10px; font-weight: 700; background: #fee2e2; color: #b91c1c;
                       padding: 2px 6px; border-radius: 99px; margin-left: 6px; }
  input[type=range] { flex: 1; accent-color: var(--brand); }
  .skill-val { flex: 0 0 36px; font-size: 14px; font-weight: 600; color: var(--brand); text-align: right; }

  /* ── Add skill controls ── */
  .add-row { display: flex; gap: 10px; margin-top: 12px; }
  .add-row select { flex: 1; padding: 9px 12px; border: 1px solid var(--border);
                    border-radius: 8px; font-size: 14px; background: var(--card); }
  .add-row button { padding: 9px 18px; background: var(--brand); color: #fff;
                    border: none; border-radius: 8px; cursor: pointer; font-size: 14px; }
  .add-row button:hover { background: var(--brand-d); }
  .section-divider { display: flex; align-items: center; gap: 10px; margin: 20px 0 16px;
                     color: var(--muted); font-size: 12px; font-weight: 600; text-transform: uppercase;
                     letter-spacing: .06em; }
  .section-divider::before, .section-divider::after { content: ""; flex: 1; height: 1px;
                                                       background: var(--border); }
  .cross-field-picker { display: flex; gap: 10px; align-items: center; }
  .cross-field-picker select { flex: 1; padding: 9px 12px; border: 1px solid var(--border);
                                border-radius: 8px; font-size: 14px; background: var(--card); }
  .chip-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
  .chip { padding: 6px 14px; border: 1.5px solid var(--border); border-radius: 99px;
          font-size: 13px; cursor: pointer; background: var(--card); transition: all .15s;
          user-select: none; }
  .chip:hover { border-color: var(--brand); color: var(--brand); }
  .chip.added { border-color: var(--accent); background: #f5f3ff; color: var(--accent);
                font-weight: 600; }
  .chip.added::before { content: "✓ "; }
  .skills-section-title { font-size: 13px; font-weight: 600; color: var(--muted);
                           margin: 16px 0 8px; }

  /* ── Scorecard ── */
  .score-bar-wrap { margin-bottom: 14px; }
  .score-bar-label { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 4px; }
  .score-bar-track { height: 10px; background: var(--border); border-radius: 5px; overflow: hidden; }
  .score-bar-fill { height: 100%; border-radius: 5px; transition: width .6s; }
  .grade-tag { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 99px; color: #fff; }
  .readiness-circle { text-align: center; margin: 24px 0; }
  .readiness-circle .big { font-size: 52px; font-weight: 800; color: var(--brand); }
  .readiness-circle .sub { font-size: 14px; color: var(--muted); }

  /* ── Result cards ── */
  .result-card { border: 1px solid var(--border); border-radius: var(--radius);
                 padding: 18px 20px; margin-bottom: 14px; }
  .result-card h3 { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
  .result-meta { display: flex; gap: 16px; font-size: 13px; color: var(--muted); margin-top: 6px; flex-wrap: wrap; }
  .result-meta span { display: flex; align-items: center; gap: 4px; }
  .sector-badge { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 99px;
                  background: #dbeafe; color: #1d4ed8; }
  .sector-badge.eng { background: #dcfce7; color: #15803d; }
  .sector-badge.biz { background: #fef3c7; color: #b45309; }
  .match-pct { font-size: 20px; font-weight: 800; color: var(--brand); margin-bottom: 2px; }

  /* ── Buttons ── */
  .btn { display: inline-block; padding: 12px 28px; background: var(--brand); color: #fff;
         border: none; border-radius: 8px; cursor: pointer; font-size: 15px; font-weight: 600;
         transition: background .2s; }
  .btn:hover { background: var(--brand-d); }
  .btn-ghost { background: transparent; border: 2px solid var(--border); color: var(--text); }
  .btn-ghost:hover { border-color: var(--brand); background: #eff6ff; }
  .btn-row { display: flex; gap: 12px; margin-top: 24px; justify-content: flex-end; }

  .loading { text-align: center; padding: 40px; color: var(--muted); }
  .error-msg { background: #fee2e2; border: 1px solid #fca5a5; border-radius: 8px;
               padding: 12px 16px; font-size: 14px; color: #b91c1c; margin-top: 12px; }

  /* ── CTA ── */
  .cta-box { background: linear-gradient(135deg, #eff6ff, #f5f3ff); border-radius: var(--radius);
             padding: 24px; text-align: center; margin-top: 8px; }
  .cta-box h3 { font-size: 16px; margin-bottom: 8px; }
  .cta-box p { font-size: 13px; color: var(--muted); margin-bottom: 16px; }
</style>
</head>
<body>

<div class="progress-wrap">
  <div class="progress-steps" id="progress-dots"></div>
  <div class="step-label" id="step-label"></div>
</div>

<div id="app"></div>

<script>
const STEPS = ["Welcome", "Career", "Skills", "Scorecard", "Results"];
const REGIONS = [
  { name: "Kenya",    flag: "🇰🇪" },
  { name: "Uganda",   flag: "🇺🇬" },
  { name: "Tanzania", flag: "🇹🇿" },
  { name: "Rwanda",   flag: "🇷🇼" },
];

const state = {
  step: 1,
  name: "",
  region: "",
  career: "",
  skills: {},              // skill_name → 0.0–1.0
  careerList: [],          // [{career_name, sector}]
  mandatorySkills: [],     // [{skill, label, weight}]  — top-5 of target career
  additionalSkills: [],    // [{skill, label, weight}]  — remaining skills of target career
  addedExtra: [],          // skills added by user (from any source)
  crossField: "",          // career selected in the "other disciplines" picker
  crossFieldSkills: [],    // skills fetched for crossField
  gapResult: null,
  recommendResult: null,
  marketData: {},          // career → flat market response object
};

// ── Utilities ─────────────────────────────────────────────────────────────────

function gradeInfo(v) {
  if (v < 0.2) return { label: "Beginner",      color: "var(--red)" };
  if (v < 0.4) return { label: "Developing",     color: "var(--orange)" };
  if (v < 0.6) return { label: "Intermediate",   color: "var(--yellow)" };
  if (v < 0.8) return { label: "Advanced",       color: "var(--teal)" };
  return              { label: "Expert",          color: "var(--green)" };
}

function sectorBadgeClass(sector) {
  if (!sector) return "";
  const s = sector.toLowerCase();
  if (s.includes("engineer")) return "eng";
  if (s.includes("business") || s.includes("finance")) return "biz";
  return "";
}

function fmt(n) { return n ? n.toLocaleString() : "—"; }

function renderProgress() {
  const dots = document.getElementById("progress-dots");
  const lbl  = document.getElementById("step-label");
  dots.innerHTML = STEPS.map((_, i) => {
    const cls = i + 1 < state.step ? "done" : i + 1 === state.step ? "active" : "";
    return `<div class="step-dot ${cls}"></div>`;
  }).join("");
  lbl.textContent = `Step ${state.step} of ${STEPS.length} — ${STEPS[state.step - 1]}`;
}

function render(html) {
  document.getElementById("app").innerHTML = html;
  renderProgress();
}

function showError(msg) {
  const el = document.createElement("div");
  el.className = "error-msg";
  el.textContent = "⚠ " + msg;
  document.getElementById("app").appendChild(el);
}

async function api(method, path, body) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(path, opts);
  return r.json();
}

// ── Step 1 — Welcome ──────────────────────────────────────────────────────────

function renderStep1() {
  render(`
    <div class="card">
      <h1>👋 Welcome to PathForge</h1>
      <p class="sub">Let's map your skills to the best career and university programme in East Africa. It takes about 2 minutes.</p>

      <label for="nameInput">Your name</label>
      <input type="text" id="nameInput" placeholder="e.g. Alice Nakato" value="${state.name}" autocomplete="off">

      <div style="margin-top:20px">
        <label>Your region</label>
        <div class="region-grid">
          ${REGIONS.map(r => `
            <div class="region-card ${state.region === r.name ? "selected" : ""}"
                 onclick="pickRegion('${r.name}')">
              <span class="region-flag">${r.flag}</span>
              ${r.name}
            </div>`).join("")}
        </div>
      </div>

      <div class="btn-row">
        <button class="btn" onclick="submitStep1()">Next →</button>
      </div>
      <div id="err1"></div>
    </div>
  `);
}

function pickRegion(r) {
  state.region = r;
  document.querySelectorAll(".region-card").forEach(el => el.classList.remove("selected"));
  event.currentTarget.classList.add("selected");
}

async function submitStep1() {
  state.name = document.getElementById("nameInput").value.trim();
  if (!state.name) { document.getElementById("err1").innerHTML = '<div class="error-msg">Please enter your name.</div>'; return; }
  if (!state.region) { document.getElementById("err1").innerHTML = '<div class="error-msg">Please choose a region.</div>'; return; }

  // Load career list while transitioning
  if (state.careerList.length === 0) {
    const data = await api("GET", "/careers");
    state.careerList = data.careers || [];
  }
  state.step = 2;
  renderStep2();
}

// ── Step 2 — Career Selection ─────────────────────────────────────────────────

function renderStep2() {
  // Group by sector (API returns career_name field)
  const sectors = {};
  (state.careerList).forEach(c => {
    const sec = c.sector || "Other";
    if (!sectors[sec]) sectors[sec] = [];
    sectors[sec].push(c);
  });

  const sectorsHtml = Object.entries(sectors).map(([sec, careers]) => `
    <div class="sector-label">${sec}</div>
    <div class="career-grid">
      ${careers.map(c => `
        <button class="career-btn ${state.career === c.career_name ? "selected" : ""}"
                onclick="pickCareer('${c.career_name.replace(/'/g, "\\'")}')">
          ${c.career_name}
        </button>`).join("")}
    </div>
  `).join("");

  render(`
    <div class="card">
      <h2>Which career are you targeting?</h2>
      <p class="sub">Select the profession that interests you most.</p>
      ${sectorsHtml}
      <div class="btn-row">
        <button class="btn btn-ghost" onclick="goBack(1)">← Back</button>
        <button class="btn" onclick="submitStep2()">Next →</button>
      </div>
      <div id="err2"></div>
    </div>
  `);
}

async function pickCareer(c) {
  state.career = c;
  document.querySelectorAll(".career-btn").forEach(el => el.classList.remove("selected"));
  event.currentTarget.classList.add("selected");
}

async function submitStep2() {
  if (!state.career) { document.getElementById("err2").innerHTML = '<div class="error-msg">Please choose a career.</div>'; return; }

  render('<div class="card"><div class="loading">Loading skills for ' + state.career + '…</div></div>');
  renderProgress();

  const data = await api("GET", `/api/careers/${encodeURIComponent(state.career)}/skills?top_n=5`);
  if (data.status === "error") { showError(data.message); return; }

  state.mandatorySkills  = data.mandatory_skills  || [];
  state.additionalSkills = data.additional_skills || [];
  state.addedExtra = [];

  // Initialise mandatory skills to 5/10 = 0.5 if not already set
  state.mandatorySkills.forEach(s => {
    if (!(s.skill in state.skills)) state.skills[s.skill] = 0.5;
  });

  state.step = 3;
  renderStep3();
}

// ── Step 3 — Skill Grading ────────────────────────────────────────────────────

function addedSkillKeys() {
  return new Set([
    ...state.mandatorySkills.map(s => s.skill),
    ...state.addedExtra.map(s => s.skill),
  ]);
}

function sliderRow(s, isMandatory) {
  const val = state.skills[s.skill] ?? 0.5;
  return `
    <div class="skill-row" id="row_${s.skill}">
      <div class="skill-name">
        ${s.label}
        ${isMandatory ? '<span class="badge">Required</span>' : ""}
      </div>
      <input type="range" min="0" max="10" step="1"
             value="${Math.round(val * 10)}"
             oninput="updateSkill('${s.skill}', this.value); document.getElementById('v_${s.skill}').textContent = this.value + '/10'">
      <div class="skill-val" id="v_${s.skill}">${Math.round(val * 10)}/10</div>
    </div>`;
}

function renderStep3() {
  const ratedKeys = addedSkillKeys();

  // Sliders: mandatory first, then extras
  const mandatorySliders = state.mandatorySkills.map(s => sliderRow(s, true)).join("");
  const extraSliders = state.addedExtra.length > 0
    ? `<div class="skills-section-title">Your added skills</div>` +
      state.addedExtra.map(s => sliderRow(s, false)).join("")
    : "";

  // Same-career additional skills dropdown
  const sameCareerOptions = state.additionalSkills
    .filter(s => !ratedKeys.has(s.skill))
    .map(s => `<option value="${s.skill}" data-label="${s.label}">${s.label}</option>`)
    .join("");
  const sameCareerDropdown = sameCareerOptions ? `
    <div class="skills-section-title">More ${state.career} skills</div>
    <div class="add-row">
      <select id="extraSkillSelect">
        <option value="">— Pick a skill —</option>
        ${sameCareerOptions}
      </select>
      <button onclick="addExtraSkill()">Add</button>
    </div>` : "";

  // Cross-discipline career picker
  const sectorMap = {};
  state.careerList.forEach(c => {
    const sec = c.sector || "Other";
    if (!sectorMap[sec]) sectorMap[sec] = [];
    sectorMap[sec].push(c.career_name);
  });
  const crossCareerOptions = Object.entries(sectorMap).map(([sec, names]) => `
    <optgroup label="${sec}">
      ${names.filter(n => n !== state.career)
             .map(n => `<option value="${n}"${state.crossField === n ? " selected" : ""}>${n}</option>`)
             .join("")}
    </optgroup>`).join("");

  // Cross-discipline skill chips
  const crossChips = state.crossFieldSkills.length > 0 ? `
    <div class="chip-grid">
      ${state.crossFieldSkills
          .filter(s => !ratedKeys.has(s.skill))
          .map(s => `<div class="chip" id="chip_${s.skill}"
                          onclick="toggleCrossSkill('${s.skill}', '${s.label.replace(/'/g,"\\'")}')">
                      ${s.label}
                    </div>`)
          .join("")}
    </div>
    ${state.crossFieldSkills.every(s => ratedKeys.has(s.skill))
        ? '<p style="font-size:13px;color:var(--muted);margin-top:8px">All skills from this field already added.</p>'
        : ""}
  ` : (state.crossField ? '<div class="loading" style="padding:16px">Loading skills…</div>' : "");

  render(`
    <div class="card">
      <h2>Rate your skills for <em>${state.career}</em></h2>
      <p class="sub">Adjust the sliders for your target career, then add any extra skills you have from other fields — the more you add, the better your matches.</p>

      ${mandatorySliders}
      ${extraSliders}

      <div class="section-divider">Add more skills</div>

      ${sameCareerDropdown}

      <div class="skills-section-title" style="margin-top:16px">Skills from other disciplines</div>
      <div class="cross-field-picker">
        <select id="crossFieldSelect" onchange="loadCrossField(this.value)">
          <option value="">— Browse another career field —</option>
          ${crossCareerOptions}
        </select>
      </div>
      ${crossChips}

      <div class="btn-row">
        <button class="btn btn-ghost" onclick="goBack(2)">← Back</button>
        <button class="btn" onclick="submitStep3()">See Scorecard →</button>
      </div>
    </div>
  `);
}

function updateSkill(skill, val) {
  state.skills[skill] = parseInt(val) / 10;
}

function addExtraSkill() {
  const sel = document.getElementById("extraSkillSelect");
  const skill = sel.value;
  if (!skill) return;
  const label = sel.options[sel.selectedIndex].dataset.label;
  const found = state.additionalSkills.find(s => s.skill === skill);
  state.addedExtra.push(found || { skill, label, weight: 0 });
  if (!(skill in state.skills)) state.skills[skill] = 0.5;
  renderStep3();
}

async function loadCrossField(careerName) {
  if (!careerName) { state.crossField = ""; state.crossFieldSkills = []; renderStep3(); return; }
  state.crossField = careerName;
  state.crossFieldSkills = [];
  renderStep3();  // show spinner
  const data = await api("GET", `/api/careers/${encodeURIComponent(careerName)}/skills?top_n=100`);
  const all = [...(data.mandatory_skills || []), ...(data.additional_skills || [])];
  state.crossFieldSkills = all;
  renderStep3();
}

function toggleCrossSkill(skill, label) {
  const alreadyAdded = state.addedExtra.some(s => s.skill === skill);
  if (alreadyAdded) {
    // Remove from extras
    state.addedExtra = state.addedExtra.filter(s => s.skill !== skill);
    delete state.skills[skill];
  } else {
    state.addedExtra.push({ skill, label, weight: 0 });
    if (!(skill in state.skills)) state.skills[skill] = 0.5;
  }
  renderStep3();
}

async function submitStep3() {
  render('<div class="card"><div class="loading">Calculating your readiness score…</div></div>');
  renderProgress();

  const gapData = await api("POST", "/api/gap", {
    career: state.career,
    student_profile: state.skills,
  });
  if (gapData.status === "error") { showError(gapData.message); return; }
  state.gapResult = gapData;

  state.step = 4;
  renderStep4();
}

// ── Step 4 — Scorecard ────────────────────────────────────────────────────────

function renderStep4() {
  const gap = state.gapResult;
  const readinessPct = gap.readiness_percentage ?? Math.round((gap.overall_readiness ?? 0) * 100);
  const level = gap.readiness_label || "";

  const allSliders = [...state.mandatorySkills, ...state.addedExtra];
  const barsHtml = allSliders.map(s => {
    const val   = state.skills[s.skill] ?? 0;
    const grade = gradeInfo(val);
    const pct   = Math.round(val * 100);
    return `
      <div class="score-bar-wrap">
        <div class="score-bar-label">
          <span>${s.label}</span>
          <span>
            <span class="grade-tag" style="background:${grade.color}">${grade.label}</span>
            &nbsp;${Math.round(val * 10)}/10
          </span>
        </div>
        <div class="score-bar-track">
          <div class="score-bar-fill" style="width:${pct}%;background:${grade.color}"></div>
        </div>
      </div>`;
  }).join("");

  const gradeOverall = gradeInfo(readinessPct / 100);

  render(`
    <div class="card">
      <h2>Your Skill Scorecard</h2>
      <p class="sub">Here's how your skills compare to what ${state.career} requires.</p>

      <div class="readiness-circle">
        <div class="big">${readinessPct}%</div>
        <div class="sub">${level || gradeOverall.label} Readiness for ${state.career}</div>
      </div>

      ${barsHtml}

      <div class="btn-row">
        <button class="btn btn-ghost" onclick="goBack(3)">← Back</button>
        <button class="btn" onclick="submitStep4()">Find Matching Careers →</button>
      </div>
    </div>
  `);
}

async function submitStep4() {
  render('<div class="card"><div class="loading">Finding your best career matches…</div></div>');
  renderProgress();

  const recData = await api("POST", "/api/recommend", {
    student_profile: state.skills,
    top_n: 3,
    region: state.region,
  });
  if (recData.status === "error") { showError(recData.message); return; }
  state.recommendResult = recData;

  // Fetch market data for each recommended career in parallel
  // API returns top_careers (not recommendations)
  const careers = (recData.top_careers || []).map(r => r.career);
  const marketFetches = careers.map(async c => {
    const m = await api("GET", `/api/market-intelligence/${encodeURIComponent(c)}?region=${encodeURIComponent(state.region)}`);
    state.marketData[c] = m;  // response is flat (no market_data nesting)
  });
  await Promise.all(marketFetches);

  state.step = 5;
  renderStep5();
}

// ── Step 5 — Results ──────────────────────────────────────────────────────────

function renderStep5() {
  // API returns top_careers; each has career, sector, readiness_percentage, top_programs
  const recs = state.recommendResult?.top_careers || [];

  const cardsHtml = recs.map((r, idx) => {
    // Market data is a flat response object (not nested in market_data)
    const market   = state.marketData[r.career] || {};
    const salMin   = market.salary_range?.min;
    const salMax   = market.salary_range?.max;
    const salStr   = salMin ? `KES ${fmt(salMin)}–${fmt(salMax)}/mo` : "";
    const positions = market.open_positions ? `${fmt(market.open_positions)} open roles` : "";
    const trend    = market.growth_trend   ? market.growth_trend : "";
    const sector   = r.sector || "";
    const badgeCls = sectorBadgeClass(sector);
    const matchPct = r.readiness_percentage ?? 0;

    // Show top 2 programs filtered to user's region (from recommend response)
    const regionProgs = (r.top_programs || [])
      .filter(p => !state.region || p.region === state.region)
      .slice(0, 2);
    const allProgs    = regionProgs.length ? regionProgs : (r.top_programs || []).slice(0, 2);
    const progsHtml   = allProgs.map(p =>
      `<span>🎓 ${p.program_name} · ${p.university}</span>`
    ).join("");

    return `
      <div class="result-card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
          <div>
            <div class="match-pct">${Math.round(matchPct)}% Readiness</div>
            <h3>${r.career}</h3>
          </div>
          <span class="sector-badge ${badgeCls}">${sector}</span>
        </div>
        <div class="result-meta" style="margin-top:8px">
          ${salStr    ? `<span>💰 ${salStr}</span>`          : ""}
          ${positions ? `<span>📋 ${positions}</span>`       : ""}
          ${trend     ? `<span>📈 ${trend}</span>`           : ""}
        </div>
        ${progsHtml ? `<div class="result-meta" style="margin-top:6px;flex-direction:column;gap:4px">${progsHtml}</div>` : ""}
      </div>`;
  }).join("");

  const studentId = "pf_" + Date.now();

  render(`
    <div class="card">
      <h2>Your Career Matches, ${state.name}!</h2>
      <p class="sub">Based on your skills and ${state.region} market data — here are your top 3 paths.</p>

      ${cardsHtml || '<p style="color:var(--muted)">No matches found — try adding more skills.</p>'}

      <div class="cta-box">
        <h3>Ready to start your journey?</h3>
        <p>Save your profile and get a personalised learning roadmap with programme recommendations.</p>
        <button class="btn" onclick="saveProfile('${studentId}')">Save My Profile</button>
      </div>

      <div class="btn-row" style="justify-content:flex-start;margin-top:12px">
        <button class="btn btn-ghost" onclick="goBack(4)">← Back</button>
        <button class="btn btn-ghost" onclick="restart()">Start Over</button>
      </div>
      <div id="saveMsg"></div>
    </div>
  `);
}

async function saveProfile(studentId) {
  const res = await api("POST", `/api/students/${studentId}/profile`, {
    name:   state.name,
    region: state.region,
    skills: state.skills,
    target_careers: state.career ? [state.career] : [],
  });
  const el = document.getElementById("saveMsg");
  if (res.status === "success" || res.student_id) {
    el.innerHTML = `<div style="margin-top:12px;padding:10px 14px;background:#dcfce7;border-radius:8px;font-size:13px;color:#15803d">
      ✓ Profile saved! Your ID: <strong>${studentId}</strong></div>`;
  } else {
    el.innerHTML = `<div class="error-msg" style="margin-top:12px">Could not save profile. Please try again.</div>`;
  }
}

// ── Navigation ────────────────────────────────────────────────────────────────

function goBack(toStep) {
  state.step = toStep;
  if      (toStep === 1) renderStep1();
  else if (toStep === 2) renderStep2();
  else if (toStep === 3) renderStep3();
  else if (toStep === 4) renderStep4();
}

function restart() {
  Object.assign(state, {
    step: 1, name: "", region: "", career: "",
    skills: {}, mandatorySkills: [], additionalSkills: [],
    addedExtra: [], gapResult: null, recommendResult: null, marketData: {}
  });
  renderStep1();
}

// ── Boot ──────────────────────────────────────────────────────────────────────
renderStep1();
</script>
</body>
</html>"""


@app.route("/onboard", methods=["GET"])
def onboard():
    """Multi-step student onboarding wizard."""
    return render_template_string(_ONBOARD_HTML)


@app.route("/docs", methods=["GET"])
def docs():
    """Serve Swagger UI."""
    return render_template_string(_SWAGGER_HTML)


# ── ERROR HANDLERS ────────────────────────────────────────────────────────────

@app.errorhandler(404)
def not_found(e):
    return jsonify({"status": "error", "message": "Endpoint not found"}), 404

@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({"status": "error", "message": "Method not allowed"}), 405

@app.errorhandler(500)
def internal_error(e):
    return jsonify({"status": "error", "message": "Internal server error", "detail": str(e)}), 500


# ── ENTRY POINT ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 8000))
    app.run(debug=False, host="0.0.0.0", port=port)
