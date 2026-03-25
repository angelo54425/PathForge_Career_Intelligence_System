// ─────────────────────────────────────────────────────────────────────────────
// PathForge — East Africa University Dataset
// Full metrics for head-to-head comparison across all universities.
// ─────────────────────────────────────────────────────────────────────────────

export type Alignment = "High" | "Medium" | "Low";
export type ResearchLevel = "Very High" | "High" | "Medium" | "Low";

export interface UniversityData {
  id: string;
  abbr: string;
  name: string;           // short display name
  fullName: string;
  country: "Kenya" | "Rwanda" | "Uganda" | "Tanzania";
  website: string;
  programs: string[];     // programs offered
  type: "Public" | "Private" | "International";
  founded: number;
  students: string;       // e.g. "5,000+"
  metrics: {
    overall: number;        // 0-100
    alignment: Alignment;
    employability: string;  // "96% placed"
    employabilityScore: number; // 0-100
    roi: string;            // "9.5x"
    roiScore: number;       // 0-100
    research: ResearchLevel;
    researchScore: number;  // 0-100
    tuition: string;        // formatted string
    tuitionScore: number;   // 0-100 (higher = better value)
    facilities: number;     // 0-100
    studentLife: number;    // 0-100
    academics: number;      // 0-100
    internationalRank: string;
  };
  radar: [number, number, number, number, number, number]; // Academics, Employability, Facilities, ROI, StudentLife, Research
  badge?: string;
  badgeColor?: string;
  colorClass: string;     // Tailwind bg+text classes
  description: string;
  strengths: string[];
}

