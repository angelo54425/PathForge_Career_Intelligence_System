const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

/* ── Paths ────────────────────────────────────────────────────────────────── */
const SAMPLE_DIR = path.join(__dirname, 'Sample data');

/* ── CSV Parsing ──────────────────────────────────────────────────────────── */
function readCSV(filename) {
  const raw = fs.readFileSync(path.join(SAMPLE_DIR, filename), 'utf-8')
    .replace(/^\uFEFF/, '')
    .replace(/\r/g, '');
  const lines = raw.trim().split('\n');
  const headers = splitLine(lines[0]);
  return lines.slice(1).map(line => {
    const vals = splitLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h.trim()] = (vals[i] || '').trim(); });
    return obj;
  });
}

function splitLine(line) {
  const r = []; let c = '', q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === ',' && !q) { r.push(c); c = ''; }
    else c += ch;
  }
  r.push(c);
  return r;
}

/* ── Skill Name Formatting ────────────────────────────────────────────────── */
const SKILL_MAP = {
  python: 'Python', python_advanced: 'Advanced Python',
  sql: 'SQL', sql_advanced: 'Advanced SQL',
  javascript: 'JavaScript', html_css: 'HTML/CSS',
  ci_cd_pipelines: 'CI/CD Pipelines', nodejs: 'Node.js',
  nlp: 'NLP', mlops: 'MLOps',
  tensorflow: 'TensorFlow', pytorch: 'PyTorch',
  kubernetes: 'Kubernetes', docker: 'Docker',
  terraform: 'Terraform', tableau: 'Tableau',
  excel: 'Excel', excel_advanced: 'Advanced Excel',
  matlab: 'MATLAB', r_programming: 'R Programming',
  stata_r: 'Stata/R', react: 'React',
  solidworks: 'SolidWorks', autocad: 'AutoCAD',
  staad_pro: 'STAAD Pro', power_bi: 'Power BI',
  solidity: 'Solidity', ethereum: 'Ethereum',
  web3: 'Web3', vhdl_verilog: 'VHDL/Verilog',
  gaap_ifrs: 'GAAP/IFRS', solvency_ii: 'Solvency II',
  fda_regulations: 'FDA Regulations', fea_analysis: 'FEA Analysis',
  gis_mapping: 'GIS Mapping', erp_systems: 'ERP Systems',
  restful_apis: 'RESTful APIs', real_time_os: 'Real-Time OS',
  pcb_design: 'PCB Design', plc_programming: 'PLC Programming',
  fpga_programming: 'FPGA Programming', hvac_systems: 'HVAC Systems',
  var_analysis: 'VaR Analysis', linux_command_line: 'Linux CLI',
  version_control_git: 'Git', machine_learning: 'Machine Learning',
  machine_learning_fundamentals: 'ML Fundamentals',
  deep_learning: 'Deep Learning', computer_vision: 'Computer Vision',
  data_analysis: 'Data Analysis', data_cleaning: 'Data Cleaning',
  data_visualization: 'Data Visualization', database_design: 'Database Design',
  cloud_computing: 'Cloud Computing',
};

