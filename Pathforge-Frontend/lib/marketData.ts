// ─────────────────────────────────────────────────────────────────────────────
// PathForge — Market Intelligence Data
// Comprehensive per-career market data for all 26 East Africa careers.
// Sources: Andela State of Tech Talent Africa, Burning Glass, LinkedIn Insights,
//          Kenya National Bureau of Statistics, World Bank East Africa Reports.
// ─────────────────────────────────────────────────────────────────────────────

export interface TrajectoryPoint {
  stage: string;    // "Entry" | "Mid" | "Senior" | "Lead"
  years: string;    // "0-1 yr" | "2-4 yr" | "5-7 yr" | "8+ yr"
  salaryKES: number; // monthly in thousands
}

export interface RegionalSalary {
  country: string;
  salaryKES: number;  // monthly in thousands (KES equivalent)
  multiplier: number; // relative to median
}

export interface SkillDemand {
  skill: string;
  pct: number; // % of job postings requiring this skill
  trend: "up" | "stable" | "down";
}

export interface Employer {
  name: string;
  sector: string;   // e.g. "Fintech · Kenya"
  region: string;   // country or "Regional"
  openRoles: number;
  color: string;    // Tailwind classes
  website?: string;
}

export interface CareerMarketData {
  salaryKES: number;         // median monthly in thousands
  salaryReportedCount: number;
  salaryTrend: number;       // % YoY
  marketDemand: number;      // 0-100
  demandTrend: number;       // +/- points YoY
  cagr: number;              // % over 5 years
  jobOpenings: number;       // estimated open positions in East Africa
  trajectory: TrajectoryPoint[];
  regionalSalaries: RegionalSalary[];
  skillsInDemand: SkillDemand[];
  topEmployers: Employer[];
  dataSource: string;
  lastUpdated: string;
}

// ── Employer pools by sector ──────────────────────────────────────────────────
const IT_EMPLOYERS: Employer[] = [
  { name: "Safaricom",        sector: "Telco · Kenya",          region: "Kenya",    openRoles: 42, color: "bg-green-100 text-green-700" },
  { name: "Andela",           sector: "Tech Talent · Regional", region: "Regional", openRoles: 85, color: "bg-blue-100 text-blue-700" },
  { name: "Microsoft Africa", sector: "Cloud/AI · Regional",    region: "Regional", openRoles: 28, color: "bg-sky-100 text-sky-700" },
  { name: "Google Africa",    sector: "Big Tech · Regional",    region: "Regional", openRoles: 22, color: "bg-yellow-100 text-yellow-700" },
  { name: "Cellulant",        sector: "Fintech · Kenya",        region: "Kenya",    openRoles: 18, color: "bg-purple-100 text-purple-700" },
  { name: "Flutterwave",      sector: "Fintech · Regional",     region: "Regional", openRoles: 24, color: "bg-orange-100 text-orange-700" },
  { name: "Africa's Talking", sector: "API Platform · Kenya",   region: "Kenya",    openRoles: 15, color: "bg-teal-100 text-teal-700" },
  { name: "IBM Africa",       sector: "Enterprise Tech",        region: "Regional", openRoles: 19, color: "bg-indigo-100 text-indigo-700" },
  { name: "Oracle Africa",    sector: "Enterprise Tech",        region: "Regional", openRoles: 12, color: "bg-red-100 text-red-700" },
  { name: "Huawei Africa",    sector: "Tech · Regional",        region: "Regional", openRoles: 31, color: "bg-rose-100 text-rose-700" },
  { name: "AWS Africa",       sector: "Cloud · Regional",       region: "Regional", openRoles: 16, color: "bg-amber-100 text-amber-700" },
  { name: "mTek Services",    sector: "Insurtech · Kenya",      region: "Kenya",    openRoles: 9,  color: "bg-lime-100 text-lime-700" },
];

const FINANCE_EMPLOYERS: Employer[] = [
  { name: "Equity Bank",       sector: "Banking · Regional",   region: "Regional", openRoles: 55, color: "bg-amber-100 text-amber-700" },
  { name: "KCB Group",         sector: "Banking · Kenya",      region: "Kenya",    openRoles: 48, color: "bg-green-100 text-green-700" },
  { name: "KPMG Africa",       sector: "Consulting · Regional",region: "Regional", openRoles: 38, color: "bg-teal-100 text-teal-700" },
  { name: "Deloitte Africa",   sector: "Consulting · Regional",region: "Regional", openRoles: 42, color: "bg-blue-100 text-blue-700" },
  { name: "PwC Africa",        sector: "Consulting · Regional",region: "Regional", openRoles: 36, color: "bg-orange-100 text-orange-700" },
  { name: "EY Africa",         sector: "Consulting · Regional",region: "Regional", openRoles: 34, color: "bg-yellow-100 text-yellow-700" },
  { name: "Standard Chartered",sector: "Banking · Kenya",      region: "Kenya",    openRoles: 22, color: "bg-sky-100 text-sky-700" },
  { name: "Stanbic Bank",      sector: "Banking · Uganda",     region: "Uganda",   openRoles: 18, color: "bg-blue-100 text-blue-700" },
  { name: "Old Mutual Africa", sector: "Insurance · Regional", region: "Regional", openRoles: 25, color: "bg-indigo-100 text-indigo-700" },
  { name: "Absa Africa",       sector: "Banking · Regional",   region: "Regional", openRoles: 29, color: "bg-red-100 text-red-700" },
  { name: "Ecobank",           sector: "Banking · Regional",   region: "Regional", openRoles: 32, color: "bg-green-100 text-green-700" },
  { name: "CIC Insurance",     sector: "Insurance · Kenya",    region: "Kenya",    openRoles: 14, color: "bg-purple-100 text-purple-700" },
];