export const UNIVERSITIES: UniversityData[] = [
  {
    id: "cmu",
    abbr: "CMU",
    name: "CMU Rwanda",
    fullName: "Carnegie Mellon University Rwanda",
    country: "Rwanda",
    website: "https://www.africa.engineering.cmu.edu",
    programs: ["BSc Computer Science", "BSc Data Science", "BSc Artificial Intelligence", "BSc Information Technology", "BSc Software Engineering"],
    type: "International",
    founded: 2011,
    students: "300+",
    metrics: {
      overall: 94,
      alignment: "High",
      employability: "97% placed",
      employabilityScore: 97,
      roi: "9.8x",
      roiScore: 92,
      research: "Very High",
      researchScore: 94,
      tuition: "USD 15,000/yr",
      tuitionScore: 45,
      facilities: 93,
      studentLife: 82,
      academics: 96,
      internationalRank: "Top 25 CS (US)",
    },
    radar: [96, 97, 93, 92, 82, 94],
    badge: "BEST OVERALL",
    badgeColor: "bg-primary",
    colorClass: "bg-red-100 text-red-700",
    description: "Africa's only Carnegie Mellon campus, offering world-class US-standard degrees with a focus on engineering and computer science.",
    strengths: ["US-accredited degree", "Top tech employer networks", "Research excellence", "Silicon Valley partnerships"],
  },
  {
    id: "uon",
    abbr: "UoN",
    name: "Uni of Nairobi",
    fullName: "University of Nairobi",
    country: "Kenya",
    website: "https://www.uonbi.ac.ke",
    programs: ["BSc Computer Science", "BSc Software Engineering", "BSc Information Technology", "BSc Data Science", "BSc Cybersecurity", "BBA Business Administration", "BCom Finance", "BSc Economics", "BEng Electrical Engineering"],
    type: "Public",
    founded: 1956,
    students: "84,000+",
    metrics: {
      overall: 87,
      alignment: "High",
      employability: "91% placed",
      employabilityScore: 91,
      roi: "8.1x",
      roiScore: 81,
      research: "Very High",
      researchScore: 89,
      tuition: "KES 120,000/yr",
      tuitionScore: 92,
      facilities: 83,
      studentLife: 88,
      academics: 87,
      internationalRank: "Top 5 East Africa",
    },
    radar: [87, 91, 83, 81, 88, 89],
    badge: "BEST RESEARCH",
    badgeColor: "bg-emerald-500",
    colorClass: "bg-green-100 text-green-700",
    description: "Kenya's oldest and largest public university with a strong reputation in engineering, science, and business programs.",
    strengths: ["Largest alumni network in Kenya", "Strong research output", "Broad program range", "Nairobi tech ecosystem access"],
  },
  {
    id: "makerere",
    abbr: "MUK",
    name: "Makerere Univ.",
    fullName: "Makerere University",
    country: "Uganda",
    website: "https://www.mak.ac.ug",
    programs: ["BSc Computer Science", "BSc Software Engineering", "BSc Information Technology", "BSc Data Science", "BBA Business Administration", "BCom Accounting", "BSc Economics", "BSc Business Analytics", "BEng Electrical Engineering"],
    type: "Public",
    founded: 1922,
    students: "36,000+",
    metrics: {
      overall: 88,
      alignment: "High",
      employability: "89% placed",
      employabilityScore: 89,
      roi: "8.3x",
      roiScore: 83,
      research: "High",
      researchScore: 86,
      tuition: "UGX 3,500,000/yr",
      tuitionScore: 90,
      facilities: 84,
      studentLife: 87,
      academics: 88,
      internationalRank: "Top 3 East Africa",
    },
    radar: [88, 89, 84, 83, 87, 86],
    badge: "BEST VALUE",
    badgeColor: "bg-violet-500",
    colorClass: "bg-blue-100 text-blue-700",
    description: "East Africa's oldest and most prestigious university, known for producing regional leaders in business, technology, and sciences.",
    strengths: ["Historical prestige", "Large alumni network", "Affordable quality education", "Strong industry links"],
  },
  {
    id: "jkuat",
    abbr: "JKUAT",
    name: "JKUAT",
    fullName: "Jomo Kenyatta University of Agriculture and Technology",
    country: "Kenya",
    website: "https://www.jkuat.ac.ke",
    programs: ["BSc Computer Science", "BSc Software Engineering", "BSc Information Technology", "BSc Data Science", "BSc Cybersecurity", "BEng Electrical Engineering", "BEng Industrial Engineering", "BSc Business Analytics"],
    type: "Public",
    founded: 1981,
    students: "50,000+",
    metrics: {
      overall: 83,
      alignment: "High",
      employability: "86% placed",
      employabilityScore: 86,
      roi: "7.8x",
      roiScore: 78,
      research: "High",
      researchScore: 82,
      tuition: "KES 100,000/yr",
      tuitionScore: 93,
      facilities: 82,
      studentLife: 81,
      academics: 84,
      internationalRank: "Top 10 East Africa",
    },
    radar: [84, 86, 82, 78, 81, 82],
    colorClass: "bg-amber-100 text-amber-700",
    description: "Kenya's leading technical university with a strong focus on STEM, engineering, and applied sciences.",
    strengths: ["Strong STEM programs", "Industry partnerships", "Affordable fees", "Active tech community"],
  },
  {
    id: "nmaist",
    abbr: "NM-AIST",
    name: "NM-AIST",
    fullName: "Nelson Mandela African Institution of Science and Technology",
    country: "Tanzania",
    website: "https://www.nm-aist.ac.tz",
    programs: ["BSc Computer Science", "BSc Information Technology", "BSc Artificial Intelligence", "BSc Data Science", "BEng Electrical Engineering", "BEng Industrial Engineering"],
    type: "Public",
    founded: 2010,
    students: "1,500+",
    metrics: {
      overall: 85,
      alignment: "High",
      employability: "88% placed",
      employabilityScore: 88,
      roi: "8.0x",
      roiScore: 80,
      research: "Very High",
      researchScore: 91,
      tuition: "USD 3,500/yr",
      tuitionScore: 72,
      facilities: 85,
      studentLife: 74,
      academics: 87,
      internationalRank: "Top STEM in East Africa",
    },
    radar: [87, 88, 85, 80, 74, 91],
    colorClass: "bg-teal-100 text-teal-700",
    description: "A postgraduate-focused science and technology institution modelled after South Africa's Nelson Mandela University with strong research output.",
    strengths: ["Research-intensive", "Modern facilities", "STEM specialization", "International collaborations"],
  },
  {
    id: "alu",
    abbr: "ALU",
    name: "African Leadership Univ.",
    fullName: "African Leadership University",
    country: "Rwanda",
    website: "https://www.alueducation.com",
    programs: ["BSc Computer Science", "BSc Software Engineering", "BSc Artificial Intelligence", "BSc Business Analytics", "BBA Business Administration", "BSc Data Science"],
    type: "Private",
    founded: 2015,
    students: "2,000+",
    metrics: {
      overall: 84,
      alignment: "High",
      employability: "90% placed",
      employabilityScore: 90,
      roi: "8.5x",
      roiScore: 85,
      research: "Medium",
      researchScore: 68,
      tuition: "USD 8,000/yr",
      tuitionScore: 61,
      facilities: 88,
      studentLife: 93,
      academics: 83,
      internationalRank: "Top Private in Africa",
    },
    radar: [83, 90, 88, 85, 93, 68],
    colorClass: "bg-purple-100 text-purple-700",
    description: "An innovative pan-African university focused on entrepreneurship, leadership, and technology for the next generation of African leaders.",
    strengths: ["Entrepreneurship focus", "Pan-African network", "Project-based learning", "Career support"],
  },
  {
    id: "ur",
    abbr: "UR",
    name: "Uni of Rwanda",
    fullName: "University of Rwanda",
    country: "Rwanda",
    website: "https://ur.ac.rw",
    programs: ["BSc Computer Science", "BSc Information Technology", "BSc Software Engineering", "BSc Data Science", "BCom Accounting", "BCom Finance", "BSc Economics", "BEng Electrical Engineering", "BEng Industrial Engineering"],
    type: "Public",
    founded: 2013,
    students: "30,000+",
    metrics: {
      overall: 80,
      alignment: "High",
      employability: "82% placed",
      employabilityScore: 82,
      roi: "7.5x",
      roiScore: 75,
      research: "High",
      researchScore: 78,
      tuition: "RWF 600,000/yr",
      tuitionScore: 94,
      facilities: 78,
      studentLife: 79,
      academics: 81,
      internationalRank: "Top in Rwanda",
    },
    radar: [81, 82, 78, 75, 79, 78],
    colorClass: "bg-cyan-100 text-cyan-700",
    description: "Rwanda's national university formed through the merger of several higher institutions, offering broad programs with a focus on national development.",
    strengths: ["Most affordable in Rwanda", "Government support", "Broad program range", "Rwanda Vision 2050 aligned"],
  },
  {
    id: "udsm",
    abbr: "UDSM",
    name: "Uni of Dar es Salaam",
    fullName: "University of Dar es Salaam",
    country: "Tanzania",
    website: "https://www.udsm.ac.tz",
    programs: ["BSc Computer Science", "BSc Information Technology", "BSc Software Engineering", "BCom Accounting", "BCom Finance", "BSc Economics", "BEng Electrical Engineering", "BEng Environmental Engineering"],
    type: "Public",
    founded: 1961,
    students: "24,000+",
    metrics: {
      overall: 81,
      alignment: "High",
      employability: "84% placed",
      employabilityScore: 84,
      roi: "7.6x",
      roiScore: 76,
      research: "High",
      researchScore: 82,
      tuition: "TZS 1,500,000/yr",
      tuitionScore: 91,
      facilities: 77,
      studentLife: 80,
      academics: 82,
      internationalRank: "Top 3 Tanzania",
    },
    radar: [82, 84, 77, 76, 80, 82],
    colorClass: "bg-lime-100 text-lime-700",
    description: "Tanzania's oldest and most prestigious public university with strong programs in engineering, sciences, and social sciences.",
    strengths: ["Tanzania's top research university", "Strong engineering faculty", "Affordable fees", "Industry partnerships"],
  },
  {
    id: "ku",
    abbr: "KU",
    name: "Kenyatta Univ.",
    fullName: "Kenyatta University",
    country: "Kenya",
    website: "https://www.ku.ac.ke",
    programs: ["BSc Computer Science", "BSc Information Technology", "BSc Software Engineering", "BSc Data Science", "BSc Business Analytics", "BCom Accounting", "BBA Business Administration", "BSc Economics"],
    type: "Public",
    founded: 1985,
    students: "60,000+",
    metrics: {
      overall: 79,
      alignment: "Medium",
      employability: "81% placed",
      employabilityScore: 81,
      roi: "7.2x",
      roiScore: 72,
      research: "Medium",
      researchScore: 74,
      tuition: "KES 90,000/yr",
      tuitionScore: 94,
      facilities: 78,
      studentLife: 83,
      academics: 79,
      internationalRank: "Top 5 Kenya",
    },
    radar: [79, 81, 78, 72, 83, 74],
    colorClass: "bg-orange-100 text-orange-700",
    description: "One of Kenya's leading public universities with a large student body and strong programs in education, science, and business.",
    strengths: ["Large campus community", "Affordable education", "Wide program range", "Nairobi proximity"],
  },
  {
    id: "usiu",
    abbr: "USIU",
    name: "USIU Africa",
    fullName: "United States International University Africa",
    country: "Kenya",
    website: "https://www.usiu.ac.ke",
    programs: ["BSc Computer Science", "BSc Information Technology", "BSc Cybersecurity", "BSc Artificial Intelligence", "BBA Business Administration", "BCom Finance", "BSc Economics", "BSc Business Analytics"],
    type: "International",
    founded: 1969,
    students: "7,000+",
    metrics: {
      overall: 82,
      alignment: "High",
      employability: "88% placed",
      employabilityScore: 88,
      roi: "7.9x",
      roiScore: 79,
      research: "Medium",
      researchScore: 70,
      tuition: "USD 6,500/yr",
      tuitionScore: 58,
      facilities: 88,
      studentLife: 90,
      academics: 81,
      internationalRank: "Top Private in Kenya",
    },
    radar: [81, 88, 88, 79, 90, 70],
    colorClass: "bg-sky-100 text-sky-700",
    description: "A US-accredited private university offering American-style education in Nairobi with strong business and IT programs.",
    strengths: ["US accreditation", "International exposure", "Strong business school", "Excellent facilities"],
  },
  {
    id: "uok",
    abbr: "UoK",
    name: "Uni of Kigali",
    fullName: "University of Kigali",
    country: "Rwanda",
    website: "https://uok.ac.rw",
    programs: ["BSc Computer Science", "BSc Information Technology", "BSc Software Engineering", "BCom Accounting", "BCom Finance", "BBA Business Administration", "BSc Business Analytics"],
    type: "Private",
    founded: 2003,
    students: "12,000+",
    metrics: {
      overall: 74,
      alignment: "Medium",
      employability: "76% placed",
      employabilityScore: 76,
      roi: "7.0x",
      roiScore: 70,
      research: "Medium",
      researchScore: 65,
      tuition: "RWF 800,000/yr",
      tuitionScore: 88,
      facilities: 75,
      studentLife: 77,
      academics: 74,
      internationalRank: "Top Private Rwanda",
    },
    radar: [74, 76, 75, 70, 77, 65],
    colorClass: "bg-rose-100 text-rose-700",
    description: "Rwanda's leading private university offering flexible and career-oriented programs aligned with Rwanda's technology vision.",
    strengths: ["Flexible learning", "Growing tech ecosystem", "Affordable private option", "Practical curriculum"],
  },
  {
    id: "must",
    abbr: "MUST",
    name: "Mbarara Univ. of Sci. & Tech.",
    fullName: "Mbarara University of Science and Technology",
    country: "Uganda",
    website: "https://www.must.ac.ug",
    programs: ["BSc Computer Science", "BSc Information Technology", "BSc Software Engineering", "BSc Data Science", "BEng Electrical Engineering"],
    type: "Public",
    founded: 1989,
    students: "8,000+",
    metrics: {
      overall: 76,
      alignment: "Medium",
      employability: "78% placed",
      employabilityScore: 78,
      roi: "7.1x",
      roiScore: 71,
      research: "High",
      researchScore: 80,
      tuition: "UGX 2,800,000/yr",
      tuitionScore: 93,
      facilities: 74,
      studentLife: 72,
      academics: 77,
      internationalRank: "Top 3 Uganda",
    },
    radar: [77, 78, 74, 71, 72, 80],
    colorClass: "bg-indigo-100 text-indigo-700",
    description: "Uganda's leading science and technology university outside Kampala, with strong research programs and STEM focus.",
    strengths: ["STEM specialization", "Research partnerships", "Affordable fees", "Growing tech program"],
  },
  {
    id: "tuk",
    abbr: "TUK",
    name: "Technical Univ. of Kenya",
    fullName: "Technical University of Kenya",
    country: "Kenya",
    website: "https://tukenya.ac.ke",
    programs: ["BSc Computer Science", "BSc Information Technology", "BSc Software Engineering", "BEng Electrical Engineering", "BEng Industrial Engineering", "BSc Business Analytics"],
    type: "Public",
    founded: 1961,
    students: "18,000+",
    metrics: {
      overall: 75,
      alignment: "Medium",
      employability: "79% placed",
      employabilityScore: 79,
      roi: "7.0x",
      roiScore: 70,
      research: "Medium",
      researchScore: 69,
      tuition: "KES 85,000/yr",
      tuitionScore: 95,
      facilities: 76,
      studentLife: 74,
      academics: 76,
      internationalRank: "Top Technical Kenya",
    },
    radar: [76, 79, 76, 70, 74, 69],
    colorClass: "bg-fuchsia-100 text-fuchsia-700",
    description: "Kenya's premier technical university specializing in engineering and applied sciences with strong industry linkages.",
    strengths: ["Technical specialization", "Industry partnerships", "Most affordable in Kenya", "Practical training"],
  },
  {
    id: "moi",
    abbr: "Moi",
    name: "Moi University",
    fullName: "Moi University",
    country: "Kenya",
    website: "https://www.mu.ac.ke",
    programs: ["BSc Computer Science", "BSc Information Technology", "BSc Software Engineering", "BCom Accounting", "BCom Finance", "BBA Business Administration", "BSc Economics", "BEng Electrical Engineering"],
    type: "Public",
    founded: 1984,
    students: "40,000+",
    metrics: {
      overall: 73,
      alignment: "Medium",
      employability: "75% placed",
      employabilityScore: 75,
      roi: "6.8x",
      roiScore: 68,
      research: "Medium",
      researchScore: 71,
      tuition: "KES 88,000/yr",
      tuitionScore: 94,
      facilities: 72,
      studentLife: 77,
      academics: 74,
      internationalRank: "Top 7 Kenya",
    },
    radar: [74, 75, 72, 68, 77, 71],
    colorClass: "bg-yellow-100 text-yellow-700",
    description: "A major Kenyan public university in the Rift Valley region with diverse academic programs and a large student community.",
    strengths: ["Large alumni network", "Diverse programs", "Affordable education", "Peaceful campus"],
  },
  {
    id: "ucu",
    abbr: "UCU",
    name: "Uganda Christian Univ.",
    fullName: "Uganda Christian University",
    country: "Uganda",
    website: "https://ucu.ac.ug",
    programs: ["BSc Computer Science", "BSc Information Technology", "BSc Software Engineering", "BCom Accounting", "BBA Business Administration", "BSc Business Analytics"],
    type: "Private",
    founded: 1997,
    students: "14,000+",
    metrics: {
      overall: 71,
      alignment: "Medium",
      employability: "74% placed",
      employabilityScore: 74,
      roi: "6.6x",
      roiScore: 66,
      research: "Low",
      researchScore: 57,
      tuition: "UGX 4,200,000/yr",
      tuitionScore: 82,
      facilities: 76,
      studentLife: 80,
      academics: 72,
      internationalRank: "Top Private Uganda",
    },
    radar: [72, 74, 76, 66, 80, 57],
    colorClass: "bg-emerald-100 text-emerald-700",
    description: "Uganda's largest private university offering strong business and IT programs with excellent campus facilities.",
    strengths: ["Great campus life", "Strong business school", "Faith-based values", "Growing IT programs"],
  },
];