function fmtSkill(raw) {
  return SKILL_MAP[raw] || raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/* ── Score Normalization (sigmoid → friendly 0–1 range) ──────────────────── */
function normScore(raw) {
  if (raw === 0) return 0;
  return Math.round(1000 / (1 + Math.exp(-20 * (raw - 0.05)))) / 1000;
}

/* ── Fallback alignment (string-match for careers not in matrix) ─────────── */
function computeAlignment(required, curriculum) {
  let tot = 0, ws = 0;
  for (const r of required) {
    const m = curriculum.find(c => c.skill === r.skill);
    if (m) tot += m.coverage * r.requiredLevel;
    ws += r.requiredLevel;
  }
  return ws > 0 ? tot / ws : 0;
}

/* ── Career proxies (average nearby careers for Software Eng / Data Eng) ─── */
const CAREER_PROXIES = {
  'Software Engineer': ['Full Stack Developer', 'DevOps Engineer'],
  'Data Engineer': ['Data Scientist', 'DevOps Engineer', 'Data Analyst'],
};

function proxyScore(career, progKey, lookup) {
  const proxies = CAREER_PROXIES[career];
  if (!proxies) return null;
  let sum = 0, n = 0;
  for (const p of proxies) {
    const v = parseFloat(lookup[p]?.[progKey]);
    if (!isNaN(v)) { sum += v; n++; }
  }
  return n > 0 ? sum / n : null;
}

/* ── Careers (26 total) ──────────────────────────────────────────────────── */
const careersData = [
  // --- IT ---
  { name: 'Data Analyst', sector: 'IT', requiredSkills: [
    { skill: 'Python', requiredLevel: 0.8 },
    { skill: 'SQL', requiredLevel: 0.9 },
    { skill: 'Statistics', requiredLevel: 0.8 },
    { skill: 'Data Visualization', requiredLevel: 0.85 },
    { skill: 'Excel', requiredLevel: 0.8 },
  ]},
  { name: 'Data Scientist', sector: 'IT', requiredSkills: [
    { skill: 'Python', requiredLevel: 0.9 },
    { skill: 'Machine Learning', requiredLevel: 0.95 },
    { skill: 'Statistics', requiredLevel: 0.85 },
    { skill: 'SQL', requiredLevel: 0.85 },
    { skill: 'Data Visualization', requiredLevel: 0.8 },
    { skill: 'Cloud Computing', requiredLevel: 0.75 },
  ]},
  { name: 'Full Stack Developer', sector: 'IT', requiredSkills: [
    { skill: 'JavaScript', requiredLevel: 0.95 },
    { skill: 'Python', requiredLevel: 0.8 },
    { skill: 'SQL', requiredLevel: 0.8 },
    { skill: 'Cloud Computing', requiredLevel: 0.7 },
    { skill: 'Data Structures', requiredLevel: 0.85 },
    { skill: 'DevOps', requiredLevel: 0.7 },
  ]},
  { name: 'Cybersecurity Engineer', sector: 'IT', requiredSkills: [
    { skill: 'Network Security', requiredLevel: 0.95 },
    { skill: 'Python', requiredLevel: 0.75 },
    { skill: 'Cloud Security', requiredLevel: 0.85 },
    { skill: 'Cryptography', requiredLevel: 0.8 },
    { skill: 'Operating Systems', requiredLevel: 0.85 },
  ]},
  { name: 'Blockchain Developer', sector: 'IT', requiredSkills: [
    { skill: 'Solidity', requiredLevel: 0.9 },
    { skill: 'JavaScript', requiredLevel: 0.85 },
    { skill: 'Cryptography', requiredLevel: 0.85 },
    { skill: 'Data Structures', requiredLevel: 0.8 },
    { skill: 'Distributed Systems', requiredLevel: 0.85 },
  ]},
  { name: 'DevOps Engineer', sector: 'IT', requiredSkills: [
    { skill: 'Cloud Computing', requiredLevel: 0.95 },
    { skill: 'DevOps', requiredLevel: 0.95 },
    { skill: 'Python', requiredLevel: 0.8 },
    { skill: 'Linux', requiredLevel: 0.9 },
    { skill: 'Networking', requiredLevel: 0.8 },
  ]},
  { name: 'AI Engineer', sector: 'IT', requiredSkills: [
    { skill: 'Python', requiredLevel: 0.95 },
    { skill: 'Machine Learning', requiredLevel: 0.9 },
    { skill: 'Deep Learning', requiredLevel: 0.95 },
    { skill: 'Cloud Computing', requiredLevel: 0.8 },
    { skill: 'Mathematics', requiredLevel: 0.85 },
  ]},
  { name: 'Machine Learning Engineer', sector: 'IT', requiredSkills: [
    { skill: 'Python', requiredLevel: 0.95 },
    { skill: 'Machine Learning', requiredLevel: 0.95 },
    { skill: 'Deep Learning', requiredLevel: 0.9 },
    { skill: 'Statistics', requiredLevel: 0.85 },
    { skill: 'Cloud Computing', requiredLevel: 0.8 },
  ]},
  { name: 'Software Engineer', sector: 'IT', requiredSkills: [
    { skill: 'Python', requiredLevel: 0.8 },
    { skill: 'JavaScript', requiredLevel: 0.9 },
    { skill: 'SQL', requiredLevel: 0.7 },
    { skill: 'Cloud Computing', requiredLevel: 0.7 },
    { skill: 'Data Structures', requiredLevel: 0.9 },
  ]},
  { name: 'Data Engineer', sector: 'IT', requiredSkills: [
    { skill: 'Python', requiredLevel: 0.85 },
    { skill: 'SQL', requiredLevel: 0.9 },
    { skill: 'Data Pipelines', requiredLevel: 0.9 },
    { skill: 'Cloud Computing', requiredLevel: 0.85 },
    { skill: 'Spark/Big Data', requiredLevel: 0.8 },
  ]},

  // --- Business & Finance ---
  { name: 'Financial Analyst', sector: 'Business & Finance', requiredSkills: [
    { skill: 'Excel', requiredLevel: 0.9 },
    { skill: 'Statistics', requiredLevel: 0.8 },
    { skill: 'SQL', requiredLevel: 0.6 },
    { skill: 'Data Visualization', requiredLevel: 0.7 },
    { skill: 'Financial Modeling', requiredLevel: 0.9 },
  ]},
  { name: 'Investment Banker', sector: 'Business & Finance', requiredSkills: [
    { skill: 'Financial Modeling', requiredLevel: 0.95 },
    { skill: 'Excel', requiredLevel: 0.9 },
    { skill: 'Statistics', requiredLevel: 0.75 },
    { skill: 'Data Visualization', requiredLevel: 0.7 },
    { skill: 'Accounting', requiredLevel: 0.8 },
  ]},
  { name: 'Accountant', sector: 'Business & Finance', requiredSkills: [
    { skill: 'Accounting', requiredLevel: 0.95 },
    { skill: 'Excel', requiredLevel: 0.9 },
    { skill: 'Tax Law', requiredLevel: 0.85 },
    { skill: 'Financial Reporting', requiredLevel: 0.9 },
    { skill: 'SQL', requiredLevel: 0.5 },
  ]},
  { name: 'Auditor', sector: 'Business & Finance', requiredSkills: [
    { skill: 'Accounting', requiredLevel: 0.9 },
    { skill: 'Financial Reporting', requiredLevel: 0.9 },
    { skill: 'Excel', requiredLevel: 0.85 },
    { skill: 'Risk Management', requiredLevel: 0.8 },
    { skill: 'Compliance', requiredLevel: 0.85 },
  ]},
  { name: 'Business Analyst', sector: 'Business & Finance', requiredSkills: [
    { skill: 'SQL', requiredLevel: 0.8 },
    { skill: 'Data Visualization', requiredLevel: 0.8 },
    { skill: 'Excel', requiredLevel: 0.8 },
    { skill: 'Statistics', requiredLevel: 0.7 },
    { skill: 'Requirements Analysis', requiredLevel: 0.85 },
  ]},
  { name: 'Risk Analyst', sector: 'Business & Finance', requiredSkills: [
    { skill: 'Risk Management', requiredLevel: 0.95 },
    { skill: 'Statistics', requiredLevel: 0.85 },
    { skill: 'Excel', requiredLevel: 0.85 },
    { skill: 'Financial Modeling', requiredLevel: 0.8 },
    { skill: 'SQL', requiredLevel: 0.7 },
  ]},
  { name: 'Actuary', sector: 'Business & Finance', requiredSkills: [
    { skill: 'Mathematics', requiredLevel: 0.95 },
    { skill: 'Statistics', requiredLevel: 0.95 },
    { skill: 'Excel', requiredLevel: 0.85 },
    { skill: 'Risk Management', requiredLevel: 0.9 },
    { skill: 'Financial Modeling', requiredLevel: 0.85 },
  ]},
  { name: 'Economist', sector: 'Business & Finance', requiredSkills: [
    { skill: 'Statistics', requiredLevel: 0.9 },
    { skill: 'Mathematics', requiredLevel: 0.85 },
    { skill: 'Data Visualization', requiredLevel: 0.75 },
    { skill: 'Excel', requiredLevel: 0.8 },
    { skill: 'Python', requiredLevel: 0.7 },
  ]},

  // --- Engineering ---
  { name: 'Civil Engineering', sector: 'Engineering', requiredSkills: [
    { skill: 'CAD', requiredLevel: 0.9 },
    { skill: 'Structural Analysis', requiredLevel: 0.95 },
    { skill: 'Mathematics', requiredLevel: 0.85 },
    { skill: 'Project Management', requiredLevel: 0.8 },
    { skill: 'Geotechnics', requiredLevel: 0.8 },
  ]},
  { name: 'Mechanical Engineering', sector: 'Engineering', requiredSkills: [
    { skill: 'CAD', requiredLevel: 0.9 },
    { skill: 'Thermodynamics', requiredLevel: 0.85 },
    { skill: 'Materials Science', requiredLevel: 0.8 },
    { skill: 'Mathematics', requiredLevel: 0.85 },
    { skill: 'Fluid Mechanics', requiredLevel: 0.8 },
  ]},
  { name: 'Electrical Engineering', sector: 'Engineering', requiredSkills: [
    { skill: 'Circuit Design', requiredLevel: 0.95 },
    { skill: 'Mathematics', requiredLevel: 0.9 },
    { skill: 'Signal Processing', requiredLevel: 0.85 },
    { skill: 'CAD', requiredLevel: 0.8 },
    { skill: 'Embedded Systems', requiredLevel: 0.8 },
  ]},
  { name: 'Computer Engineering', sector: 'Engineering', requiredSkills: [
    { skill: 'Embedded Systems', requiredLevel: 0.9 },
    { skill: 'Python', requiredLevel: 0.8 },
    { skill: 'Circuit Design', requiredLevel: 0.8 },
    { skill: 'Data Structures', requiredLevel: 0.85 },
    { skill: 'Operating Systems', requiredLevel: 0.85 },
  ]},
  { name: 'Chemical Engineering', sector: 'Engineering', requiredSkills: [
    { skill: 'Chemistry', requiredLevel: 0.95 },
    { skill: 'Thermodynamics', requiredLevel: 0.9 },
    { skill: 'Mathematics', requiredLevel: 0.85 },
    { skill: 'Process Engineering', requiredLevel: 0.9 },
    { skill: 'Fluid Mechanics', requiredLevel: 0.8 },
  ]},
  { name: 'Industrial Engineering', sector: 'Engineering', requiredSkills: [
    { skill: 'Operations Research', requiredLevel: 0.9 },
    { skill: 'Statistics', requiredLevel: 0.85 },
    { skill: 'Project Management', requiredLevel: 0.85 },
    { skill: 'Mathematics', requiredLevel: 0.8 },
    { skill: 'Supply Chain Management', requiredLevel: 0.85 },
  ]},
  { name: 'Environmental Engineering', sector: 'Engineering', requiredSkills: [
    { skill: 'Environmental Science', requiredLevel: 0.95 },
    { skill: 'Chemistry', requiredLevel: 0.8 },
    { skill: 'CAD', requiredLevel: 0.75 },
    { skill: 'Mathematics', requiredLevel: 0.8 },
    { skill: 'Hydrology', requiredLevel: 0.85 },
  ]},
  { name: 'Biomedical Engineering', sector: 'Engineering', requiredSkills: [
    { skill: 'Biology', requiredLevel: 0.9 },
    { skill: 'CAD', requiredLevel: 0.8 },
    { skill: 'Mathematics', requiredLevel: 0.85 },
    { skill: 'Signal Processing', requiredLevel: 0.8 },
    { skill: 'Materials Science', requiredLevel: 0.8 },
  ]},
];

/* ── Main ─────────────────────────────────────────────────────────────────── */
async function main() {
  // Clear existing data
  await prisma.careerProgramAlignment.deleteMany();
  await prisma.program.deleteMany();
  await prisma.university.deleteMany();
  await prisma.career.deleteMany();

  // 1. Seed 26 careers
  for (const c of careersData) {
    await prisma.career.create({
      data: { name: c.name, sector: c.sector, requiredSkills: c.requiredSkills },
    });
  }

  // 2. Load sample data CSVs
  console.log('Loading sample data CSVs...');
  const progMeta = readCSV('program_metadata.csv');
  const progVecs = readCSV('program_vectors.csv');
  const alignMat = readCSV('alignment_matrix.csv');

  // 3. Build curriculum map from program vectors (top 10 non-zero skills per program)
  const currMap = {};
  for (const row of progVecs) {
    const key = row.program_university;
    const skills = [];
    for (const [col, val] of Object.entries(row)) {
      if (col === 'program_university') continue;
      const v = parseFloat(val);
      if (v > 0) skills.push({ skill: fmtSkill(col), coverage: v });
    }
    skills.sort((a, b) => b.coverage - a.coverage);
    currMap[key] = skills.slice(0, 10);
  }

  // 4. Group programs by university
  const uniMap = {};
  for (const row of progMeta) {
    if (!uniMap[row.university]) uniMap[row.university] = { region: row.region, programs: [] };
    uniMap[row.university].programs.push({
      name: row.program_name,
      key: row.program_university,
      curriculum: currMap[row.program_university] || [],
    });
  }

  // 5. Create universities & programs, track program DB IDs
  console.log(`Creating ${Object.keys(uniMap).length} universities...`);
  const progIdMap = {};
  for (const [uniName, data] of Object.entries(uniMap)) {
    const uni = await prisma.university.create({
      data: {
        name: uniName,
        region: data.region,
        programs: {
          create: data.programs.map(p => ({ name: p.name, curriculum: p.curriculum })),
        },
      },
      include: { programs: true },
    });
    for (const p of data.programs) {
      const dbProg = uni.programs.find(pr => pr.name === p.name);
      if (dbProg) progIdMap[p.key] = dbProg.id;
    }
  }

  // 6. Build alignment lookup: career → { progKey → rawScore }
  const alignLookup = {};
  for (const row of alignMat) {
    const career = row.career_name;
    alignLookup[career] = {};
    for (const [col, val] of Object.entries(row)) {
      if (col === 'career_name') continue;
      alignLookup[career][col] = parseFloat(val) || 0;
    }
  }

  // 7. Compute alignment records
  console.log('Computing alignment records...');
  const careers = await prisma.career.findMany();
  const records = [];
  for (const career of careers) {
    for (const [progKey, progId] of Object.entries(progIdMap)) {
      let raw = alignLookup[career.name]?.[progKey];

      // Fallback: average nearby careers for Software Engineer / Data Engineer
      if (raw === undefined || raw === null) {
        raw = proxyScore(career.name, progKey, alignLookup);
      }

      let score;
      if (raw !== null && raw !== undefined) {
        score = normScore(raw);
      } else {
        // Last resort: string-match career skills vs program curriculum
        score = computeAlignment(career.requiredSkills, currMap[progKey] || []);
      }

      records.push({ careerId: career.id, programId: progId, alignment: score });
    }
  }

  // 8. Batch-insert alignment records (SQLite variable limit ~999)
  const BATCH = 300;
  for (let i = 0; i < records.length; i += BATCH) {
    await prisma.careerProgramAlignment.createMany({
      data: records.slice(i, i + BATCH),
    });
  }

  // 9. Seed 5 test users with assessments
  console.log('Creating test users...');
  await prisma.assessment.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('Test@1234', 10);

  const testUsers = [
    {
      name: 'Amina Nakamura',
      email: 'amina@pathforge.test',
      targetCareer: 'Data Scientist',
      profile: {
        Python: 0.80, SQL: 0.75, Statistics: 0.70,
        'Machine Learning': 0.35, 'Data Visualization': 0.60,
        'Cloud Computing': 0.20,
      },
    },
    {
      name: 'Brian Ochieng',
      email: 'brian@pathforge.test',
      targetCareer: 'Financial Analyst',
      profile: {
        Excel: 0.80, Statistics: 0.65, SQL: 0.45,
        'Data Visualization': 0.55, 'Financial Modeling': 0.50,
      },
    },
    {
      name: 'Claire Uwimana',
      email: 'claire@pathforge.test',
      targetCareer: 'Civil Engineering',
      profile: {
        CAD: 0.30, 'Structural Analysis': 0.20, Mathematics: 0.55,
        'Project Management': 0.25, Geotechnics: 0.15,
      },
    },
    {
      name: 'David Kimani',
      email: 'david@pathforge.test',
      targetCareer: 'Full Stack Developer',
      profile: {
        JavaScript: 0.85, Python: 0.75, SQL: 0.70,
        'Cloud Computing': 0.55, 'Data Structures': 0.80,
        DevOps: 0.45,
      },
    },
    {
      name: 'Esther Mwangi',
      email: 'esther@pathforge.test',
      targetCareer: 'Accountant',
      profile: {
        Accounting: 0.70, Excel: 0.75, 'Tax Law': 0.45,
        'Financial Reporting': 0.55, SQL: 0.30,
      },
    },
  ];

  for (const u of testUsers) {
    const user = await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        passwordHash,
        targetCareer: u.targetCareer,
      },
    });

    await prisma.assessment.create({
      data: {
        deviceId: `seed-${user.id}`,
        userId: user.id,
        career: u.targetCareer,
        profile: u.profile,
      },
    });
  }

  console.log('Database seeded with ML sample data!');
  console.log(`  ${careersData.length} careers`);
  console.log(`  ${Object.keys(uniMap).length} universities`);
  console.log(`  ${Object.keys(progIdMap).length} programs`);
  console.log(`  ${records.length} alignment records`);
  console.log(`  ${testUsers.length} test users (password: Test@1234)`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
