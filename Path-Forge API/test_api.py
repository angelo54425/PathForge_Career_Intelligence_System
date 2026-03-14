"""
PathForge API — Test Suite
Run this AFTER starting the Flask server with: python app.py
"""

import requests
import json

BASE = "http://localhost:8000"

def pretty(label: str, response):
    print(f"\n{'='*60}")
    print(f"  {label}")
    print(f"  Status: {response.status_code}")
    print('='*60)
    print(json.dumps(response.json(), indent=2))


# ── TEST 1: Health Check ──────────────────────────────────────────────────────
pretty("GET / — Health Check", requests.get(f"{BASE}/"))


# ── TEST 2: List All Careers ──────────────────────────────────────────────────
pretty("GET /careers — All Careers", requests.get(f"{BASE}/careers"))


# ── TEST 3: Careers by Sector ─────────────────────────────────────────────────
pretty(
    "GET /careers/sector/it — IT Sector",
    requests.get(f"{BASE}/careers/sector/it")
)

pretty(
    "GET /careers/sector/business & finance",
    requests.get(f"{BASE}/careers/sector/business & finance")
)

pretty(
    "GET /careers/sector/engineering",
    requests.get(f"{BASE}/careers/sector/engineering")
)


# ── TEST 4: Career Alignment ──────────────────────────────────────────────────
pretty(
    "GET /api/alignment/data scientist — Top 5 Programs (All Regions)",
    requests.get(f"{BASE}/api/alignment/data scientist?top_n=5")
)

pretty(
    "GET /api/alignment/data scientist — Kenya Only",
    requests.get(f"{BASE}/api/alignment/data scientist?region=kenya&top_n=5")
)

pretty(
    "GET /api/alignment/financial analyst — Rwanda Only",
    requests.get(f"{BASE}/api/alignment/financial analyst?region=rwanda&top_n=5")
)


# ── TEST 5: Skill Gap Analysis ────────────────────────────────────────────────

# Beginner student
pretty(
    "POST /api/gap — Beginner Student → Data Scientist",
    requests.post(f"{BASE}/api/gap", json={
        "career": "data scientist",
        "student_profile": {
            "python":                    0.40,
            "sql":                       0.35,
            "machine_learning_fundamentals": 0.20,
            "statistics":                0.30,
            "data_visualization":        0.25,
            "communication":             0.55
        }
    })
)

# Intermediate student
pretty(
    "POST /api/gap — Intermediate Student → data analyst",
    requests.post(f"{BASE}/api/gap", json={
        "career": "data analyst",
        "student_profile": {
            "python":             0.70,
            "sql":                0.65,
            "statistics":         0.60,
            "data_visualization": 0.75,
            "excel":              0.80,
            "communication":      0.70,
            "critical_thinking":  0.65
        }
    })
)

# Advanced student
pretty(
    "POST /api/gap — Advanced Student → ai engineer",
    requests.post(f"{BASE}/api/gap", json={
        "career": "ai engineer",
        "student_profile": {
            "python":                        0.90,
            "deep_learning":                 0.85,
            "machine_learning_fundamentals": 0.88,
            "nlp":                           0.80,
            "tensorflow":                    0.82,
            "model_deployment":              0.75,
            "communication":                 0.85,
            "cloud_computing":               0.70
        }
    })
)


# ── TEST 6: Career Similarity ─────────────────────────────────────────────────
pretty(
    "GET /api/similarity/data scientist — Top 5",
    requests.get(f"{BASE}/api/similarity/data scientist?top_n=5")
)

pretty(
    "GET /api/similarity/financial analyst — Top 5",
    requests.get(f"{BASE}/api/similarity/financial analyst?top_n=5")
)

pretty(
    "GET /api/similarity/civil engineering — Top 5",
    requests.get(f"{BASE}/api/similarity/civil engineering?top_n=5")
)


# ── TEST 7: Error Handling ────────────────────────────────────────────────────
pretty(
    "GET /api/alignment/unknown career — 404 Test",
    requests.get(f"{BASE}/api/alignment/unknown career")
)

pretty(
    "POST /api/gap — Missing career field — 400 Test",
    requests.post(f"{BASE}/api/gap", json={
        "student_profile": {"python": 0.8}
    })
)

pretty(
    "POST /api/gap — Empty profile — 400 Test",
    requests.post(f"{BASE}/api/gap", json={
        "career": "data scientist",
        "student_profile": {}
    })
)


# ── TEST 8: Career Recommendation (new endpoint) ──────────────────────────────

# Beginner — mostly general skills
pretty(
    "POST /api/recommend — Beginner general skills → top 3 careers",
    requests.post(f"{BASE}/api/recommend", json={
        "student_profile": {
            "python":                         0.40,
            "sql":                            0.35,
            "statistics":                     0.30,
            "data_visualization":             0.25,
            "communication":                  0.55,
            "problem_solving":                0.60,
            "critical_thinking":              0.55,
            "machine_learning_fundamentals":  0.20
        },
        "top_n": 3
    })
)

