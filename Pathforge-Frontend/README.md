# PathForge — Frontend (Next.js + TypeScript)

## Tech Stack
- **Next.js 14** (App Router)
- **TypeScript** (strict mode)
- **Tailwind CSS** (custom theme)
- **Material Symbols** icons (Google Fonts)

## Project Structure
```
Frontend/
├── app/                        ← Next.js App Router pages
│   ├── page.tsx                → / — Landing / Login
│   ├── dashboard/page.tsx      → /dashboard — Dashboard Home
│   ├── assessment/page.tsx     → /assessment — Skills Assessment
│   ├── skill-gap/page.tsx      → /skill-gap — Skill Gap Analysis
│   ├── market-intel/page.tsx   → /market-intel — Market Intelligence
│   ├── roadmap/page.tsx        → /roadmap — Learning Roadmap
│   ├── progress/page.tsx       → /progress — Student Progress Journey
│   ├── universities/page.tsx   → /universities — University Comparison
│   ├── profile/page.tsx        → /profile — User Profile
│   ├── layout.tsx              ← Root layout (fonts, metadata)
│   └── globals.css             ← Tailwind base + custom utilities
│
├── components/
│   ├── layout/
│   │   └── Navbar.tsx          ← Sticky navigation bar
│   ├── ui/
│   │   ├── StatCard.tsx        ← KPI stat card
│   │   └── ProgressBar.tsx     ← Animated progress bar
│   └── charts/
│       ├── DonutChart.tsx      ← SVG donut/ring chart
│       └── RadarChart.tsx      ← SVG radar/spider chart
│
├── lib/
│   ├── api.ts                  ← API service layer (all Flask endpoints)
│   └── types.ts                ← Shared TypeScript interfaces
│
├── .env.local                  ← API base URL config
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

## Getting Started
```bash
cd Frontend
npm install        # install dependencies
npm run dev        # start dev server on http://localhost:3000
```

## API Integration
Set your Flask API URL in `.env.local`:
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
```

All API calls are in `lib/api.ts` and gracefully fall back to mock data
when the API is unreachable (development mode).

### Wired Endpoints
| Screen | API Call |
|--------|----------|
| Dashboard | `GET /careers`, `GET /api/alignment/:career`, `GET /api/similarity/:career` |
| Assessment → Skill Gap | `POST /api/gap` |
| Skill Gap | `POST /api/gap` |
| Market Intel | `GET /careers`, `GET /careers/sector/:sector` |
| Universities | `GET /api/alignment/:career` |

## Design System
- **Primary**: `#f97415` (orange)
- **Navy accent**: `#1E3A8A`
- **Font**: Inter
- **Dark mode**: fully supported via `dark:` Tailwind variants