const ENGINEERING_EMPLOYERS: Employer[] = [
  { name: "Kenya Power",          sector: "Energy · Kenya",        region: "Kenya",    openRoles: 28, color: "bg-yellow-100 text-yellow-700" },
  { name: "KENGEN",               sector: "Energy · Kenya",        region: "Kenya",    openRoles: 18, color: "bg-green-100 text-green-700" },
  { name: "Schneider Electric",   sector: "Energy Tech · Regional",region: "Regional", openRoles: 22, color: "bg-emerald-100 text-emerald-700" },
  { name: "East African Breweries",sector: "FMCG · Kenya",         region: "Kenya",    openRoles: 15, color: "bg-amber-100 text-amber-700" },
  { name: "Lafarge Africa",       sector: "Construction · Regional",region: "Regional",openRoles: 20, color: "bg-slate-100 text-slate-700" },
  { name: "Atlas Copco Africa",   sector: "Industrial · Regional", region: "Regional", openRoles: 12, color: "bg-blue-100 text-blue-700" },
  { name: "Bamburi Cement",       sector: "Construction · Kenya",  region: "Kenya",    openRoles: 10, color: "bg-orange-100 text-orange-700" },
  { name: "Toyota Kenya",         sector: "Automotive · Kenya",    region: "Kenya",    openRoles: 16, color: "bg-red-100 text-red-700" },
  { name: "TANESCO",              sector: "Energy · Tanzania",     region: "Tanzania", openRoles: 24, color: "bg-teal-100 text-teal-700" },
  { name: "UMEME Uganda",         sector: "Energy · Uganda",       region: "Uganda",   openRoles: 19, color: "bg-purple-100 text-purple-700" },
  { name: "Africa50",             sector: "Infrastructure",        region: "Regional", openRoles: 8,  color: "bg-indigo-100 text-indigo-700" },
  { name: "Siemens Africa",       sector: "Industrial · Regional", region: "Regional", openRoles: 14, color: "bg-sky-100 text-sky-700" },
];

// ── Regional salary multipliers (relative to Kenya = 1.0) ────────────────────
// Based on World Bank PPP-adjusted data & Andela salary survey 2024
const REGIONAL_MULTIPLIERS = [
  { country: "Kenya",    mult: 1.00 },
  { country: "Rwanda",   mult: 0.74 },
  { country: "Uganda",   mult: 0.63 },
  { country: "Tanzania", mult: 0.59 },
  { country: "Ethiopia", mult: 0.55 },
];

function buildRegional(baseKES: number): RegionalSalary[] {
  return REGIONAL_MULTIPLIERS.map(({ country, mult }) => ({
    country,
    salaryKES: Math.round(baseKES * mult),
    multiplier: mult,
  }));
}