// ── Helper utilities ──────────────────────────────────────────────────────────

export const REGIONS = ["All Regions", "Kenya", "Rwanda", "Uganda", "Tanzania"] as const;
export type Region = typeof REGIONS[number];

export const PROGRAMS = [
  "All Programs", "BSc Computer Science", "BSc Information Technology", "BSc Software Engineering",
  "BSc Data Science", "BSc Cybersecurity", "BSc Artificial Intelligence",
  "BBA Business Administration", "BCom Accounting", "BCom Finance",
  "BSc Economics", "BSc Business Analytics",
  "BEng Electrical Engineering", "BEng Environmental Engineering", "BEng Industrial Engineering",
] as const;
export type Program = typeof PROGRAMS[number];

export const METRIC_ROWS = [
  { key: "overall",           label: "Overall Score",       icon: "workspace_premium", isScore: true },
  { key: "alignment",         label: "Industry Alignment",  icon: "timeline",          isScore: false },
  { key: "employability",     label: "Employability",       icon: "work",              isScore: false },
  { key: "research",          label: "Research Output",     icon: "biotech",           isScore: false },
  { key: "roi",               label: "ROI (10-year)",       icon: "payments",          isScore: false },
  { key: "tuition",           label: "Annual Tuition",      icon: "price_tag",         isScore: false },
  { key: "facilities",        label: "Facilities Score",    icon: "apartment",         isScore: true },
  { key: "studentLife",       label: "Student Life",        icon: "diversity_3",       isScore: true },
  { key: "internationalRank", label: "Regional Ranking",    icon: "emoji_events",      isScore: false },
] as const;