# IT-focused student — asking for Uganda programs only
pretty(
    "POST /api/recommend — IT student, Uganda programs only",
    requests.post(f"{BASE}/api/recommend", json={
        "student_profile": {
            "python":               0.80,
            "sql":                  0.75,
            "machine_learning":     0.65,
            "deep_learning":        0.60,
            "tensorflow":           0.55,
            "cloud_computing":      0.50,
            "docker":               0.45,
            "version_control_git":  0.80,
            "linux_command_line":   0.70,
            "communication":        0.75
        },
        "top_n": 3,
        "region": "Uganda"
    })
)

# Finance-oriented student
pretty(
    "POST /api/recommend — Finance student → top 3",
    requests.post(f"{BASE}/api/recommend", json={
        "student_profile": {
            "financial_analysis":    0.75,
            "excel_advanced":        0.80,
            "financial_modeling":    0.65,
            "forecasting":           0.60,
            "statistics":            0.70,
            "reporting":             0.70,
            "communication":         0.80,
            "stakeholder_management": 0.65
        },
        "top_n": 3
    })
)

# Engineering-oriented student
pretty(
    "POST /api/recommend — Engineering student → top 3, Kenya",
    requests.post(f"{BASE}/api/recommend", json={
        "student_profile": {
            "mathematics_advanced":  0.80,
            "physics_applied":       0.75,
            "autocad":               0.70,
            "matlab":                0.65,
            "project_management":    0.60,
            "safety_standards":      0.55,
            "technical_drawing":     0.70,
            "simulation_software":   0.60
        },
        "top_n": 3,
        "region": "Kenya"
    })
)

# ── Error cases ───────────────────────────────────────────────────────────────
pretty(
    "POST /api/recommend — Missing student_profile → 400",
    requests.post(f"{BASE}/api/recommend", json={"top_n": 3})
)

pretty(
    "POST /api/recommend — Empty student_profile → 400",
    requests.post(f"{BASE}/api/recommend", json={"student_profile": {}})
)

print("\n✅  Core tests complete")


# ══════════════════════════════════════════════════════════════════════════════
# NEW ENDPOINT TESTS — Student Management, Roadmap, Market, Assessments
# ══════════════════════════════════════════════════════════════════════════════

STUDENT_ID = "stu_test_001"   # used throughout student route tests
CAREER     = "data scientist"


# ── TEST 9: Create Student Profile ───────────────────────────────────────────
pretty(
    "POST /api/students/stu_test_001/profile — Create profile",
    requests.post(f"{BASE}/api/students/{STUDENT_ID}/profile", json={
        "name":           "Alice Nakato",
        "email":          "alice@test.com",
        "skills": {
            "python":            0.70,
            "sql":               0.60,
            "machine_learning":  0.35,
            "statistics":        0.50,
            "communication":     0.75,
        },
        "region":         "Uganda",
        "target_careers": ["Data Scientist"]
    })
)


# ── TEST 10: Get Student Profile ──────────────────────────────────────────────
pretty(
    "GET /api/students/stu_test_001/profile — Read profile",
    requests.get(f"{BASE}/api/students/{STUDENT_ID}/profile")
)


# ── TEST 11: Update Student Profile (merge skills) ────────────────────────────
pretty(
    "POST /api/students/stu_test_001/profile — Update (merge new skills)",
    requests.post(f"{BASE}/api/students/{STUDENT_ID}/profile", json={
        "skills": {
            "deep_learning":     0.25,
            "data_visualization": 0.55,
        }
    })
)


# ── TEST 12: Update Single Skill ──────────────────────────────────────────────
pretty(
    "POST /api/students/stu_test_001/update-skill — Improve python + save snapshot",
    requests.post(f"{BASE}/api/students/{STUDENT_ID}/update-skill", json={
        "skill":       "python",
        "proficiency": 0.85,
        "career":      CAREER
    })
)


# ── TEST 13: Personalised Gap Analysis ───────────────────────────────────────
pretty(
    "GET /api/students/stu_test_001/gaps/data scientist — Personalised gaps",
    requests.get(f"{BASE}/api/students/{STUDENT_ID}/gaps/{CAREER}")
)


# ── TEST 14: Readiness Trajectory ────────────────────────────────────────────
pretty(
    "GET /api/students/stu_test_001/readiness/data scientist — Default velocity (0.03)",
    requests.get(f"{BASE}/api/students/{STUDENT_ID}/readiness/{CAREER}")
)

pretty(
    "GET /api/students/stu_test_001/readiness/data scientist — High velocity (0.06)",
    requests.get(f"{BASE}/api/students/{STUDENT_ID}/readiness/{CAREER}?velocity=0.06")
)