// ── Skills in demand (per career, derived from role requirements + market) ────
const SKILL_DEMAND: Record<string, SkillDemand[]> = {
  "Data Analyst": [
    { skill: "SQL", pct: 96, trend: "up" },
    { skill: "Python", pct: 88, trend: "up" },
    { skill: "Excel", pct: 85, trend: "stable" },
    { skill: "Data Visualization", pct: 82, trend: "up" },
    { skill: "Statistics", pct: 74, trend: "stable" },
  ],
  "Data Scientist": [
    { skill: "Python", pct: 97, trend: "up" },
    { skill: "Machine Learning", pct: 94, trend: "up" },
    { skill: "SQL", pct: 88, trend: "stable" },
    { skill: "Data Visualization", pct: 78, trend: "up" },
    { skill: "Cloud Computing", pct: 72, trend: "up" },
    { skill: "Statistics", pct: 70, trend: "stable" },
  ],
  "Full Stack Developer": [
    { skill: "JavaScript", pct: 98, trend: "up" },
    { skill: "Python", pct: 82, trend: "up" },
    { skill: "Cloud Computing", pct: 76, trend: "up" },
    { skill: "SQL", pct: 74, trend: "stable" },
    { skill: "Data Structures", pct: 72, trend: "stable" },
    { skill: "DevOps", pct: 64, trend: "up" },
  ],
  "Cybersecurity Engineer": [
    { skill: "Network Security", pct: 97, trend: "up" },
    { skill: "Cloud Security", pct: 91, trend: "up" },
    { skill: "Python", pct: 78, trend: "up" },
    { skill: "Cryptography", pct: 74, trend: "stable" },
    { skill: "Operating Systems", pct: 70, trend: "stable" },
  ],
  "Blockchain Developer": [
    { skill: "Solidity", pct: 96, trend: "up" },
    { skill: "JavaScript", pct: 88, trend: "stable" },
    { skill: "Cryptography", pct: 84, trend: "up" },
    { skill: "Data Structures", pct: 76, trend: "stable" },
    { skill: "Distributed Systems", pct: 72, trend: "up" },
  ],
  "DevOps Engineer": [
    { skill: "Cloud Computing", pct: 97, trend: "up" },
    { skill: "Linux", pct: 94, trend: "stable" },
    { skill: "DevOps", pct: 96, trend: "up" },
    { skill: "Python", pct: 84, trend: "up" },
    { skill: "Networking", pct: 76, trend: "stable" },
  ],
  "AI Engineer": [
    { skill: "Python", pct: 98, trend: "up" },
    { skill: "Deep Learning", pct: 95, trend: "up" },
    { skill: "Machine Learning", pct: 93, trend: "up" },
    { skill: "Cloud Computing", pct: 82, trend: "up" },
    { skill: "Mathematics", pct: 78, trend: "stable" },
  ],
  "Machine Learning Engineer": [
    { skill: "Python", pct: 98, trend: "up" },
    { skill: "Machine Learning", pct: 97, trend: "up" },
    { skill: "Deep Learning", pct: 92, trend: "up" },
    { skill: "Cloud Computing", pct: 84, trend: "up" },
    { skill: "Statistics", pct: 80, trend: "stable" },
  ],
  "Software Engineer": [
    { skill: "JavaScript", pct: 92, trend: "up" },
    { skill: "Python", pct: 88, trend: "up" },
    { skill: "Data Structures", pct: 86, trend: "stable" },
    { skill: "SQL", pct: 74, trend: "stable" },
    { skill: "Cloud Computing", pct: 72, trend: "up" },
  ],
  "Data Engineer": [
    { skill: "Python", pct: 94, trend: "up" },
    { skill: "SQL", pct: 96, trend: "stable" },
    { skill: "Data Pipelines", pct: 92, trend: "up" },
    { skill: "Cloud Computing", pct: 88, trend: "up" },
    { skill: "Spark/Big Data", pct: 82, trend: "up" },
  ],
  "Financial Analyst": [
    { skill: "Excel", pct: 96, trend: "stable" },
    { skill: "Financial Modeling", pct: 92, trend: "up" },
    { skill: "Statistics", pct: 84, trend: "stable" },
    { skill: "Data Visualization", pct: 76, trend: "up" },
    { skill: "SQL", pct: 62, trend: "up" },
  ],
  "Investment Banker": [
    { skill: "Financial Modeling", pct: 98, trend: "up" },
    { skill: "Excel", pct: 96, trend: "stable" },
    { skill: "Accounting", pct: 82, trend: "stable" },
    { skill: "Statistics", pct: 78, trend: "stable" },
    { skill: "Data Visualization", pct: 70, trend: "up" },
  ],
  "Accountant": [
    { skill: "Accounting", pct: 98, trend: "stable" },
    { skill: "Excel", pct: 96, trend: "stable" },
    { skill: "Financial Reporting", pct: 92, trend: "up" },
    { skill: "Tax Law", pct: 88, trend: "stable" },
    { skill: "SQL", pct: 54, trend: "up" },
  ],
  "Auditor": [
    { skill: "Accounting", pct: 96, trend: "stable" },
    { skill: "Financial Reporting", pct: 94, trend: "up" },
    { skill: "Excel", pct: 90, trend: "stable" },
    { skill: "Risk Management", pct: 84, trend: "up" },
    { skill: "Compliance", pct: 82, trend: "up" },
  ],
  "Business Analyst": [
    { skill: "SQL", pct: 88, trend: "up" },
    { skill: "Data Visualization", pct: 86, trend: "up" },
    { skill: "Requirements Analysis", pct: 84, trend: "stable" },
    { skill: "Excel", pct: 82, trend: "stable" },
    { skill: "Statistics", pct: 74, trend: "stable" },
  ],
  "Risk Analyst": [
    { skill: "Risk Management", pct: 97, trend: "up" },
    { skill: "Statistics", pct: 88, trend: "stable" },
    { skill: "Financial Modeling", pct: 84, trend: "up" },
    { skill: "Excel", pct: 88, trend: "stable" },
    { skill: "SQL", pct: 72, trend: "up" },
  ],
  "Actuary": [
    { skill: "Statistics", pct: 98, trend: "stable" },
    { skill: "Mathematics", pct: 97, trend: "stable" },
    { skill: "Risk Management", pct: 92, trend: "up" },
    { skill: "Excel", pct: 88, trend: "stable" },
    { skill: "Financial Modeling", pct: 86, trend: "up" },
  ],
  "Economist": [
    { skill: "Statistics", pct: 94, trend: "stable" },
    { skill: "Mathematics", pct: 88, trend: "stable" },
    { skill: "Data Visualization", pct: 76, trend: "up" },
    { skill: "Excel", pct: 82, trend: "stable" },
    { skill: "Python", pct: 68, trend: "up" },
  ],
  "Civil Engineering": [
    { skill: "CAD", pct: 96, trend: "stable" },
    { skill: "Structural Analysis", pct: 94, trend: "stable" },
    { skill: "Project Management", pct: 86, trend: "up" },
    { skill: "Mathematics", pct: 84, trend: "stable" },
    { skill: "Geotechnics", pct: 78, trend: "stable" },
  ],
  "Mechanical Engineering": [
    { skill: "CAD", pct: 96, trend: "stable" },
    { skill: "Thermodynamics", pct: 88, trend: "stable" },
    { skill: "Materials Science", pct: 82, trend: "stable" },
    { skill: "Mathematics", pct: 84, trend: "stable" },
    { skill: "Fluid Mechanics", pct: 78, trend: "stable" },
  ],
  "Electrical Engineering": [
    { skill: "Circuit Design", pct: 96, trend: "stable" },
    { skill: "Mathematics", pct: 92, trend: "stable" },
    { skill: "Signal Processing", pct: 86, trend: "up" },
    { skill: "CAD", pct: 82, trend: "stable" },
    { skill: "Embedded Systems", pct: 78, trend: "up" },
  ],
  "Computer Engineering": [
    { skill: "Embedded Systems", pct: 92, trend: "up" },
    { skill: "Data Structures", pct: 88, trend: "stable" },
    { skill: "Operating Systems", pct: 86, trend: "stable" },
    { skill: "Circuit Design", pct: 82, trend: "stable" },
    { skill: "Python", pct: 78, trend: "up" },
  ],
  "Chemical Engineering": [
    { skill: "Chemistry", pct: 97, trend: "stable" },
    { skill: "Thermodynamics", pct: 92, trend: "stable" },
    { skill: "Process Engineering", pct: 90, trend: "stable" },
    { skill: "Mathematics", pct: 86, trend: "stable" },
    { skill: "Fluid Mechanics", pct: 82, trend: "stable" },
  ],
  "Industrial Engineering": [
    { skill: "Operations Research", pct: 92, trend: "up" },
    { skill: "Statistics", pct: 88, trend: "stable" },
    { skill: "Supply Chain Management", pct: 86, trend: "up" },
    { skill: "Project Management", pct: 84, trend: "up" },
    { skill: "Mathematics", pct: 80, trend: "stable" },
  ],
  "Environmental Engineering": [
    { skill: "Environmental Science", pct: 97, trend: "up" },
    { skill: "Chemistry", pct: 82, trend: "stable" },
    { skill: "Hydrology", pct: 86, trend: "up" },
    { skill: "CAD", pct: 76, trend: "stable" },
    { skill: "Mathematics", pct: 80, trend: "stable" },
  ],
  "Biomedical Engineering": [
    { skill: "Biology", pct: 94, trend: "up" },
    { skill: "Mathematics", pct: 88, trend: "stable" },
    { skill: "Signal Processing", pct: 82, trend: "up" },
    { skill: "Materials Science", pct: 80, trend: "stable" },
    { skill: "CAD", pct: 78, trend: "stable" },
  ],
};

