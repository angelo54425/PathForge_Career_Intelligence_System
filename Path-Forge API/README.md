# PathForge Career Intelligence — Flask API

## Project Structure
```
pathforge_api/
├── app.py              ← Main Flask application
├── requirements.txt    ← Dependencies
├── test_api.py         ← Ready-to-run test suite
├── README.md           ← This file
└── data/               ← Put your CSV files here
    ├── career_skills.csv
    └── university_programs_skills.csv
```

## Setup (3 steps)

**1. Install dependencies**
```bash
pip install -r requirements.txt
```

**2. Place your data files**
```bash
mkdir data
cp career_skills.csv data/
cp university_programs_skills.csv data/
```

**3. Run the server**
```bash
python app.py
```
Server starts at: `http://localhost:5000`

---

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check + endpoint list |
| GET | `/careers` | All careers with sector info |
| GET | `/careers/sector/<sector>` | Careers filtered by sector |
| GET | `/api/alignment/<career>` | Top university programs for a career |
| POST | `/api/gap` | Student skill gap analysis |
| GET | `/api/similarity/<career>` | Similar careers |

---

## Example Calls

### Career Alignment
```bash
# Top 10 programs for Data Scientist
curl "http://localhost:5000/api/alignment/data scientist"

# Top 5 programs in Kenya
curl "http://localhost:5000/api/alignment/data scientist?region=kenya&top_n=5"
```

### Skill Gap Analysis
```bash
curl -X POST http://localhost:5000/api/gap \
  -H "Content-Type: application/json" \
  -d '{
    "career": "data scientist",
    "student_profile": {
      "python": 0.7,
      "sql": 0.6,
      "machine_learning_fundamentals": 0.5,
      "statistics": 0.65
    }
  }'
```

### Career Similarity
```bash
curl "http://localhost:5000/api/similarity/data scientist?top_n=5"
```

---

## Run All Tests
```bash
# In a second terminal while server is running
python test_api.py
```

---

## Available Sectors
- `it`
- `business & finance`
- `engineering`