# ── TEST 15: Learning Roadmap ─────────────────────────────────────────────────
pretty(
    "GET /api/students/stu_test_001/roadmap/data scientist — Full learning roadmap",
    requests.get(f"{BASE}/api/students/{STUDENT_ID}/roadmap/{CAREER}")
)


# ── TEST 16: Progress History ─────────────────────────────────────────────────
pretty(
    "GET /api/students/stu_test_001/progress/data scientist — Progress trend",
    requests.get(f"{BASE}/api/students/{STUDENT_ID}/progress/{CAREER}")
)


# ── TEST 17: Market Intelligence ──────────────────────────────────────────────
pretty(
    "GET /api/market-intelligence/data scientist — Kenya (default)",
    requests.get(f"{BASE}/api/market-intelligence/data scientist?region=Kenya")
)

pretty(
    "GET /api/market-intelligence/software engineer — Uganda",
    requests.get(f"{BASE}/api/market-intelligence/software engineer?region=Uganda")
)

pretty(
    "GET /api/market-intelligence/civil engineer — Tanzania",
    requests.get(f"{BASE}/api/market-intelligence/civil engineer?region=Tanzania")
)


# ── TEST 18: Program Comparison ───────────────────────────────────────────────
# First, get program names from the alignment endpoint so we have real program IDs
_align_resp = requests.get(f"{BASE}/api/alignment/data scientist?top_n=3")
if _align_resp.status_code == 200:
    _top_programs = [r["program"] for r in _align_resp.json().get("results", [])]
    if len(_top_programs) >= 2:
        pretty(
            f"GET /api/programs/compare — Top 2 programs for Data Scientist",
            requests.get(
                f"{BASE}/api/programs/compare",
                params={
                    "programs":   ",".join(_top_programs[:2]),
                    "career":     "data scientist",
                    "dimensions": "alignment,employability,roi"
                }
            )
        )

# Full 6-dimension compare with 3 programs
if _align_resp.status_code == 200 and len(_top_programs) >= 3:
    pretty(
        "GET /api/programs/compare — 3 programs, all 6 dimensions",
        requests.get(
            f"{BASE}/api/programs/compare",
            params={
                "programs": ",".join(_top_programs[:3]),
                "career":   "data scientist"
            }
        )
    )


# ── TEST 19: Assessment Submission ───────────────────────────────────────────
pretty(
    "POST /api/assessments/ASSESS_001/submit — Improve skills via assessment",
    requests.post(f"{BASE}/api/assessments/ASSESS_001/submit", json={
        "student_id":   STUDENT_ID,
        "career":       CAREER,
        "skill_scores": {
            "machine_learning":  0.60,
            "statistics":        0.70,
            "data_visualization": 0.65,
        }
    })
)

# Verify progress snapshot was saved
pretty(
    "GET /api/students/stu_test_001/progress/data scientist — After assessment",
    requests.get(f"{BASE}/api/students/{STUDENT_ID}/progress/{CAREER}")
)


# ── TEST 20: Error Cases for New Endpoints ────────────────────────────────────
pretty(
    "GET /api/students/nonexistent_stu/profile — 404 Student not found",
    requests.get(f"{BASE}/api/students/nonexistent_stu/profile")
)

pretty(
    "POST /api/students/stu_test_001/profile — 400 Missing skills on new profile",
    requests.post(f"{BASE}/api/students/new_student_no_skills/profile", json={
        "name": "Bob Odhiambo"
        # missing 'skills'
    })
)

pretty(
    "POST /api/students/stu_test_001/update-skill — 400 Out-of-range proficiency",
    requests.post(f"{BASE}/api/students/{STUDENT_ID}/update-skill", json={
        "skill":       "python",
        "proficiency": 1.5   # invalid
    })
)

pretty(
    "GET /api/students/stu_test_001/gaps/unknown career — 404 Career not found",
    requests.get(f"{BASE}/api/students/{STUDENT_ID}/gaps/unknown career")
)

pretty(
    "GET /api/programs/compare — 400 Missing required params",
    requests.get(f"{BASE}/api/programs/compare?career=data scientist")
    # missing 'programs'
)

pretty(
    "GET /api/market-intelligence/data scientist — 404 Invalid region",
    requests.get(f"{BASE}/api/market-intelligence/data scientist?region=South Africa")
)

pretty(
    "POST /api/assessments/ASSESS_002/submit — 404 Unknown student",
    requests.post(f"{BASE}/api/assessments/ASSESS_002/submit", json={
        "student_id":   "nonexistent_stu",
        "career":       CAREER,
        "skill_scores": {"python": 0.5}
    })
)


print("\n✅  All tests complete (original + new endpoint tests)")