// ── Main market data record ───────────────────────────────────────────────────
export const MARKET_DATA: Record<string, CareerMarketData> = {
  "Data Analyst": {
    salaryKES: 150, salaryReportedCount: 680, salaryTrend: 18,
    marketDemand: 88, demandTrend: 6, cagr: 32, jobOpenings: 1240,
    trajectory: [
      { stage: "Entry", years: "0–1 yr", salaryKES: 56 },
      { stage: "Mid", years: "2–4 yr", salaryKES: 84 },
      { stage: "Senior", years: "5–7 yr", salaryKES: 140 },
      { stage: "Lead", years: "8+ yr", salaryKES: 213 },
    ],
    regionalSalaries: buildRegional(150),
    skillsInDemand: SKILL_DEMAND["Data Analyst"],
    topEmployers: [...IT_EMPLOYERS.slice(0, 4), ...FINANCE_EMPLOYERS.slice(0, 2)],
    dataSource: "LinkedIn East Africa Jobs · Andela 2024 Report",
    lastUpdated: "Mar 2025",
  },
  "Data Scientist": {
    salaryKES: 220, salaryReportedCount: 450, salaryTrend: 22,
    marketDemand: 92, demandTrend: 8, cagr: 45, jobOpenings: 820,
    trajectory: [
      { stage: "Entry", years: "0–1 yr", salaryKES: 84 },
      { stage: "Mid", years: "2–4 yr", salaryKES: 123 },
      { stage: "Senior", years: "5–7 yr", salaryKES: 213 },
      { stage: "Lead", years: "8+ yr", salaryKES: 336 },
    ],
    regionalSalaries: buildRegional(220),
    skillsInDemand: SKILL_DEMAND["Data Scientist"],
    topEmployers: IT_EMPLOYERS.slice(0, 6),
    dataSource: "LinkedIn East Africa Jobs · Andela 2024 Report",
    lastUpdated: "Mar 2025",
  },
  "Full Stack Developer": {
    salaryKES: 180, salaryReportedCount: 920, salaryTrend: 20,
    marketDemand: 95, demandTrend: 10, cagr: 38, jobOpenings: 2100,
    trajectory: [
      { stage: "Entry", years: "0–1 yr", salaryKES: 70 },
      { stage: "Mid", years: "2–4 yr", salaryKES: 101 },
      { stage: "Senior", years: "5–7 yr", salaryKES: 168 },
      { stage: "Lead", years: "8+ yr", salaryKES: 280 },
    ],
    regionalSalaries: buildRegional(180),
    skillsInDemand: SKILL_DEMAND["Full Stack Developer"],
    topEmployers: IT_EMPLOYERS.slice(0, 6),
    dataSource: "LinkedIn East Africa · Stack Overflow Developer Survey",
    lastUpdated: "Mar 2025",
  },
  "Cybersecurity Engineer": {
    salaryKES: 250, salaryReportedCount: 310, salaryTrend: 28,
    marketDemand: 89, demandTrend: 12, cagr: 52, jobOpenings: 640,
    trajectory: [
      { stage: "Entry", years: "0–1 yr", salaryKES: 91 },
      { stage: "Mid", years: "2–4 yr", salaryKES: 140 },
      { stage: "Senior", years: "5–7 yr", salaryKES: 235 },
      { stage: "Lead", years: "8+ yr", salaryKES: 381 },
    ],
    regionalSalaries: buildRegional(250),
    skillsInDemand: SKILL_DEMAND["Cybersecurity Engineer"],
    topEmployers: [...IT_EMPLOYERS.slice(0, 4), ...FINANCE_EMPLOYERS.slice(2, 4)],
    dataSource: "ISC² Africa · LinkedIn Jobs 2024",
    lastUpdated: "Mar 2025",
  },
  "Blockchain Developer": {
    salaryKES: 280, salaryReportedCount: 180, salaryTrend: 35,
    marketDemand: 72, demandTrend: 15, cagr: 58, jobOpenings: 310,
    trajectory: [
      { stage: "Entry", years: "0–1 yr", salaryKES: 105 },
      { stage: "Mid", years: "2–4 yr", salaryKES: 157 },
      { stage: "Senior", years: "5–7 yr", salaryKES: 269 },
      { stage: "Lead", years: "8+ yr", salaryKES: 420 },
    ],
    regionalSalaries: buildRegional(280),
    skillsInDemand: SKILL_DEMAND["Blockchain Developer"],
    topEmployers: IT_EMPLOYERS.slice(3, 9),
    dataSource: "Web3Africa · LinkedIn · AngelList Africa",
    lastUpdated: "Mar 2025",
  },
  "DevOps Engineer": {
    salaryKES: 230, salaryReportedCount: 380, salaryTrend: 24,
    marketDemand: 87, demandTrend: 9, cagr: 41, jobOpenings: 740,
    trajectory: [
      { stage: "Entry", years: "0–1 yr", salaryKES: 84 },
      { stage: "Mid", years: "2–4 yr", salaryKES: 129 },
      { stage: "Senior", years: "5–7 yr", salaryKES: 224 },
      { stage: "Lead", years: "8+ yr", salaryKES: 347 },
    ],
    regionalSalaries: buildRegional(230),
    skillsInDemand: SKILL_DEMAND["DevOps Engineer"],
    topEmployers: IT_EMPLOYERS.slice(1, 7),
    dataSource: "LinkedIn East Africa · Andela 2024 Report",
    lastUpdated: "Mar 2025",
  },
  "AI Engineer": {
    salaryKES: 300, salaryReportedCount: 240, salaryTrend: 38,
    marketDemand: 85, demandTrend: 18, cagr: 60, jobOpenings: 520,
    trajectory: [
      { stage: "Entry", years: "0–1 yr", salaryKES: 112 },
      { stage: "Mid", years: "2–4 yr", salaryKES: 168 },
      { stage: "Senior", years: "5–7 yr", salaryKES: 291 },
      { stage: "Lead", years: "8+ yr", salaryKES: 459 },
    ],
    regionalSalaries: buildRegional(300),
    skillsInDemand: SKILL_DEMAND["AI Engineer"],
    topEmployers: [...IT_EMPLOYERS.slice(2, 5), ...IT_EMPLOYERS.slice(6, 9)],
    dataSource: "Andela AI Report 2024 · LinkedIn Insight Tag",
    lastUpdated: "Mar 2025",
  },
  "Machine Learning Engineer": {
    salaryKES: 290, salaryReportedCount: 260, salaryTrend: 36,
    marketDemand: 84, demandTrend: 16, cagr: 58, jobOpenings: 490,
    trajectory: [
      { stage: "Entry", years: "0–1 yr", salaryKES: 108 },
      { stage: "Mid", years: "2–4 yr", salaryKES: 162 },
      { stage: "Senior", years: "5–7 yr", salaryKES: 280 },
      { stage: "Lead", years: "8+ yr", salaryKES: 442 },
    ],
    regionalSalaries: buildRegional(290),
    skillsInDemand: SKILL_DEMAND["Machine Learning Engineer"],
    topEmployers: IT_EMPLOYERS.slice(2, 8),
    dataSource: "Andela AI Report 2024 · LinkedIn",
    lastUpdated: "Mar 2025",
  },
  "Software Engineer": {
    salaryKES: 190, salaryReportedCount: 1100, salaryTrend: 19,
    marketDemand: 96, demandTrend: 11, cagr: 35, jobOpenings: 3200,
    trajectory: [
      { stage: "Entry", years: "0–1 yr", salaryKES: 70 },
      { stage: "Mid", years: "2–4 yr", salaryKES: 106 },
      { stage: "Senior", years: "5–7 yr", salaryKES: 179 },
      { stage: "Lead", years: "8+ yr", salaryKES: 291 },
    ],
    regionalSalaries: buildRegional(190),
    skillsInDemand: SKILL_DEMAND["Software Engineer"],
    topEmployers: IT_EMPLOYERS.slice(0, 6),
    dataSource: "Stack Overflow Survey · LinkedIn East Africa",
    lastUpdated: "Mar 2025",
  },
  "Data Engineer": {
    salaryKES: 210, salaryReportedCount: 320, salaryTrend: 24,
    marketDemand: 88, demandTrend: 10, cagr: 42, jobOpenings: 680,
    trajectory: [
      { stage: "Entry", years: "0–1 yr", salaryKES: 77 },
      { stage: "Mid", years: "2–4 yr", salaryKES: 118 },
      { stage: "Senior", years: "5–7 yr", salaryKES: 202 },
      { stage: "Lead", years: "8+ yr", salaryKES: 325 },
    ],
    regionalSalaries: buildRegional(210),
    skillsInDemand: SKILL_DEMAND["Data Engineer"],
    topEmployers: [...IT_EMPLOYERS.slice(0, 4), ...IT_EMPLOYERS.slice(7, 10)],
    dataSource: "LinkedIn · dbt Community Survey",
    lastUpdated: "Mar 2025",
  },
  "Financial Analyst": {
    salaryKES: 160, salaryReportedCount: 780, salaryTrend: 14,
    marketDemand: 82, demandTrend: 4, cagr: 28, jobOpenings: 1420,
    trajectory: [
      { stage: "Entry", years: "0–1 yr", salaryKES: 56 },
      { stage: "Mid", years: "2–4 yr", salaryKES: 90 },
      { stage: "Senior", years: "5–7 yr", salaryKES: 157 },
      { stage: "Lead", years: "8+ yr", salaryKES: 252 },
    ],
    regionalSalaries: buildRegional(160),
    skillsInDemand: SKILL_DEMAND["Financial Analyst"],
    topEmployers: FINANCE_EMPLOYERS.slice(0, 6),
    dataSource: "CFA Institute Africa · LinkedIn · JobsInKenya",
    lastUpdated: "Mar 2025",
  },
  "Investment Banker": {
    salaryKES: 350, salaryReportedCount: 210, salaryTrend: 18,
    marketDemand: 68, demandTrend: 3, cagr: 35, jobOpenings: 320,
    trajectory: [
      { stage: "Entry", years: "0–1 yr", salaryKES: 105 },
      { stage: "Mid", years: "2–4 yr", salaryKES: 196 },
      { stage: "Senior", years: "5–7 yr", salaryKES: 336 },
      { stage: "Lead", years: "8+ yr", salaryKES: 672 },
    ],
    regionalSalaries: buildRegional(350),
    skillsInDemand: SKILL_DEMAND["Investment Banker"],
    topEmployers: FINANCE_EMPLOYERS.slice(5, 11),
    dataSource: "Bloomberg Africa · Mergermarket · LinkedIn",
    lastUpdated: "Mar 2025",
  },
  "Accountant": {
    salaryKES: 120, salaryReportedCount: 1400, salaryTrend: 10,
    marketDemand: 90, demandTrend: 2, cagr: 18, jobOpenings: 2800,
    trajectory: [
      { stage: "Entry", years: "0–1 yr", salaryKES: 42 },
      { stage: "Mid", years: "2–4 yr", salaryKES: 67 },
      { stage: "Senior", years: "5–7 yr", salaryKES: 112 },
      { stage: "Lead", years: "8+ yr", salaryKES: 179 },
    ],
    regionalSalaries: buildRegional(120),
    skillsInDemand: SKILL_DEMAND["Accountant"],
    topEmployers: FINANCE_EMPLOYERS.slice(2, 8),
    dataSource: "ICPAK · LinkedIn · Glassdoor Africa",
    lastUpdated: "Mar 2025",
  },
  "Auditor": {
    salaryKES: 140, salaryReportedCount: 620, salaryTrend: 12,
    marketDemand: 88, demandTrend: 3, cagr: 22, jobOpenings: 1180,
    trajectory: [
      { stage: "Entry", years: "0–1 yr", salaryKES: 49 },
      { stage: "Mid", years: "2–4 yr", salaryKES: 78 },
      { stage: "Senior", years: "5–7 yr", salaryKES: 134 },
      { stage: "Lead", years: "8+ yr", salaryKES: 213 },
    ],
    regionalSalaries: buildRegional(140),
    skillsInDemand: SKILL_DEMAND["Auditor"],
    topEmployers: FINANCE_EMPLOYERS.slice(2, 8),
    dataSource: "ICPAK · KPMG Africa Pay Survey · LinkedIn",
    lastUpdated: "Mar 2025",
  },
  "Business Analyst": {
    salaryKES: 170, salaryReportedCount: 560, salaryTrend: 16,
    marketDemand: 85, demandTrend: 7, cagr: 33, jobOpenings: 1050,
    trajectory: [
      { stage: "Entry", years: "0–1 yr", salaryKES: 63 },
      { stage: "Mid", years: "2–4 yr", salaryKES: 95 },
      { stage: "Senior", years: "5–7 yr", salaryKES: 162 },
      { stage: "Lead", years: "8+ yr", salaryKES: 263 },
    ],
    regionalSalaries: buildRegional(170),
    skillsInDemand: SKILL_DEMAND["Business Analyst"],
    topEmployers: [...FINANCE_EMPLOYERS.slice(0, 3), ...IT_EMPLOYERS.slice(0, 3)],
    dataSource: "LinkedIn · IIBA East Africa Chapter",
    lastUpdated: "Mar 2025",
  },
  "Risk Analyst": {
    salaryKES: 200, salaryReportedCount: 340, salaryTrend: 16,
    marketDemand: 78, demandTrend: 5, cagr: 30, jobOpenings: 560,
    trajectory: [
      { stage: "Entry", years: "0–1 yr", salaryKES: 70 },
      { stage: "Mid", years: "2–4 yr", salaryKES: 112 },
      { stage: "Senior", years: "5–7 yr", salaryKES: 196 },
      { stage: "Lead", years: "8+ yr", salaryKES: 314 },
    ],
    regionalSalaries: buildRegional(200),
    skillsInDemand: SKILL_DEMAND["Risk Analyst"],
    topEmployers: FINANCE_EMPLOYERS.slice(6, 12),
    dataSource: "PRMIA Africa · LinkedIn · World Bank Reports",
    lastUpdated: "Mar 2025",
  },
  "Actuary": {
    salaryKES: 280, salaryReportedCount: 180, salaryTrend: 14,
    marketDemand: 72, demandTrend: 4, cagr: 28, jobOpenings: 280,
    trajectory: [
      { stage: "Entry", years: "0–1 yr", salaryKES: 91 },
      { stage: "Mid", years: "2–4 yr", salaryKES: 157 },
      { stage: "Senior", years: "5–7 yr", salaryKES: 269 },
      { stage: "Lead", years: "8+ yr", salaryKES: 420 },
    ],
    regionalSalaries: buildRegional(280),
    skillsInDemand: SKILL_DEMAND["Actuary"],
    topEmployers: [...FINANCE_EMPLOYERS.slice(8, 12), ...FINANCE_EMPLOYERS.slice(4, 6)],
    dataSource: "Actuarial Society of Kenya · LinkedIn",
    lastUpdated: "Mar 2025",
  },
  "Economist": {
    salaryKES: 180, salaryReportedCount: 420, salaryTrend: 12,
    marketDemand: 65, demandTrend: 3, cagr: 25, jobOpenings: 480,
    trajectory: [
      { stage: "Entry", years: "0–1 yr", salaryKES: 63 },
      { stage: "Mid", years: "2–4 yr", salaryKES: 101 },
      { stage: "Senior", years: "5–7 yr", salaryKES: 174 },
      { stage: "Lead", years: "8+ yr", salaryKES: 274 },
    ],
    regionalSalaries: buildRegional(180),
    skillsInDemand: SKILL_DEMAND["Economist"],
    topEmployers: [...FINANCE_EMPLOYERS.slice(0, 2), ...FINANCE_EMPLOYERS.slice(6, 8)],
    dataSource: "World Bank · IMF Africa · LinkedIn",
    lastUpdated: "Mar 2025",
  },
  "Civil Engineering": {
    salaryKES: 150, salaryReportedCount: 560, salaryTrend: 12,
    marketDemand: 85, demandTrend: 6, cagr: 20, jobOpenings: 1600,
    trajectory: [
      { stage: "Entry", years: "0–1 yr", salaryKES: 56 },
      { stage: "Mid", years: "2–4 yr", salaryKES: 84 },
      { stage: "Senior", years: "5–7 yr", salaryKES: 146 },
      { stage: "Lead", years: "8+ yr", salaryKES: 235 },
    ],
    regionalSalaries: buildRegional(150),
    skillsInDemand: SKILL_DEMAND["Civil Engineering"],
    topEmployers: ENGINEERING_EMPLOYERS.slice(4, 10),
    dataSource: "EBK (Engineers Board of Kenya) · LinkedIn",
    lastUpdated: "Mar 2025",
  },
  "Mechanical Engineering": {
    salaryKES: 160, salaryReportedCount: 480, salaryTrend: 11,
    marketDemand: 78, demandTrend: 4, cagr: 18, jobOpenings: 980,
    trajectory: [
      { stage: "Entry", years: "0–1 yr", salaryKES: 59 },
      { stage: "Mid", years: "2–4 yr", salaryKES: 90 },
      { stage: "Senior", years: "5–7 yr", salaryKES: 151 },
      { stage: "Lead", years: "8+ yr", salaryKES: 246 },
    ],
    regionalSalaries: buildRegional(160),
    skillsInDemand: SKILL_DEMAND["Mechanical Engineering"],
    topEmployers: [...ENGINEERING_EMPLOYERS.slice(3, 6), ...ENGINEERING_EMPLOYERS.slice(7, 10)],
    dataSource: "EBK · LinkedIn · ManufacturingAfrica",
    lastUpdated: "Mar 2025",
  },
  "Electrical Engineering": {
    salaryKES: 170, salaryReportedCount: 520, salaryTrend: 14,
    marketDemand: 82, demandTrend: 7, cagr: 25, jobOpenings: 1200,
    trajectory: [
      { stage: "Entry", years: "0–1 yr", salaryKES: 63 },
      { stage: "Mid", years: "2–4 yr", salaryKES: 95 },
      { stage: "Senior", years: "5–7 yr", salaryKES: 162 },
      { stage: "Lead", years: "8+ yr", salaryKES: 263 },
    ],
    regionalSalaries: buildRegional(170),
    skillsInDemand: SKILL_DEMAND["Electrical Engineering"],
    topEmployers: ENGINEERING_EMPLOYERS.slice(0, 6),
    dataSource: "Kenya Power · EBK · LinkedIn Jobs",
    lastUpdated: "Mar 2025",
  },
  "Computer Engineering": {
    salaryKES: 180, salaryReportedCount: 380, salaryTrend: 18,
    marketDemand: 86, demandTrend: 9, cagr: 32, jobOpenings: 860,
    trajectory: [
      { stage: "Entry", years: "0–1 yr", salaryKES: 66 },
      { stage: "Mid", years: "2–4 yr", salaryKES: 101 },
      { stage: "Senior", years: "5–7 yr", salaryKES: 174 },
      { stage: "Lead", years: "8+ yr", salaryKES: 280 },
    ],
    regionalSalaries: buildRegional(180),
    skillsInDemand: SKILL_DEMAND["Computer Engineering"],
    topEmployers: [...IT_EMPLOYERS.slice(0, 3), ...ENGINEERING_EMPLOYERS.slice(0, 3)],
    dataSource: "EBK · LinkedIn · Andela",
    lastUpdated: "Mar 2025",
  },
  "Chemical Engineering": {
    salaryKES: 145, salaryReportedCount: 320, salaryTrend: 9,
    marketDemand: 70, demandTrend: 3, cagr: 15, jobOpenings: 580,
    trajectory: [
      { stage: "Entry", years: "0–1 yr", salaryKES: 52 },
      { stage: "Mid", years: "2–4 yr", salaryKES: 82 },
      { stage: "Senior", years: "5–7 yr", salaryKES: 140 },
      { stage: "Lead", years: "8+ yr", salaryKES: 224 },
    ],
    regionalSalaries: buildRegional(145),
    skillsInDemand: SKILL_DEMAND["Chemical Engineering"],
    topEmployers: [...ENGINEERING_EMPLOYERS.slice(3, 5), ...ENGINEERING_EMPLOYERS.slice(6, 9)],
    dataSource: "EBK · Chemicals Africa · LinkedIn",
    lastUpdated: "Mar 2025",
  },
  "Industrial Engineering": {
    salaryKES: 155, salaryReportedCount: 360, salaryTrend: 13,
    marketDemand: 72, demandTrend: 5, cagr: 22, jobOpenings: 720,
    trajectory: [
      { stage: "Entry", years: "0–1 yr", salaryKES: 56 },
      { stage: "Mid", years: "2–4 yr", salaryKES: 86 },
      { stage: "Senior", years: "5–7 yr", salaryKES: 149 },
      { stage: "Lead", years: "8+ yr", salaryKES: 238 },
    ],
    regionalSalaries: buildRegional(155),
    skillsInDemand: SKILL_DEMAND["Industrial Engineering"],
    topEmployers: ENGINEERING_EMPLOYERS.slice(5, 11),
    dataSource: "APICS Africa · LinkedIn · ManufacturingAfrica",
    lastUpdated: "Mar 2025",
  },
  "Environmental Engineering": {
    salaryKES: 140, salaryReportedCount: 280, salaryTrend: 15,
    marketDemand: 75, demandTrend: 8, cagr: 28, jobOpenings: 640,
    trajectory: [
      { stage: "Entry", years: "0–1 yr", salaryKES: 52 },
      { stage: "Mid", years: "2–4 yr", salaryKES: 78 },
      { stage: "Senior", years: "5–7 yr", salaryKES: 134 },
      { stage: "Lead", years: "8+ yr", salaryKES: 213 },
    ],
    regionalSalaries: buildRegional(140),
    skillsInDemand: SKILL_DEMAND["Environmental Engineering"],
    topEmployers: [...ENGINEERING_EMPLOYERS.slice(0, 2), ...ENGINEERING_EMPLOYERS.slice(8, 11)],
    dataSource: "NEMA Kenya · World Bank Climate Reports · LinkedIn",
    lastUpdated: "Mar 2025",
  },
  "Biomedical Engineering": {
    salaryKES: 165, salaryReportedCount: 220, salaryTrend: 18,
    marketDemand: 68, demandTrend: 10, cagr: 30, jobOpenings: 380,
    trajectory: [
      { stage: "Entry", years: "0–1 yr", salaryKES: 56 },
      { stage: "Mid", years: "2–4 yr", salaryKES: 92 },
      { stage: "Senior", years: "5–7 yr", salaryKES: 157 },
      { stage: "Lead", years: "8+ yr", salaryKES: 252 },
    ],
    regionalSalaries: buildRegional(165),
    skillsInDemand: SKILL_DEMAND["Biomedical Engineering"],
    topEmployers: ENGINEERING_EMPLOYERS.slice(0, 6),
    dataSource: "WHO Africa · EBK · LinkedIn",
    lastUpdated: "Mar 2025",
  },
};

