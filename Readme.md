# PathForge — Career Intelligence Platform

PathForge helps East African students forge their ideal career path with AI-powered skill gap analysis, university matching, and personalised learning roadmaps.

The platform covers **26 careers** across IT, Business & Finance, and Engineering, matched against **55 programs** at **22 universities** in Kenya, Uganda, Tanzania, and Rwanda — all scored by a pre-trained ML model (v1.0.0).

---

## Table of Contents

1. [Demo Video & Deployed Link](#demo-video--deployed-link)
2. [Architecture Overview](#architecture-overview)
3. [Tech Stack](#tech-stack)
4. [ML Pipeline & Methodology](#ml-pipeline--methodology)
5. [Project Structure](#project-structure)
6. [Installation & Setup (Step by Step)](#installation--setup-step-by-step)
7. [Seed Data & Test Accounts](#seed-data--test-accounts)
8. [Core Functionalities](#core-functionalities)
9. [API Reference](#api-reference)
10. [Testing Results](#testing-results)
11. [Analysis](#analysis)
12. [Discussion](#discussion)
13. [Recommendations & Future Work](#recommendations--future-work)

---

## Demo Video & Deployed Link

| Resource | Link |
|----------|------|
| Demo Video (5 min) | _[https://drive.google.com/file/d/1LKkgQKoc7gQ-FjkMHV-EwTztVPS1tKao/view?usp=sharing]_ |
| Deployed App | _[https://pathforge.live/]_ |
| Repository | _[https://github.com/angelo54425/PathForge_Career_Intelligence_System]_ |

---

## Architecture Overview

```
┌─────────────────────┐      ┌─────────────────────┐      ┌─────────────────────┐
│   Next.js Frontend  │─────▶│   Express Backend   │─────▶│     PostgreSQL      │
│   (port 3000)       │      │   (port 5000)       │      │     Database        │
│                     │      │                     │      │                     │
│  NextAuth.js v5     │      │  Prisma ORM         │      │  26 careers         │
│  TailwindCSS v4     │      │  JWT + bcrypt        │      │  22 universities    │
│  React 19           │      │  Express 5           │      │  55 programs        │
└─────────────────────┘      └─────────────────────┘      │  1,430 alignments   │
          │                                                │  5 test users       │
          ▼                                                └─────────────────────┘
┌─────────────────────┐      ┌─────────────────────┐
│   Flask ML API      │◀────│   Model Artifacts    │
│   (port 5001)       │      │   (CSV + pickle)     │
│                     │      │                     │
│  Gap analysis       │      │  career_vectors      │
│  Readiness scores   │      │  alignment_matrix    │
│  Roadmap generation │      │  similarity_matrix   │
│  Market intelligence│      │  350 skills          │
└─────────────────────┘      └─────────────────────┘
```

**Data flow**: User takes assessment → skills saved → dashboard fetches gap analysis, university matches, similar careers, market intel → all powered by ML model scores.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Next.js (App Router) | latest (14.x) |
| Frontend | React | latest (19.x) |
| Frontend | TypeScript | 5.9.3 |
| Frontend | TailwindCSS | 4.2.1 |
| Frontend | NextAuth.js | 5.0.0-beta.30 |
| Backend | Express.js | 5.2.1 |
| Backend | Prisma ORM | 6.19.2 |
| Backend | bcryptjs | 3.0.3 |
| Backend | jsonwebtoken (JWT) | 9.0.3 |
| ML API | Flask | 3.0.0 |
| ML API | pandas | 2.1.0 |
| ML API | numpy | 1.26.0 |
| Database | PostgreSQL | 12+ |

---

## ML Pipeline & Methodology

> Full implementation: [`PathForge_Career_Intelligence_System_COMPLETE.ipynb`](PathForge_Career_Intelligence_System_COMPLETE.ipynb)

### Notebook Overview

The Jupyter notebook is the **research-grade analytical engine** that powers every recommendation in PathForge. It processes raw career and university data through a 16-stage pipeline and exports all model artifacts used by the backend APIs.

| Section | Notebook Stage | Purpose |
|---------|---------------|---------|
| 1 | System Initialization | Import dependencies, configure environment, set random seed (42) |
| 2 | Data Loading & Validation | Load CSVs, validate schema, check data quality |
| 3 | Data Cleaning & Skill Normalization | Normalize text, harmonize skill names, build master skill dictionary |
| 4 | Exploratory Data Analysis (EDA) | Skill weight distributions, skills-per-career analysis, program coverage |
| 5 | Career Vectorization | Transform careers into 156-dimensional skill vectors |
| 6 | Program Vectorization | Transform programs into aligned skill vectors |
| 7 | Alignment Scoring Engine | Compute weighted alignment for all 1,430 career-program pairs |
| 8 | Student Profile & Gap Analysis | Skill gap computation, severity classification, readiness scoring |
| 9 | Career Similarity & Transferability | Cosine similarity matrix (24x24), career clustering |
| 10 | Project Simulator Scoring | 5-section project scoring, readiness level classification |
| 11 | Evaluation & Validation | Alignment distribution, correlation analysis |
| 12 | Sensitivity Analysis | Weight variance impact testing |
| 13 | Backend API Simulation | API endpoint prototypes with JSON responses |
| 14 | Demonstrations & Analysis | Cross-sector examples, complete career analyses |
| 15 | System Summary | Recommendations, key findings |
| 16 | Advanced Features | Roadmap generation, progress tracking, market intelligence, model export |

### Data Sources

```
Input Datasets:
├── career_skills.csv (488 rows)
│   ├── career_id, career_sector, career_name
│   ├── skill_name, skill_weight (range: 0.50 – 0.95)
│   └── Multiple skills per career (~15–20 per career)
│
└── university_programs_skills.csv (1,822 rows)
    ├── program_id, program_name, university
    ├── region (Kenya | Uganda | Tanzania | Rwanda)
    ├── skill_name, coverage_score (range: 0.0 – 1.0)
    └── Multiple skills per program (~30–40 per program)
```

### Data Processing Pipeline

```
Raw CSVs
    │
    ▼
[1] Text Normalization
    │   normalize_text() → lowercase, strip whitespace, handle NaN
    │
    ▼
[2] Schema & Quality Validation
    │   Verify columns, data types, ranges (0.5–0.95 for weights, 0–1 for coverage)
    │   Check for missing values (0 found), duplicates
    │
    ▼
[3] Skill Harmonization
    │   Build master skill dictionary (350 skills)
    │   Assign IDs (SK0001, SK0002, …)
    │   Map raw names → normalized names (e.g., machine_learning → Machine Learning)
    │
    ▼
[4] Career Vectorization
    │   Pivot table: careers × skills → weight matrix (24 × 156)
    │   Each career = 156-dimensional vector of skill importance weights
    │   Sparsity: ~70% (most careers require only 15–20 of 156 skills)
    │
    ▼
[5] Program Vectorization
    │   Pivot table: programs × skills → coverage matrix (55 × 156)
    │   Aligned to same skill columns as career vectors
    │   Each program = 156-dimensional vector of skill coverage scores
    │
    ▼
[6] Alignment Matrix Computation
    │   For each (career, program) pair:
    │     score = Σ(career_weight × program_coverage) / Σ(career_weight)
    │   Result: 24 × 55 = 1,320 alignment scores (+ 2 proxy careers = 1,430)
    │
    ▼
[7] Similarity Matrix Computation
    │   For each (career_A, career_B) pair:
    │     Union-based cosine similarity on non-zero skill elements
    │   Result: 24 × 24 symmetric similarity matrix
    │
    ▼
[8] Model Export
    ├── pathforge_model_v1.pkl (pickle archive)
    ├── career_vectors.csv, program_vectors.csv
    ├── alignment_matrix.csv, career_similarity.csv
    ├── career_metadata.csv, program_metadata.csv
    ├── master_skills.csv
    └── model_metadata.json (version, statistics)
```

### Core Algorithms

#### 1. Weighted Alignment Score

Computes how well a university program prepares students for a specific career:

```
                    Σ (career_skill_weight × program_coverage_score)
Alignment Score = ──────────────────────────────────────────────────
                              Σ (career_skill_weight)

Range: [0, 1]   |   1.0 = perfect alignment   |   0.0 = no coverage
```

**Example**: Data Analyst vs. BSc Computer Science @ Kyambogo University
```
Skills:     Python (0.78)   SQL (0.66)   Data Analysis (0.71)   Total Weight: 2.15
Coverage:   Python (0.85)   SQL (0.78)   Data Analysis (0.65)
Score:      (0.78×0.85 + 0.66×0.78 + 0.71×0.65) / 2.15 = 0.763 (76.3%)
```

#### 2. Union-Based Cosine Similarity

Measures how similar two careers are based on their shared skill requirements:

```
1. Extract non-zero skill positions for Career A and Career B
2. Create union mask: positions where either career requires a skill
3. Filter both vectors to union positions
4. similarity = dot(a, b) / (‖a‖ × ‖b‖)

Range: [0, 1]   |   1.0 = identical requirements   |   0.0 = no overlap
```

**Why union-based?** Standard cosine similarity would include hundreds of zero-zero pairs. By filtering to the union of non-zero elements, we measure similarity only where skills actually matter.

#### 3. Skill Gap Analysis

Computes per-skill deficits and overall readiness for a student:

```
For each required skill:
  gap = required_weight − student_proficiency

  Severity:
    gap ≤ 0    → "strong"        (student exceeds requirement)
    gap < 0.3  → "moderate_gap"  (minor deficiency)
    gap ≥ 0.3  → "critical_gap"  (major deficiency)

Overall Readiness = Σ(required_weight × student_proficiency) / Σ(required_weight)
```

#### 4. Learning Roadmap Generation

Creates a phased learning plan using topological sorting:

```
1. Compute skill gaps for student + target career
2. Build dependency graph (e.g., Machine Learning depends on Python, Statistics)
3. Topological sort: order skills by prerequisites
4. Classify into phases:
   - Foundation: prerequisite skills (Python, Statistics, SQL)
   - Specialization: career-specific skills (Machine Learning, Deep Learning)
   - Proficiency: mastery-level skills (Model Optimization, Cloud Deployment)
5. Estimate learning time per skill:
   - gap ≤ 0.2 → 1–2 months
   - gap ≤ 0.5 → 2–4 months
   - gap > 0.5 → 4–6 months
6. Identify critical path (longest dependency chain)
```

#### 5. Score Normalization (Sigmoid)

Raw alignment scores from the ML model cluster in the 0–0.25 range. The seed pipeline applies sigmoid normalization to spread them into a user-friendly 0–1 range:

```
normalized = 1 / (1 + exp(−20 × (raw − 0.05)))

Effect: raw 0.05 → ~0.50 | raw 0.15 → ~0.88 | raw 0.25 → ~0.98
```

#### 6. Project Simulator

Assesses student readiness through simulated career projects:

```
5 sections per career project → each covers 3–5 skills → MCQ-based scoring

Readiness Classification:
  Advanced:     score ≥ 0.80 AND skill gap ≤ 20%
  Intermediate: score ≥ 0.60 OR  skill gap ≤ 40%
  Beginner:     otherwise
```

### Evaluation & Validation

| Metric | Method | Result |
|--------|--------|--------|
| Alignment Score Distribution | Histogram + statistics | Mean: 0.65–0.75, Std: 0.10–0.15, Range: 0.10–0.98 |
| Alignment-Overlap Correlation | Pearson/Spearman | High alignment correlates with high skill overlap (validated) |
| Sensitivity to Weight Variance | Uniform vs. compressed vs. amplified weights | Weighted version produces more differentiation than uniform — weights are meaningful |
| Career Similarity Clustering | Heatmap visual inspection | Same-sector careers cluster together (IT group, Engineering group, Finance group) |
| Reproducibility | Fixed seed (42), deterministic algorithms | 100% reproducible across runs |

### Sensitivity Analysis

Three weight schemes were tested to validate that the chosen weighting meaningfully affects recommendations:

| Test | Weight Range | Finding |
|------|-------------|---------|
| Baseline (actual) | 0.50 – 0.95 | Produces clear differentiation between programs |
| Uniform (all = 1.0) | 1.0 | Loses nuance — all skills treated equally, less useful |
| Compressed (reduced variance) | Narrower | Moderate differentiation — less useful than baseline |
| Amplified (increased variance) | Wider | Over-differentiates — may be too extreme |

**Conclusion**: The actual weight range (0.50–0.95) provides the best balance of differentiation and stability.

### Visualizations Generated in Notebook

| Chart | Type | Purpose |
|-------|------|---------|
| Skill Weight Distribution | Histogram + box plot (by sector) | Validate weight ranges and sector differences |
| Skills per Career | Horizontal bar chart | Identify careers with most/fewest skill requirements |
| Program Coverage Distribution | Histogram + box plot (by region) | Compare coverage quality across East African regions |
| Alignment Score Example | Horizontal bar chart | Show top 10 programs for a career |
| Career Similarity | Horizontal bar chart | Show top 15 similar careers with overlap ratios |
| Career Similarity Heatmap | Heatmap (RdYlGn colormap) | Visualize cluster structure across sectors |
| Program Comparison | Multi-bar + radar chart | Multi-dimensional program comparison |
| Progress Over Time | Line chart | Readiness trajectory tracking |

### Model Artifacts Exported

| File | Dimensions | Description |
|------|-----------|-------------|
| `pathforge_model_v1.pkl` | — | Pickle archive with all matrices, metadata, version info |
| `career_vectors.csv` | 24 × 156 | Career skill importance vectors |
| `program_vectors.csv` | 55 × 156 | Program skill coverage vectors |
| `alignment_matrix.csv` | 24 × 55 | Pre-computed career-program alignment scores |
| `career_similarity.csv` | 24 × 24 | Cosine similarity between all career pairs |
| `master_skills.csv` | 350 rows | Normalized skill names with frequency counts |
| `career_metadata.csv` | 24 rows | Career IDs, names, sectors |
| `program_metadata.csv` | 55 rows | Program names, universities, regions |
| `model_metadata.json` | — | Version (1.0.0), creation date, coverage statistics |

---

## Project Structure

```
Pathforge/
├── Pathforge-Frontend/           # Next.js frontend
│   ├── app/                      # App Router pages (13 routes)
│   │   ├── page.tsx              # Landing / login
│   │   ├── dashboard/page.tsx    # Main dashboard
│   │   ├── assessment/page.tsx   # Skills assessment
│   │   ├── skill-gap/page.tsx    # Gap analysis
│   │   ├── market-intel/page.tsx # Market intelligence
│   │   ├── roadmap/page.tsx      # Learning roadmap
│   │   ├── progress/page.tsx     # Progress journey
│   │   ├── universities/page.tsx # University comparison
│   │   ├── profile/page.tsx      # User profile + settings
│   │   ├── resources/page.tsx    # Learning resources
│   │   ├── layout.tsx            # Root layout (ThemeProvider, AuthProvider)
│   │   ├── globals.css           # TailwindCSS v4 config + custom utilities
│   │   └── api/auth/             # NextAuth API routes
│   ├── components/               # Reusable UI components
│   │   ├── layout/Navbar.tsx     # Navigation header
│   │   ├── charts/               # DonutChart, RadarChart (SVG)
│   │   ├── providers/            # ThemeProvider, AuthProvider
│   │   └── ui/                   # ProgressBar, StatCard
│   ├── lib/                      # Shared utilities
│   │   ├── auth.ts               # NextAuth configuration (Google + Credentials)
│   │   ├── api.ts                # API service layer (10+ endpoints + mock fallbacks)
│   │   ├── types.ts              # 16 TypeScript interfaces
│   │   ├── careerStore.ts        # localStorage persistence
│   │   ├── marketData.ts         # Market intelligence for 26 careers
│   │   ├── universities.ts       # University data + metrics
│   │   ├── resources.ts          # 47 skills x 3-5 courses each
│   │   └── deviceId.ts           # Anonymous device tracking
│   ├── prisma/schema.prisma      # Auth + domain models
│   ├── tailwind.config.ts        # Dark mode (class strategy) + custom colours
│   └── package.json
│
├── PathForgeBackend/             # Express.js API server
│   ├── src/
│   │   ├── index.ts              # Server entry (6 route groups)
│   │   ├── routes/               # auth, careers, alignment, gap, similarity, assessment
│   │   ├── controllers/          # Business logic for each route
│   │   ├── middleware/auth.ts    # JWT verification middleware
│   │   ├── utils/                # readiness.ts, similarity.ts
│   │   └── types.ts              # Backend TypeScript interfaces
│   ├── prisma/
│   │   ├── schema.prisma         # Database schema
│   │   ├── seed.js               # Seeds careers, universities, programs, alignments, test users
│   │   └── Sample data/          # ML-generated CSVs (program_metadata, alignment_matrix, etc.)
│   └── package.json
│
├── Path-Forge API/               # Flask ML API
│   ├── app.py                    # All ML endpoints (gap, readiness, roadmap, market intel)
│   ├── requirements.txt          # flask, pandas, numpy
│   ├── test_api.py               # API test suite
│   └── students_db.json          # JSON persistence for student profiles
│
├── model_artifacts/              # Pre-computed ML data
│   ├── pathforge_model_v1.pkl    # Trained model (pickle)
│   ├── model_metadata.json       # Version + statistics
│   ├── career_vectors.csv        # 24 careers x 156 skill embeddings
│   ├── program_vectors.csv       # 55 programs x 156 skill embeddings
│   ├── alignment_matrix.csv      # 24 x 55 pre-computed alignment scores
│   ├── career_similarity.csv     # 24 x 24 cosine similarity matrix
│   ├── career_metadata.csv       # Career IDs, names, sectors
│   ├── program_metadata.csv      # Program names, universities, regions
│   └── master_skills.csv         # 350 normalised skill names
│
├── PathForge_Career_Intelligence_System_COMPLETE.ipynb
│                                 # ML capstone notebook (16 stages, 96 cells)
│
├── Documentation/                # Project summaries
│   ├── summary.md
│   └── summary.pdf
│
└── README.md                     # This file
```

---

## Installation & Setup (Step by Step)

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18+ | Frontend & backend runtime |
| npm | 9+ | Package management |
| PostgreSQL | 12+ | Relational database |
| Python | 3.9+ | Flask ML API |
| pip | 21+ | Python package management |

### Step 1: Create the PostgreSQL Database

Make sure PostgreSQL is running on `localhost:5432`, then create the database:

```bash
psql -U postgres -c "CREATE DATABASE pathforge;"
```

### Step 2: Configure Environment Variables

**Backend** — create `PathForgeBackend/.env`:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/pathforge?schema=public"
PORT=5000
JWT_SECRET="generate-a-random-secret-here"
NEXTAUTH_SECRET="shared-secret-between-frontend-and-backend"
```

**Frontend** — create `Pathforge-Frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET="same-shared-secret-as-backend"
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"
BACKEND_URL=http://localhost:5000
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/pathforge?schema=public"
```

> `NEXTAUTH_SECRET` must be identical in both files. Generate with: `openssl rand -base64 32`

### Step 3: Install Dependencies

```bash
# Backend
cd PathForgeBackend
npm install

# Frontend
cd ../Pathforge-Frontend
npm install

# ML API
cd "../Path-Forge API"
pip install -r requirements.txt
```

### Step 4: Set Up the Database & Seed Data

```bash
cd PathForgeBackend

# Generate Prisma client
npx prisma generate

# Create database tables
npx prisma migrate dev --name init

# Seed the database (26 careers, 22 universities, 55 programs, 1,430 alignments, 5 test users)
npm run seed
```

Expected output:

```
Loading sample data CSVs...
Creating 22 universities...
Computing alignment records...
Creating test users...
Database seeded with ML sample data!
  26 careers
  22 universities
  55 programs
  1430 alignment records
  5 test users (password: Test@1234)
```

### Step 5: Start All Services

Open **three separate terminals**:

```bash
# Terminal 1 — Express Backend (port 5000)
cd PathForgeBackend
npm run dev
```

```bash
# Terminal 2 — Next.js Frontend (port 3000)
cd Pathforge-Frontend
npm run dev
```

```bash
# Terminal 3 — Flask ML API (port 5001)
cd "Path-Forge API"
python app.py
```

### Step 6: Open the App

Visit **http://localhost:3000** in your browser. Log in with any of the test accounts listed below.

---

## Seed Data & Test Accounts

After running `npm run seed`, the database contains **5 test users** spanning different career sectors and skill levels. All use the same password for easy testing.

### Login Credentials

| # | Name | Email | Password | Target Career | Sector |
|---|------|-------|----------|---------------|--------|
| 1 | Amina Nakamura | `amina@pathforge.test` | `Test@1234` | Data Scientist | IT |
| 2 | Brian Ochieng | `brian@pathforge.test` | `Test@1234` | Financial Analyst | Business & Finance |
| 3 | Claire Uwimana | `claire@pathforge.test` | `Test@1234` | Civil Engineering | Engineering |
| 4 | David Kimani | `david@pathforge.test` | `Test@1234` | Full Stack Developer | IT |
| 5 | Esther Mwangi | `esther@pathforge.test` | `Test@1234` | Accountant | Business & Finance |

### Skill Profiles Per User

**Amina Nakamura** (Data Scientist — Advanced)
| Skill | Level | Status |
|-------|-------|--------|
| Python | 80% | Strong |
| SQL | 75% | Strong |
| Statistics | 70% | Good |
| Machine Learning | 35% | Critical gap |
| Data Visualization | 60% | Moderate |
| Cloud Computing | 20% | Critical gap |

**Brian Ochieng** (Financial Analyst — Intermediate)
| Skill | Level | Status |
|-------|-------|--------|
| Excel | 80% | Strong |
| Statistics | 65% | Good |
| SQL | 45% | Moderate gap |
| Data Visualization | 55% | Moderate |
| Financial Modeling | 50% | Moderate gap |

**Claire Uwimana** (Civil Engineering — Beginner)
| Skill | Level | Status |
|-------|-------|--------|
| CAD | 30% | Critical gap |
| Structural Analysis | 20% | Critical gap |
| Mathematics | 55% | Moderate |
| Project Management | 25% | Critical gap |
| Geotechnics | 15% | Critical gap |

**David Kimani** (Full Stack Developer — Advanced)
| Skill | Level | Status |
|-------|-------|--------|
| JavaScript | 85% | Strong |
| Python | 75% | Strong |
| SQL | 70% | Good |
| Cloud Computing | 55% | Moderate |
| Data Structures | 80% | Strong |
| DevOps | 45% | Moderate gap |

**Esther Mwangi** (Accountant — Intermediate)
| Skill | Level | Status |
|-------|-------|--------|
| Accounting | 70% | Good |
| Excel | 75% | Strong |
| Tax Law | 45% | Moderate gap |
| Financial Reporting | 55% | Moderate |
| SQL | 30% | Critical gap |

### What Each User Demonstrates

- **Amina** — High readiness (~72%), radar chart with visible gaps in ML and Cloud Computing. Ideal for demonstrating the gap analysis and recommended learning paths.
- **Brian** — Business sector with moderate gaps. Shows how market intelligence (salary data, demand scores) renders for non-IT careers.
- **Claire** — Lowest readiness. Demonstrates the full learning roadmap journey from beginner to proficiency, and university matching across 4 countries.
- **David** — Highest readiness IT user. Demonstrates the "nearly job-ready" dashboard state, progress tracking, and career similarity recommendations.
- **Esther** — Business sector, intermediate level. Shows cross-sector career similarity and how the system handles mixed skill profiles.

### Additional Seeded Data

| Entity | Count | Source |
|--------|-------|--------|
| Careers | 26 | 10 IT + 8 Business & Finance + 8 Engineering |
| Universities | 22 | 6 Kenya, 5 Uganda, 6 Tanzania, 4 Rwanda |
| Programs | 55 | CS, Data Science, AI/ML, Finance, Engineering, etc. |
| Career-Program Alignments | 1,430 | ML-scored, sigmoid-normalised (0-1) |
| Assessments | 5 | One per test user with their skill profile |

---

## Core Functionalities

### 1. Skills Assessment
Students complete a multi-step self-assessment questionnaire that rates their proficiency across career-relevant skills (0-100%). The assessment determines their target career and saves their skill profile to both localStorage and the backend database.

### 2. Career Readiness Dashboard
The main dashboard displays:
- **Readiness donut chart** — overall career readiness percentage
- **Skill gap radar chart** — visual comparison of current vs. required skill levels
- **Critical/moderate gap cards** — highlights the most urgent skills to develop
- **Progress over time bar chart** — readiness score evolution (real API data or derived from gap analysis)
- **Similar careers** — ML-powered career recommendations based on cosine similarity
- **University matches** — top programs ranked by ML alignment scores
- **Market snapshot** — average salary, demand score, and growth trend

### 3. Skill Gap Analysis
Detailed per-skill breakdown showing:
- Required level vs. current level for each skill
- Severity classification (critical / moderate / minor / none)
- Overall readiness score and estimated time to job-ready
- Top skills to prioritise for learning

### 4. University Matching
Compares **22 universities** across **4 East African countries** with:
- ML-scored program alignment (1,430 pre-computed scores)
- Filter by region (Kenya, Uganda, Tanzania, Rwanda)
- Program curriculum details (top 10 skills per program)
- Side-by-side comparison tool

### 5. Market Intelligence
Real-time career market data for East Africa:
- Average monthly salary (KES)
- Job demand score (0-100)
- Growth trend (growing / stable / declining)
- Top employers by region
- Regional salary comparison

### 6. Learning Roadmap
Phase-based personalised learning plan:
- **Foundation** — prerequisite skills and fundamentals
- **Specialisation** — career-specific advanced skills
- **Proficiency** — mastery-level competencies
- Each phase includes duration estimates, prerequisites, and priority levels

### 7. Progress Tracking
Comprehensive progress dashboard with:
- Readiness score area chart (historical + projected trajectory)
- Per-skill progress bars with target markers
- Milestones timeline
- Achievement badges
- Learning streak heatmap
- Monthly velocity metric

### 8. Learning Resources
Curated resource library covering:
- 47 skills with 3-5 courses each
- Filterable by skill name and career relevance
- Links to external learning platforms

### 9. User Profile & Preferences
- Edit name and email
- Select/change target career
- Dark/light theme toggle
- View assessment history

### 10. Authentication
- Google OAuth sign-in
- Email & password registration/login
- JWT-based session management
- Protected routes with automatic redirect

---

## API Reference

### Express Backend (port 5000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user (email, password, name) |
| POST | `/api/auth/login` | Login with email & password |
| GET | `/api/auth/me` | Get current user profile (JWT required) |
| PATCH | `/api/auth/preferences` | Update target career (JWT required) |
| GET | `/careers` | List all 26 careers with sectors & required skills |
| GET | `/careers/sector/:sector` | Filter careers by sector |
| GET | `/api/alignment/:career` | Top N university programs for a career |
| GET | `/api/similarity/:career` | Similar careers with cosine similarity scores |
| POST | `/api/gap` | Skill gap analysis (career + student profile) |
| POST | `/api/assessment` | Submit assessment results |
| GET | `/health` | Health check |

### Flask ML API (port 5001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/careers` | List all 24 ML-indexed careers |
| POST | `/api/gap` | Skill gap analysis |
| POST | `/api/recommend` | Career recommendations from skill profile |
| GET | `/api/similarity/:career` | Career similarity scores |
| GET | `/api/alignment/:career` | Program alignment scores |
| GET/POST | `/api/students/:id/profile` | Get/create student profile |
| GET | `/api/students/:id/gaps/:career` | Personalised gap analysis |
| GET | `/api/students/:id/readiness/:career` | Readiness + trajectory projection |
| GET | `/api/students/:id/roadmap/:career` | Learning roadmap with phases |
| GET | `/api/students/:id/progress/:career` | Progress snapshots over time |
| GET | `/api/market-intelligence/:career` | Job market data (East Africa) |
| GET | `/api/programs/compare` | Multi-dimensional program comparison |

---

## Testing Results

### Testing Strategy 1: Functional Testing with Different User Profiles

Each of the 5 seed users represents a different career sector, skill level, and use case. Testing with each user validates that the system produces correct, differentiated outputs.

| Test Case | User | Expected Outcome | Result |
|-----------|------|-------------------|--------|
| IT career with critical gaps | Amina (Data Scientist) | Dashboard shows ~72% readiness, critical gaps in ML & Cloud Computing | _[Screenshot]_ |
| Business career, intermediate | Brian (Financial Analyst) | Market intel shows KES salary data, moderate gaps in Financial Modeling | _[Screenshot]_ |
| Engineering career, beginner | Claire (Civil Engineering) | Low readiness (~30%), full roadmap with 3 phases, university matches | _[Screenshot]_ |
| IT career, near-ready | David (Full Stack Dev) | High readiness (~80%), minimal gaps, progress shows improvement | _[Screenshot]_ |
| Business career, mixed skills | Esther (Accountant) | Cross-sector similarity suggestions, moderate gaps | _[Screenshot]_ |

### Testing Strategy 2: Different Data Values

The system handles varying input data correctly:

| Test Scenario | Input | Expected Behaviour |
|---------------|-------|-------------------|
| Empty skill profile | No assessment taken | Dashboard shows default 50% readiness, prompts to take assessment |
| All skills at 0% | Beginner student | Shows all gaps as critical, longest roadmap timeline |
| All skills at 100% | Expert student | Shows 100% readiness, no gaps, "You're on track!" message |
| Career change | Switch from Data Scientist to Accountant | Dashboard recalculates all metrics, radar chart updates, new university matches |
| Missing API response | Backend/ML API unavailable | Frontend gracefully falls back to mock data from career similarity matrix |
| Single skill update | Re-take assessment with one skill improved | Progress chart reflects the change, gap severity may downgrade |

### Testing Strategy 3: Cross-Browser & Responsive Testing

| Environment | Browser/Device | Features Tested | Status |
|-------------|---------------|-----------------|--------|
| Windows 11 | Chrome 120+ | All pages, dark/light mode, charts | _[Pass/Fail]_ |
| Windows 11 | Firefox 120+ | All pages, navigation, forms | _[Pass/Fail]_ |
| Windows 11 | Edge 120+ | Auth flow, dashboard, charts | _[Pass/Fail]_ |
| macOS | Safari 17+ | Responsive layout, SVG charts | _[Pass/Fail]_ |
| Mobile (360px) | Chrome Android | Responsive layout, touch interactions | _[Pass/Fail]_ |
| Tablet (768px) | iPad Safari | Grid layouts, chart sizing | _[Pass/Fail]_ |

### Testing Strategy 4: Performance Testing

| Metric | Target | Actual | Tool |
|--------|--------|--------|------|
| First Contentful Paint | < 1.5s | _[measure]_ | Lighthouse |
| Largest Contentful Paint | < 2.5s | _[measure]_ | Lighthouse |
| Time to Interactive | < 3.0s | _[measure]_ | Lighthouse |
| API Response Time (gap analysis) | < 500ms | _[measure]_ | Network tab |
| API Response Time (alignment) | < 300ms | _[measure]_ | Network tab |
| Database seed time | < 10s | ~5s | Terminal |
| Build time (frontend) | < 30s | ~15s | `npm run build` |

### Testing Strategy 5: API Endpoint Testing

```bash
# Test the Flask ML API
cd "Path-Forge API"
python test_api.py

# Test Express backend health
curl http://localhost:5000/health

# Test career listing
curl http://localhost:5000/careers

# Test skill gap analysis
curl -X POST http://localhost:5000/api/gap \
  -H "Content-Type: application/json" \
  -d '{"career": "Data Scientist", "student_profile": {"Python": 0.8, "SQL": 0.7}}'

# Test career similarity
curl http://localhost:5000/api/similarity/Data%20Scientist?top_n=3
```

---

## Analysis

### Objectives vs. Results

| Objective | Status | Evidence |
|-----------|--------|----------|
| AI-powered skill gap analysis | Achieved | ML model computes per-skill gaps with severity classification (critical/moderate/minor/none) using career vector embeddings across 350 skills |
| University-to-career matching | Achieved | 1,430 alignment records computed from ML model, sigmoid-normalised. Users see top programs ranked by alignment score, filterable by region |
| Personalised learning roadmaps | Achieved | 3-phase roadmap (foundation/specialisation/proficiency) generated from gap analysis, with prerequisite ordering and duration estimates |
| Market intelligence for East Africa | Achieved | Salary data, demand scores, and growth trends for 11+ careers across Kenya, Uganda, Tanzania, and Rwanda |
| Career similarity recommendations | Achieved | 24x24 cosine similarity matrix enables discovery of related careers, validated against real career skill overlap patterns |
| Progress tracking over time | Achieved | Dashboard tracks readiness evolution using real API snapshots (when available) or derives synthetic history from current readiness score |
| Multi-sector career coverage | Achieved | 26 careers spanning 3 sectors (IT, Business & Finance, Engineering) with sector-specific skill requirements |
| Multi-country university data | Achieved | 22 universities across 4 East African countries with 55 programs, curriculum data, and ML alignment scores |
| Dark/light theme support | Achieved | Tailwind CSS v4 class-based dark mode with localStorage persistence and seamless toggle |
| Secure authentication | Achieved | NextAuth.js v5 with Google OAuth + email/password, bcrypt hashing, JWT tokens, protected routes |

### ML Model Performance

- **Career vectors**: 156-dimensional skill embeddings for 24 careers
- **Alignment scoring**: Sigmoid normalisation transforms raw ML scores (0-0.25) into user-friendly 0-1 range
- **Similarity accuracy**: Cosine similarity correctly identifies related careers (e.g., Data Scientist <-> ML Engineer at 87.7%)
- **Proxy careers**: Software Engineer and Data Engineer use averaged proxy scores from related careers in the ML matrix

### Technical Achievements

- **Zero-downtime fallbacks**: Every API call has a mock data fallback, ensuring the frontend always renders meaningful data even when backend services are unavailable
- **Real-time reactivity**: Dashboard recalculates all metrics when the user changes their target career or re-takes an assessment
- **Type safety**: Full TypeScript coverage across frontend and backend with 16 shared interfaces

---

## Discussion

### Key Milestones and Their Impact

**Milestone 1: ML Model Training & Data Pipeline**
The foundation of PathForge is the pre-trained ML model (v1.0.0) that processes 350 skills across 24 careers and 55 programs. This model generates the career vectors, program vectors, alignment matrix, and similarity matrix that power every recommendation in the platform. Without this ML backbone, the system would rely on manual expert scoring, which would not scale to 1,430 career-program combinations.

**Milestone 2: Database Seeding with ML Data**
The seed pipeline (`seed.js`) bridges the gap between raw ML outputs (CSV files) and a queryable PostgreSQL database. It handles skill name normalisation (e.g., `machine_learning` -> `Machine Learning`), sigmoid score normalisation, proxy career computation, and batch insertion of 1,430 alignment records. This pipeline ensures reproducible, consistent data across development and production environments.

**Milestone 3: Full-Stack Integration**
Connecting the Next.js frontend, Express backend, and Flask ML API required careful coordination of authentication tokens (JWT), data formats (StudentProfile, GapAnalysisResult), and error handling (graceful fallbacks). The result is a seamless user experience where a student can take an assessment, immediately see their gap analysis, explore matching universities, and start a personalised learning roadmap — all in one session.

**Milestone 4: East African Focus**
PathForge is specifically designed for East African students, covering universities in Kenya, Uganda, Tanzania, and Rwanda. Market intelligence includes region-specific salary data in KES, local employer names, and demand scores calibrated to the East African job market. This regional focus fills a gap in existing career guidance tools that typically target Western markets.

**Milestone 5: Dark Mode & Accessibility**
The Tailwind CSS v4 class-based dark mode system with `@custom-variant` ensures that all 400+ dark-mode utility classes respond correctly to the user's theme preference. This improves usability in low-light environments and demonstrates attention to user experience beyond core functionality.

### Challenges Encountered

| Challenge | Resolution |
|-----------|-----------|
| Tailwind v4 ignoring `tailwind.config.ts` darkMode setting | Added `@custom-variant dark` directive in CSS — Tailwind v4 uses CSS-first configuration |
| Career similarity matrix missing Software Engineer & Data Engineer | Implemented proxy scoring by averaging similarity scores from related careers |
| Hydration mismatches with theme toggle | Added `suppressHydrationWarning` and `mounted` state guard in ThemeProvider |
| Raw ML alignment scores clustered in 0-0.25 range | Applied sigmoid normalisation `1/(1+exp(-20*(x-0.05)))` for user-friendly 0-1 display |

---

## Recommendations & Future Work

### For Students Using PathForge

1. **Take the assessment honestly** — The ML gap analysis is only as accurate as the self-reported skill levels. Over-reporting skills leads to false "job-ready" signals.
2. **Explore similar careers** — The cosine similarity recommendations often surface careers students haven't considered but are well-suited for.
3. **Re-assess regularly** — The progress tracking works best when students re-take the assessment after completing learning modules, creating a real data trail.

### For Institutions

1. **Partner with universities** — The 22 universities in the system could validate and update their program curricula data for more accurate alignment scores.
2. **Regional job market integration** — Connecting to real-time job boards (e.g., BrighterMonday, Fuzu) would replace the current static market intelligence data with live demand signals.

### Future Work

| Feature | Priority | Description |
|---------|----------|-------------|
| Real-time job board integration | High | Connect to BrighterMonday, LinkedIn, Fuzu APIs for live job postings and salary data |
| Employer partnerships | High | Allow employers to post skill requirements directly, improving alignment accuracy |
| Mobile app (React Native) | Medium | Extend to iOS/Android for better accessibility in regions with mobile-first internet usage |
| Peer comparison | Medium | Let students compare their readiness scores against anonymous cohort averages |
| Certificate verification | Medium | Integrate with learning platforms (Coursera, Udemy) to auto-verify completed courses |
| AI-powered mentorship matching | Low | Use skill profiles to match students with industry mentors in their target career |
| Multi-language support | Low | Add Swahili, Kinyarwanda, and Luganda translations for wider East African reach |
| Expanded career coverage | Low | Add healthcare, education, and creative industry careers beyond the current 26 |

---

## Database Schema

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────────────┐
│     User     │     │    Career    │     │ CareerProgramAlignment   │
├──────────────┤     ├──────────────┤     ├──────────────────────────┤
│ id (cuid)    │     │ id (int)     │────>│ careerId                 │
│ name         │     │ name (unique)│     │ programId                │
│ email (uniq) │     │ sector       │     │ alignment (float 0-1)    │
│ passwordHash │     │ requiredSkills│    └──────────────────────────┘
│ targetCareer │     │ (JSON)       │               ^
│ createdAt    │     └──────────────┘               │
│ updatedAt    │                                    │
└──────┬───────┘     ┌──────────────┐     ┌────────┴─────┐
       │             │  University  │     │   Program    │
       │             ├──────────────┤     ├──────────────┤
       v             │ id (int)     │────>│ universityId │
┌──────────────┐     │ name         │     │ name         │
│  Assessment  │     │ region       │     │ curriculum   │
├──────────────┤     └──────────────┘     │ (JSON)       │
│ id (int)     │                          └──────────────┘
│ deviceId     │
│ userId       │     ┌──────────────┐     ┌──────────────────────┐
│ career       │     │   Account    │     │  VerificationToken   │
│ profile (JSON)│    │ (OAuth)      │     │                      │
│ createdAt    │     └──────────────┘     └──────────────────────┘
└──────────────┘
```

---

## Authentication Flow

```
User visits /
      |
      |---> "Sign in with Google"
      |         |
      |         v
      |    Google OAuth flow
      |         |
      |         v
      |    NextAuth creates/updates User in PostgreSQL
      |         |
      |         v
      |    JWT stored in HTTP-only cookie
      |
      +---> Email & Password
               |
               v
          NextAuth --> Backend POST /api/auth/login
               |
               v
          bcrypt.compare(password, hash)
               |
               v
          Return user --> JWT stored in cookie
               |
               v
          All protected pages (/dashboard, /profile, etc.)
          redirect to / if no session
```

---

## Useful Commands

```bash
# Backend
cd PathForgeBackend
npm run dev              # Start dev server (port 5000)
npm run build            # Compile TypeScript
npm run seed             # Re-seed database (clears + re-creates all data)
npx prisma studio        # Visual database browser (http://localhost:5555)
npx prisma migrate dev   # Create/apply migrations

# Frontend
cd Pathforge-Frontend
npm run dev              # Start dev server (port 3000)
npm run build            # Production build
npm run lint             # ESLint check

# ML API
cd "Path-Forge API"
python app.py            # Start Flask server (port 5001)
python test_api.py       # Run API tests
```

---

## License

Private project — all rights reserved.
