# PathForge – Career Intelligence for East Africa

## 🌍 Description

**PathForge** is an AI-powered career intelligence platform designed to bridge the gap between university education and labor market demand in East Africa.

The system enables:

- 🎯 Career roadmap generation  
- 📊 Skill gap analysis  
- 🏫 University program alignment comparison  
- 🧪 Interactive project simulations  
- 📈 Career readiness scoring  
- 🧠 Growth mindset reinforcement  

PathForge integrates structured career skill data, university curriculum coverage data, and a weighted alignment engine to provide data-driven academic and career guidance.

### Supported Sectors
- Information Technology
- Business & Finance
- Engineering

### Geographic Focus
- Rwanda
- Kenya
- Uganda
- Tanzania

---

## 🔗 GitHub Repository

https://github.com/angelo54425/PathForge_Career_Intelligence_System

---

# 🚀 Deployment Plan

**Estimated Deployment Time:** 14 Days  
**Preconditions:**
- Figma mockups completed  
- Python analytical notebook finalized  
- career_skills.csv and program_skill_coverage.csv prepared  

---

# 📅 Week 1 – Backend & Data Infrastructure

## 🟢 Day 1–2: Backend Refactoring

- Convert Jupyter notebook logic into modular Python services:
  - `alignment_engine.py`
  - `gap_engine.py`
  - `similarity_engine.py`
  - `project_simulator.py`
- Structure project into:
## 📂 Project Structure

```text
app/
├── main.py
├── routers/
├── services/
├── models/
├── schemas/
└── database.py

- Validate reusable scoring functions

---

## 🟢 Day 3–4: API Development (FastAPI)

Create REST endpoints:

- `POST /alignment`
- `POST /gap`
- `GET /similarity`
- `POST /project-score`

Enable:
- Swagger UI (`/docs`)
- Pydantic schema validation
- Structured JSON responses

---

## 🟢 Day 5: Database Setup

- Configure PostgreSQL
- Create tables:
- careers
- skills
- career_skills
- programs
- program_skill_coverage
- users
- project_results
- Seed initial datasets
- Test queries

---

## 🟢 Day 6–7: Authentication & Testing

- Implement JWT authentication
- Role-based access control:
- Student
- University Admin
- System Admin
- Perform:
- API integration tests
- Data validation tests
- Error handling validation

---

# 📅 Week 2 – Frontend Integration & Cloud Deployment

## 🔵 Day 8–9: Frontend Integration

- Connect dashboard to API
- Implement:
- Career roadmap view
- Skill gap analysis
- University comparison
- Validate API responses in UI

---

## 🔵 Day 10: Project Simulator UI

- Implement multi-step simulation interface
- Connect scoring endpoint
- Display:
- Section score
- Overall readiness classification

---

## 🔵 Day 11–12: End-to-End Testing

- Cross-browser testing
- Role-based access testing
- Performance testing
- Mobile responsiveness validation

---

## 🔵 Day 13: Containerization

### Dockerize Backend

Create `Dockerfile`:

```dockerfile
FROM python:3.10
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

---

## 🔵 Day 14: Cloud Deployment

### Backend Deployment Options

- Render  
- Railway  
- AWS Elastic Beanstalk  
- Google Cloud Run  

### Frontend Deployment Options

- Vercel  
- Netlify  

### Database Options

- Supabase (PostgreSQL)  
- NeonDB  
- AWS RDS  