export function filterUniversities(
  universities: UniversityData[],
  region: Region,
  program: Program,
  search: string
): UniversityData[] {
  return universities.filter((u) => {
    if (region !== "All Regions" && u.country !== region) return false;
    if (program !== "All Programs" && !u.programs.includes(program)) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!u.fullName.toLowerCase().includes(q) && !u.programs.some((p) => p.toLowerCase().includes(q))) return false;
    }
    return true;
  });
}

export function getMetricValue(uni: UniversityData, key: string): string | number {
  const m = uni.metrics;
  switch (key) {
    case "overall":           return m.overall;
    case "alignment":         return m.alignment;
    case "employability":     return m.employability;
    case "research":          return m.research;
    case "roi":               return m.roi;
    case "tuition":           return m.tuition;
    case "facilities":        return m.facilities;
    case "studentLife":       return m.studentLife;
    case "internationalRank": return m.internationalRank;
    default:                  return "–";
  }
}

export function getMetricScore(uni: UniversityData, key: string): number {
  const m = uni.metrics;
  switch (key) {
    case "overall":       return m.overall;
    case "facilities":    return m.facilities;
    case "studentLife":   return m.studentLife;
    case "employability": return m.employabilityScore;
    case "research":      return m.researchScore;
    case "roi":           return m.roiScore;
    case "tuition":       return m.tuitionScore;
    default:              return 0;
  }
}

// CSV export helper
export function buildCSV(unis: UniversityData[]): string {
  const headers = ["University", "Country", "Type", "Programs", "Overall Score", "Alignment", "Employability", "ROI", "Research", "Annual Tuition", "Facilities", "Student Life", "Regional Ranking"];
  const rows = unis.map((u) => [
    u.fullName,
    u.country,
    u.type,
    u.programs.join("; "),
    u.metrics.overall,
    u.metrics.alignment,
    u.metrics.employability,
    u.metrics.roi,
    u.metrics.research,
    u.metrics.tuition,
    u.metrics.facilities,
    u.metrics.studentLife,
    u.metrics.internationalRank,
  ]);
  return [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
}