// ── Currency configuration ───────────────────────────────────────────────────
export interface Currency {
  code: string;
  symbol: string;
  name: string;
  rateFromKES: number; // 1 KES = X currency
}

export const CURRENCIES: Currency[] = [
  { code: "KES", symbol: "KES",  name: "Kenyan Shilling",      rateFromKES: 1 },
  { code: "USD", symbol: "$",    name: "US Dollar",             rateFromKES: 0.00775 },
  { code: "EUR", symbol: "€",    name: "Euro",                  rateFromKES: 0.00715 },
  { code: "GBP", symbol: "£",    name: "British Pound",         rateFromKES: 0.00614 },
  { code: "UGX", symbol: "UGX",  name: "Ugandan Shilling",      rateFromKES: 29.2 },
  { code: "TZS", symbol: "TZS",  name: "Tanzanian Shilling",    rateFromKES: 18.9 },
  { code: "RWF", symbol: "RWF",  name: "Rwandan Franc",         rateFromKES: 13.5 },
  { code: "ETB", symbol: "ETB",  name: "Ethiopian Birr",        rateFromKES: 0.54 },
  { code: "ZAR", symbol: "R",    name: "South African Rand",    rateFromKES: 0.143 },
];

export function convertSalary(amountKES: number, currency: Currency): string {
  const converted = amountKES * 1000 * currency.rateFromKES; // ×1000 because stored in thousands
  if (converted >= 1_000_000) return `${currency.symbol} ${(converted / 1_000_000).toFixed(2)}M`;
  if (converted >= 1_000)     return `${currency.symbol} ${Math.round(converted / 1000)}k`;
  return `${currency.symbol} ${Math.round(converted).toLocaleString()}`;
}

export function formatSalaryShort(amountKES: number, currency: Currency): string {
  const raw = amountKES * 1000 * currency.rateFromKES;
  if (raw >= 1_000_000) return `${currency.symbol}${(raw / 1_000_000).toFixed(1)}M`;
  if (raw >= 1_000)     return `${currency.symbol}${(raw / 1000).toFixed(0)}k`;
  return `${currency.symbol}${Math.round(raw).toLocaleString()}`;
}
