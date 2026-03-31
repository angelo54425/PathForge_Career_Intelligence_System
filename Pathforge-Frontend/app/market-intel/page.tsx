"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import ProgressBar from "@/components/ui/ProgressBar";
import { MOCK, getCareers, getMarketIntelligence, getSkillGap } from "@/lib/api";
import type { Career, MarketIntelResponse } from "@/lib/types";
import { getTargetCareer, getStudentProfile, syncTargetCareerFromBackend } from "@/lib/careerStore";
import {
  MARKET_DATA,
  CURRENCIES,
  convertSalary,
  formatSalaryShort,
  type Currency,
  type TrajectoryPoint,
} from "@/lib/marketData";

// ── Colour palette for compare mode ─────────────────────────────────────────
const COMPARE_COLORS = ["#f97415", "#3b82f6", "#10b981", "#8b5cf6"];

// ── SVG single-career trajectory chart ───────────────────────────────────────
function TrajectoryChart({
  points,
  adjustedPoints,
  selectedCurrency,
}: {
  points: TrajectoryPoint[];
  adjustedPoints: TrajectoryPoint[] | null;
  selectedCurrency: Currency;
}) {
  const W = 480, H = 200, PAD_L = 60, PAD_R = 16, PAD_T = 24, PAD_B = 44;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const allVals = [
    ...points.map((p) => p.salaryKES),
    ...(adjustedPoints ?? []).map((p) => p.salaryKES),
  ];
  const maxVal = Math.max(...allVals) * 1.18;
  const toX = (i: number) => PAD_L + (i / (points.length - 1)) * innerW;
  const toY = (v: number) => PAD_T + innerH - (v / maxVal) * innerH;
  const buildPath = (pts: TrajectoryPoint[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(p.salaryKES)}`).join(" ");
  const buildArea = (pts: TrajectoryPoint[]) =>
    `${buildPath(pts)} L ${toX(pts.length - 1)} ${PAD_T + innerH} L ${PAD_L} ${PAD_T + innerH} Z`;
  const gridVals = [0, maxVal * 0.33, maxVal * 0.66, maxVal * 0.95];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 220 }}>
      {gridVals.map((v, gi) => (
        <g key={gi}>
          <line x1={PAD_L} y1={toY(v)} x2={W - PAD_R} y2={toY(v)} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 3" className="dark:stroke-slate-700" />
          <text x={PAD_L - 4} y={toY(v)} textAnchor="end" dominantBaseline="middle" fontSize="8" fill="#94a3b8">
            {formatSalaryShort(v / 1000, selectedCurrency).replace(/\s/g, "")}
          </text>
        </g>
      ))}
      <path d={buildArea(points)} fill="#f97415" fillOpacity="0.07" />
      {adjustedPoints && <path d={buildArea(adjustedPoints)} fill="#3b82f6" fillOpacity="0.05" />}
      <path d={buildPath(points)} fill="none" stroke="#f97415" strokeWidth="2.5" strokeLinejoin="round" />
      {adjustedPoints && (
        <path d={buildPath(adjustedPoints)} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" strokeDasharray="6 3" />
      )}
      {points.map((p, i) => {
        const x = toX(i), y = toY(p.salaryKES);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={5} fill="#f97415" stroke="white" strokeWidth="2" />
            <text x={x} y={y - 11} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#f97415">
              {formatSalaryShort(p.salaryKES / 1000, selectedCurrency).replace(/\s/g, "")}
            </text>
          </g>
        );
      })}
      {adjustedPoints?.map((p, i) => (
        <circle key={i} cx={toX(i)} cy={toY(p.salaryKES)} r={4} fill="#3b82f6" stroke="white" strokeWidth="2" />
      ))}
      {points.map((p, i) => (
        <g key={i}>
          <text x={toX(i)} y={H - PAD_B + 14} textAnchor="middle" fontSize="9" fontWeight="600" fill="#64748b">{p.stage}</text>
          <text x={toX(i)} y={H - PAD_B + 25} textAnchor="middle" fontSize="7.5" fill="#94a3b8">{p.years}</text>
        </g>
      ))}
    </svg>
  );
}

// ── SVG multi-career trajectory chart (compare mode) ─────────────────────────
function MultiTrajectoryChart({
  series,
  selectedCurrency,
}: {
  series: { career: string; points: TrajectoryPoint[]; color: string }[];
  selectedCurrency: Currency;
}) {
  const W = 640, H = 240, PAD_L = 64, PAD_R = 20, PAD_T = 28, PAD_B = 48;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const allVals = series.flatMap((s) => s.points.map((p) => p.salaryKES));
  const maxVal = allVals.length ? Math.max(...allVals) * 1.2 : 1000;
  const stages = series[0]?.points ?? [];
  const toX = (i: number) => PAD_L + (i / Math.max(stages.length - 1, 1)) * innerW;
  const toY = (v: number) => PAD_T + innerH - (v / maxVal) * innerH;
  const buildPath = (pts: TrajectoryPoint[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(p.salaryKES)}`).join(" ");
  const gridVals = [0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal * 0.95];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 260 }}>
      {/* Grid */}
      {gridVals.map((v, gi) => (
        <g key={gi}>
          <line x1={PAD_L} y1={toY(v)} x2={W - PAD_R} y2={toY(v)} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 3" className="dark:stroke-slate-700" />
          <text x={PAD_L - 4} y={toY(v)} textAnchor="end" dominantBaseline="middle" fontSize="8" fill="#94a3b8">
            {formatSalaryShort(v / 1000, selectedCurrency).replace(/\s/g, "")}
          </text>
        </g>
      ))}
      {/* X-axis stage labels */}
      {stages.map((p, i) => (
        <g key={i}>
          <line x1={toX(i)} y1={PAD_T} x2={toX(i)} y2={PAD_T + innerH} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="2 4" className="dark:stroke-slate-700" />
          <text x={toX(i)} y={H - PAD_B + 14} textAnchor="middle" fontSize="9" fontWeight="600" fill="#64748b">{p.stage}</text>
          <text x={toX(i)} y={H - PAD_B + 25} textAnchor="middle" fontSize="7.5" fill="#94a3b8">{p.years}</text>
        </g>
      ))}
      {/* Series lines and dots */}
      {series.map((s) => (
        <g key={s.career}>
          <path d={buildPath(s.points)} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" />
          {s.points.map((p, i) => (
            <g key={i}>
              <circle cx={toX(i)} cy={toY(p.salaryKES)} r={4.5} fill={s.color} stroke="white" strokeWidth="2" />
            </g>
          ))}
        </g>
      ))}
      {/* End-point labels */}
      {series.map((s) => {
        const last = s.points[s.points.length - 1];
        const x = toX(s.points.length - 1);
        const y = toY(last.salaryKES);
        return (
          <text key={s.career} x={x + 6} y={y} dominantBaseline="middle" fontSize="8" fontWeight="bold" fill={s.color}>
            {formatSalaryShort(last.salaryKES / 1000, selectedCurrency).replace(/\s/g, "")}
          </text>
        );
      })}
    </svg>
  );
}

// ── SVG horizontal grouped bar chart (compare mode) ──────────────────────────
function GroupedBarChart({
  careers,
  metricKey,
  label,
  unit,
  getVal,
  colors,
}: {
  careers: string[];
  metricKey: string;
  label: string;
  unit: string;
  getVal: (c: string) => number;
  colors: string[];
}) {
  const values = careers.map(getVal);
  const max = Math.max(...values, 1) * 1.15;
  const BAR_H = 22, GAP = 10, PAD_L = 0, PAD_R = 48;
  const totalH = careers.length * (BAR_H + GAP);
  return (
    <svg viewBox={`0 0 320 ${totalH}`} className="w-full" style={{ maxHeight: totalH }}>
      {careers.map((c, i) => {
        const val = values[i];
        const barW = (val / max) * (320 - PAD_L - PAD_R);
        const y = i * (BAR_H + GAP);
        return (
          <g key={c}>
            <rect x={PAD_L} y={y} width={Math.max(barW, 4)} height={BAR_H} fill={colors[i % colors.length]} rx={4} fillOpacity="0.85" />
            <text x={PAD_L + Math.max(barW, 4) + 6} y={y + BAR_H / 2} dominantBaseline="middle" fontSize="10" fontWeight="bold" fill={colors[i % colors.length]}>
              {val.toFixed(unit === "%" ? 0 : 0)}{unit}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Currency picker ──────────────────────────────────────────────────────────
function CurrencyPicker({ selected, onChange }: { selected: Currency; onChange: (c: Currency) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs font-bold border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-primary hover:text-primary transition-colors"
      >
        <span className="material-symbols-outlined text-[14px]">currency_exchange</span>
        {selected.code}
        <span className="material-symbols-outlined text-[12px]">expand_more</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl w-56 overflow-hidden">
            {CURRENCIES.map((c) => (
              <button key={c.code} onClick={() => { onChange(c); setOpen(false); }}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${c.code === selected.code ? "bg-primary/5 text-primary font-bold" : "text-slate-700 dark:text-slate-300"}`}
              >
                <span className="font-medium">{c.code}</span>
                <span className="text-xs text-slate-400">{c.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Compare metrics definition ────────────────────────────────────────────────
const COMPARE_METRIC_ROWS = [
  { key: "salary",       label: "Median Salary / mo",    icon: "payments",         isSalary: true,  isScore: false, isTrend: false },
  { key: "salaryTrend",  label: "Salary Trend",          icon: "trending_up",      isSalary: false, isScore: false, isTrend: true  },
  { key: "demand",       label: "Market Demand",         icon: "work",             isSalary: false, isScore: true,  isTrend: false },
  { key: "demandTrend",  label: "Demand Growth (YoY)",   icon: "show_chart",       isSalary: false, isScore: false, isTrend: true  },
  { key: "cagr",         label: "Career CAGR (5yr)",     icon: "rocket_launch",    isSalary: false, isScore: false, isTrend: true  },
  { key: "openings",     label: "Open Positions",        icon: "business_center",  isSalary: false, isScore: false, isTrend: false },
  { key: "entry",        label: "Entry Salary",          icon: "start",            isSalary: true,  isScore: false, isTrend: false },
  { key: "mid",          label: "Mid-Career Salary",     icon: "leaderboard",      isSalary: true,  isScore: false, isTrend: false },
  { key: "senior",       label: "Senior Salary",         icon: "workspace_premium",isSalary: true,  isScore: false, isTrend: false },
  { key: "lead",         label: "Lead / Principal",      icon: "star",             isSalary: true,  isScore: false, isTrend: false },
  { key: "topSkill",     label: "Top Required Skill",    icon: "psychology",       isSalary: false, isScore: false, isTrend: false },
  { key: "topEmployer",  label: "Key Employer",          icon: "domain",           isSalary: false, isScore: false, isTrend: false },
] as const;

type MetricKey = typeof COMPARE_METRIC_ROWS[number]["key"];

function getCompareValue(career: string, key: MetricKey, currency: Currency): { raw: number | string; display: string } {
  const d = MARKET_DATA[career] ?? MARKET_DATA["Data Scientist"];
  switch (key) {
    case "salary":      return { raw: d.salaryKES,            display: convertSalary(d.salaryKES, currency) };
    case "salaryTrend": return { raw: d.salaryTrend,          display: `+${d.salaryTrend}% YoY` };
    case "demand":      return { raw: d.marketDemand,         display: `${d.marketDemand}%` };
    case "demandTrend": return { raw: d.demandTrend,          display: `+${d.demandTrend} pts YoY` };
    case "cagr":        return { raw: d.cagr,                 display: `${d.cagr}%` };
    case "openings":    return { raw: d.jobOpenings,          display: d.jobOpenings.toLocaleString() };
    case "entry":       return { raw: d.trajectory[0].salaryKES, display: convertSalary(d.trajectory[0].salaryKES / 1000, currency) };
    case "mid":         return { raw: d.trajectory[1].salaryKES, display: convertSalary(d.trajectory[1].salaryKES / 1000, currency) };
    case "senior":      return { raw: d.trajectory[2].salaryKES, display: convertSalary(d.trajectory[2].salaryKES / 1000, currency) };
    case "lead":        return { raw: d.trajectory[3].salaryKES, display: convertSalary(d.trajectory[3].salaryKES / 1000, currency) };
    case "topSkill":    return { raw: 0,                      display: d.skillsInDemand[0]?.skill ?? "–" };
    case "topEmployer": return { raw: 0,                      display: d.topEmployers[0]?.name ?? "–" };
    default:            return { raw: 0,                      display: "–" };
  }
}

// ── Constants ────────────────────────────────────────────────────────────────
const CAREER_SECTORS = ["All", "IT", "Business & Finance", "Engineering"];
const EMPLOYER_REGIONS = ["All", "Kenya", "Uganda", "Tanzania", "Rwanda", "Regional"];

// ── Compare careers view ─────────────────────────────────────────────────────
function CompareView({
  allCareers,
  currency,
  compareList,
  onToggle,
}: {
  allCareers: Career[];
  currency: Currency;
  compareList: string[];
  onToggle: (c: string) => void;
}) {
  const [sector, setSector] = useState("All");
  const [sortKey, setSortKey] = useState<MetricKey>("salary");
  const [chartMetric, setChartMetric] = useState<"salary" | "demand" | "cagr">("salary");

  const filtered = allCareers.filter((c) => sector === "All" || c.sector === sector);

  const CHART_METRIC_OPTIONS: { key: "salary" | "demand" | "cagr"; label: string }[] = [
    { key: "salary",  label: "Median Salary" },
    { key: "demand",  label: "Market Demand" },
    { key: "cagr",    label: "CAGR (5yr)" },
  ];

  const trajectorySeries = compareList.map((c, i) => ({
    career: c,
    color: COMPARE_COLORS[i % COMPARE_COLORS.length],
    points: (MARKET_DATA[c] ?? MARKET_DATA["Data Scientist"]).trajectory,
  }));

  const getChartVal = (career: string): number => {
    const d = MARKET_DATA[career] ?? MARKET_DATA["Data Scientist"];
    if (chartMetric === "salary") return d.salaryKES;
    if (chartMetric === "demand") return d.marketDemand;
    return d.cagr;
  };

  const chartUnit = chartMetric === "salary" ? "k" : "%";

  // Row-level best value for highlighting
  const getBest = (key: MetricKey): number => {
    const vals = compareList.map((c) => {
      const v = getCompareValue(c, key, currency).raw;
      return typeof v === "number" ? v : 0;
    });
    return Math.max(...vals);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Career picker */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">compare</span>
            Select Careers to Compare
            <span className="text-xs text-slate-400 font-normal">(up to 4)</span>
          </h3>
          <div className="flex gap-2 flex-wrap">
            {CAREER_SECTORS.map((s) => (
              <button key={s} onClick={() => setSector(s)}
                className={`px-3 h-7 rounded-full text-xs font-medium transition-colors ${sector === s ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {filtered.map((c) => {
            const isSelected = compareList.includes(c.career);
            const disabled = !isSelected && compareList.length >= 4;
            const idx = compareList.indexOf(c.career);
            return (
              <button key={c.career}
                onClick={() => !disabled && onToggle(c.career)}
                disabled={disabled}
                className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? "border-transparent text-white shadow-sm"
                    : disabled
                    ? "border-slate-100 dark:border-slate-700 text-slate-300 dark:text-slate-600 cursor-not-allowed"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary"
                }`}
                style={isSelected ? { backgroundColor: COMPARE_COLORS[idx % COMPARE_COLORS.length] } : undefined}
              >
                {isSelected && <span className="material-symbols-outlined text-[12px]">check</span>}
                {c.career}
              </button>
            );
          })}
        </div>
        {compareList.length > 0 && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex-wrap">
            <span className="text-xs text-slate-500">Comparing:</span>
            {compareList.map((c, i) => (
              <span key={c} className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full text-white"
                style={{ backgroundColor: COMPARE_COLORS[i % COMPARE_COLORS.length] }}>
                {c}
                <button onClick={() => onToggle(c)} className="hover:opacity-70">
                  <span className="material-symbols-outlined text-[12px]">close</span>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {compareList.length < 2 ? (
        <div className="card p-12 text-center">
          <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-5xl mb-3 block">compare</span>
          <p className="text-slate-500 font-medium mb-1">Select at least 2 careers to compare</p>
          <p className="text-slate-400 text-sm">Pick careers above to see a full head-to-head breakdown</p>
        </div>
      ) : (
        <>
          {/* ── Metric comparison table ───────────────────────────────────── */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">table_chart</span>
                Head-to-Head Metrics
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Sort by:</span>
                <select value={sortKey} onChange={(e) => setSortKey(e.target.value as MetricKey)}
                  className="text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-primary"
                >
                  {COMPARE_METRIC_ROWS.filter((r) => !["topSkill","topEmployer"].includes(r.key)).map((r) => (
                    <option key={r.key} value={r.key}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left" style={{ minWidth: `${180 + compareList.length * 180}px` }}>
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                    <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider w-44">Metric</th>
                    {compareList.map((c, i) => (
                      <th key={c} className="px-5 py-3.5 border-l border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COMPARE_COLORS[i % COMPARE_COLORS.length] }} />
                          <span className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{c}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 ml-5">
                          {MOCK.careers.find((x) => x.career === c)?.sector}
                        </p>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {COMPARE_METRIC_ROWS.map((row) => {
                    const best = getBest(row.key as MetricKey);
                    return (
                      <tr key={row.key}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${sortKey === row.key ? "bg-primary/5" : ""}`}
                      >
                        <td className="px-5 py-3 text-xs font-medium text-slate-600 dark:text-slate-300">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-slate-400 text-[16px]">{row.icon}</span>
                            {row.label}
                          </div>
                        </td>
                        {compareList.map((c, ci) => {
                          const { raw, display } = getCompareValue(c, row.key as MetricKey, currency);
                          const isBest = typeof raw === "number" && raw > 0 && raw === best && compareList.length > 1;
                          return (
                            <td key={c} className="px-5 py-3 border-l border-slate-100 dark:border-slate-700">
                              {row.isScore ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-slate-900 dark:text-white">{display}</span>
                                  <div className="flex-1 max-w-[50px]">
                                    <ProgressBar value={raw as number} size="sm"
                                      color={ci === 0 ? "primary" : ci === 1 ? "blue" : ci === 2 ? "green" : "yellow"} />
                                  </div>
                                  {isBest && <span className="material-symbols-outlined text-[14px] text-primary">star</span>}
                                </div>
                              ) : row.isTrend ? (
                                <span className="flex items-center gap-1 text-sm font-bold text-green-600 dark:text-green-400">
                                  <span className="material-symbols-outlined text-[14px]">trending_up</span>
                                  {display}
                                  {isBest && <span className="material-symbols-outlined text-primary text-[14px]">star</span>}
                                </span>
                              ) : (
                                <span className={`text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1 ${isBest ? "font-bold text-slate-900 dark:text-white" : ""}`}>
                                  {display}
                                  {isBest && <span className="material-symbols-outlined text-primary text-[14px]">star</span>}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  {/* Skills in demand row */}
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-5 py-3 text-xs font-medium text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-slate-400 text-[16px]">stacked_bar_chart</span>
                        Top Skills Required
                      </div>
                    </td>
                    {compareList.map((c) => {
                      const d = MARKET_DATA[c] ?? MARKET_DATA["Data Scientist"];
                      return (
                        <td key={c} className="px-5 py-3 border-l border-slate-100 dark:border-slate-700">
                          <div className="flex flex-col gap-1">
                            {d.skillsInDemand.slice(0, 3).map((s) => (
                              <div key={s.skill} className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-600 dark:text-slate-300 min-w-[80px] truncate">{s.skill}</span>
                                <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                  <div className="h-1.5 bg-primary rounded-full" style={{ width: `${s.pct}%` }} />
                                </div>
                                <span className="text-[9px] text-slate-400 font-bold">{s.pct}%</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Charts row ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Multi-line trajectory chart */}
            <div className="card p-6">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">trending_up</span>
                Salary Trajectory Comparison
              </h3>
              <p className="text-xs text-slate-500 mb-4">{currency.code} monthly across all career stages</p>
              <MultiTrajectoryChart series={trajectorySeries} selectedCurrency={currency} />
              <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                {compareList.map((c, i) => (
                  <div key={c} className="flex items-center gap-1.5 text-xs">
                    <div className="w-3 h-0.5 rounded" style={{ backgroundColor: COMPARE_COLORS[i % COMPARE_COLORS.length], height: 3 }} />
                    <span className="text-slate-600 dark:text-slate-400">{c}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bar chart for key metrics */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">bar_chart</span>
                  Quick Metric Comparison
                </h3>
                <div className="flex gap-1.5">
                  {CHART_METRIC_OPTIONS.map((opt) => (
                    <button key={opt.key} onClick={() => setChartMetric(opt.key)}
                      className={`px-2.5 h-7 rounded-lg text-[11px] font-medium transition-colors ${
                        chartMetric === opt.key ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {compareList.map((c, i) => {
                  const val = getChartVal(c);
                  const d = MARKET_DATA[c] ?? MARKET_DATA["Data Scientist"];
                  const allVals = compareList.map(getChartVal);
                  const pct = (val / Math.max(...allVals)) * 100;
                  const displayVal = chartMetric === "salary"
                    ? convertSalary(d.salaryKES, currency)
                    : chartMetric === "demand"
                    ? `${d.marketDemand}%`
                    : `${d.cagr}%`;
                  return (
                    <div key={c}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COMPARE_COLORS[i % COMPARE_COLORS.length] }} />
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[140px]">{c}</span>
                        </div>
                        <span className="text-xs font-bold" style={{ color: COMPARE_COLORS[i % COMPARE_COLORS.length] }}>
                          {displayVal}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                        <div className="h-2.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: COMPARE_COLORS[i % COMPARE_COLORS.length] }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mini stats grid below */}
              <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-slate-700">
                {[
                  { label: "Highest CAGR",  val: compareList.reduce((best, c) => (MARKET_DATA[c]?.cagr ?? 0) > (MARKET_DATA[best]?.cagr ?? 0) ? c : best), suffix: `${Math.max(...compareList.map((c) => MARKET_DATA[c]?.cagr ?? 0))}%` },
                  { label: "Most Demand",   val: compareList.reduce((best, c) => (MARKET_DATA[c]?.marketDemand ?? 0) > (MARKET_DATA[best]?.marketDemand ?? 0) ? c : best), suffix: `${Math.max(...compareList.map((c) => MARKET_DATA[c]?.marketDemand ?? 0))}%` },
                  { label: "Top Salary",    val: compareList.reduce((best, c) => (MARKET_DATA[c]?.salaryKES ?? 0) > (MARKET_DATA[best]?.salaryKES ?? 0) ? c : best), suffix: convertSalary((MARKET_DATA[compareList.reduce((best, c) => (MARKET_DATA[c]?.salaryKES ?? 0) > (MARKET_DATA[best]?.salaryKES ?? 0) ? c : best)]?.salaryKES ?? 0), currency) },
                ].map((stat) => {
                  const idx = compareList.indexOf(stat.val);
                  return (
                    <div key={stat.label} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-2.5 text-center border border-slate-100 dark:border-slate-700">
                      <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide mb-1">{stat.label}</p>
                      <div className="w-1.5 h-1.5 rounded-full mx-auto mb-1" style={{ backgroundColor: COMPARE_COLORS[idx % COMPARE_COLORS.length] }} />
                      <p className="text-[10px] font-black text-slate-900 dark:text-white truncate" title={stat.val}>{stat.val.split(" ")[0]}</p>
                      <p className="text-[9px] font-bold mt-0.5" style={{ color: COMPARE_COLORS[idx % COMPARE_COLORS.length] }}>{stat.suffix}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Regional salary comparison across careers ─────────────────── */}
          <div className="card p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">public</span>
              Regional Salary by Career
            </h3>
            <p className="text-xs text-slate-500 mb-5">Median monthly salary in {currency.code} · East Africa by country</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: `${160 + compareList.length * 160}px` }}>
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700">
                    <th className="text-left pb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider pr-4">Country</th>
                    {compareList.map((c, i) => (
                      <th key={c} className="text-right pb-3 px-3">
                        <span className="text-xs font-bold" style={{ color: COMPARE_COLORS[i % COMPARE_COLORS.length] }}>{c}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {["Kenya","Rwanda","Uganda","Tanzania","Ethiopia"].map((country) => (
                    <tr key={country} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 pr-4 font-medium text-slate-700 dark:text-slate-300 text-sm">{country}</td>
                      {compareList.map((c, i) => {
                        const d = MARKET_DATA[c] ?? MARKET_DATA["Data Scientist"];
                        const regional = d.regionalSalaries.find((r) => r.country === country);
                        const salVal = regional?.salaryKES ?? 0;
                        const allSals = compareList.map((cc) => {
                          const dd = MARKET_DATA[cc] ?? MARKET_DATA["Data Scientist"];
                          return dd.regionalSalaries.find((r) => r.country === country)?.salaryKES ?? 0;
                        });
                        const isBest = salVal === Math.max(...allSals) && compareList.length > 1;
                        return (
                          <td key={c} className="py-2.5 px-3 text-right">
                            <span className={`text-sm font-bold ${isBest ? "text-slate-900 dark:text-white" : "text-slate-500"}`}>
                              {convertSalary(salVal / 1000, currency)}
                              {isBest && " ★"}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function MarketIntelPage() {
  const [careers, setCareers] = useState<Career[]>(MOCK.careers);
  const [sector, setSector] = useState("All");
  const [selectedCareer, setSelectedCareer] = useState("");
  const [currency, setCurrency] = useState<Currency>(CURRENCIES[0]);
  const [employerRegion, setEmployerRegion] = useState("All");
  const [saved, setSaved] = useState(false);
  const [mode, setMode] = useState<"overview" | "compare">("overview");
  const [compareList, setCompareList] = useState<string[]>([]);
  const [mlMarketData, setMlMarketData] = useState<MarketIntelResponse | null>(null);
  const [userReadiness, setUserReadiness] = useState<number | null>(null);

  useEffect(() => {
    syncTargetCareerFromBackend().then((backendCareer) => {
      const target = backendCareer || getTargetCareer() || "Data Scientist";
      setSelectedCareer(target);
      fetchMarketIntel(target);
    });
    getCareers().then(setCareers).catch(() => {});
  }, []);

  // Re-fetch readiness from Flask whenever the selected career changes
  useEffect(() => {
    if (!selectedCareer) return;
    const profile = getStudentProfile();
    if (!profile || Object.keys(profile).length === 0) {
      setUserReadiness(null);
      return;
    }
    getSkillGap(selectedCareer, profile)
      .then((gap) => setUserReadiness(gap.overall_readiness))
      .catch(() => setUserReadiness(null));
  }, [selectedCareer]);

  function fetchMarketIntel(career: string) {
    getMarketIntelligence(career)
      .then(setMlMarketData)
      .catch(() => setMlMarketData(null));
  }

  function handleCareerSelect(career: string) {
    setSelectedCareer(career);
    fetchMarketIntel(career);
  }

  const data = MARKET_DATA[selectedCareer] ?? MARKET_DATA["Data Scientist"];

  const adjustedTrajectory = useMemo<TrajectoryPoint[] | null>(() => {
    if (userReadiness === null) return null;
    const f = userReadiness >= 0.75 ? 1.15 : userReadiness >= 0.5 ? 1.05 : userReadiness >= 0.25 ? 0.92 : 0.80;
    return data.trajectory.map((p) => ({ ...p, salaryKES: Math.round(p.salaryKES * f) }));
  }, [data, userReadiness]);

  const toggleCompare = (career: string) => {
    setCompareList((prev) =>
      prev.includes(career)
        ? prev.filter((c) => c !== career)
        : prev.length < 4
        ? [...prev, career]
        : prev
    );
  };

  const filteredCareers = careers.filter((c) => sector === "All" || c.sector === sector);
  const filteredEmployers = data.topEmployers.filter((e) => employerRegion === "All" || e.region === employerRegion);
  const maxRegional = Math.max(...data.regionalSalaries.map((r) => r.salaryKES));
  const readinessPct = userReadiness !== null ? Math.round(userReadiness * 100) : null;

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-[1200px] mx-auto w-full px-4 md:px-10 py-8">

        {/* ── Page header with mode toggle ──────────────────────────────── */}
        <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">Market Intelligence</h1>
            <p className="text-slate-500 text-sm mt-1">East Africa career & salary insights</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <CurrencyPicker selected={currency} onChange={setCurrency} />
            {/* Mode toggle */}
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-1">
              <button onClick={() => setMode("overview")}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                  mode === "overview" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">analytics</span>
                Overview
              </button>
              <button onClick={() => setMode("compare")}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                  mode === "compare" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">compare</span>
                Compare
                {compareList.length > 0 && (
                  <span className="bg-primary text-white text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none">
                    {compareList.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── COMPARE MODE ────────────────────────────────────────────────── */}
        {mode === "compare" && (
          <CompareView
            allCareers={careers}
            currency={currency}
            compareList={compareList}
            onToggle={toggleCompare}
          />
        )}

        {/* ── OVERVIEW MODE ───────────────────────────────────────────────── */}
        {mode === "overview" && (
          <>
            {/* Header row */}
            <div className="flex flex-wrap justify-between items-start gap-3 mb-6">
              <div>
                <h2 className="text-4xl font-black text-slate-900 dark:text-white leading-tight">{selectedCareer}</h2>
                <div className="flex items-center gap-2 text-slate-500 mt-1 flex-wrap text-xs">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">public</span>
                    East Africa Region Overview
                  </span>
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <span className="italic text-slate-400">{data.dataSource}</span>
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <span className="text-slate-400">Updated {data.lastUpdated}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setCompareList((p) => p.includes(selectedCareer) ? p : p.length < 4 ? [...p, selectedCareer] : p); setMode("compare"); }}
                  className="btn-secondary flex items-center gap-1.5 py-2 text-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">compare</span>
                  Add to Compare
                </button>
                <button onClick={() => setSaved(!saved)} className="btn-primary flex items-center gap-2 py-2">
                  <span className="material-symbols-outlined text-[18px]">{saved ? "bookmark" : "bookmark_border"}</span>
                  {saved ? "Saved" : "Save Role"}
                </button>
              </div>
            </div>

            {/* Career selector */}
            <div className="card p-4 mb-8">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filter by sector</span>
                <div className="flex gap-2 flex-wrap">
                  {CAREER_SECTORS.map((s) => (
                    <button key={s} onClick={() => setSector(s)}
                      className={`px-4 h-7 rounded-full text-xs font-medium transition-colors ${sector === s ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"}`}
                    >{s}</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {filteredCareers.map((c) => (
                  <button key={c.career} onClick={() => handleCareerSelect(c.career)}
                    className={`px-4 py-1.5 rounded-xl border text-sm font-medium transition-colors ${
                      selectedCareer === c.career
                        ? "bg-navy/10 border-navy/40 text-navy dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700"
                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300"
                    }`}
                  >{c.career}</button>
                ))}
              </div>
            </div>

            {/* Readiness banner */}
            {readinessPct !== null && (
              <div className={`rounded-xl p-4 mb-6 flex items-center gap-4 border flex-wrap ${
                readinessPct >= 70 ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800" :
                readinessPct >= 40 ? "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800" :
                "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
              }`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                  readinessPct >= 70 ? "bg-green-100 text-green-700" : readinessPct >= 40 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                }`}>{readinessPct}%</div>
                <div className="flex-1 min-w-[160px]">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Your Readiness for {selectedCareer}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {readinessPct >= 70 ? "Well-prepared — your salary trajectory is projected above the regional average." :
                     readinessPct >= 40 ? "On track — continue building skills to reach the top of the trajectory." :
                     "Skill gaps detected — your projected trajectory reflects current readiness."}
                  </p>
                </div>
                <div className="flex-1 max-w-[200px] hidden sm:block">
                  <ProgressBar value={readinessPct} color={readinessPct >= 70 ? "green" : readinessPct >= 40 ? "yellow" : "red"} size="md" />
                </div>
                <Link href="/roadmap" className="btn-secondary text-xs py-1.5 px-3 shrink-0">Improve Skills</Link>
              </div>
            )}

            {/* KPI cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              <div className="card p-6 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <span className="material-symbols-outlined text-[20px]">payments</span>
                    Median Salary / mo
                  </div>
                </div>
                <div className="flex items-end gap-3">
                  <span className="text-3xl font-bold leading-none text-slate-900 dark:text-white">{convertSalary(data.salaryKES, currency)}</span>
                  <span className="flex items-center text-sm font-semibold px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <span className="material-symbols-outlined text-[16px]">trending_up</span>+{data.salaryTrend}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">{data.salaryReportedCount.toLocaleString()} reported salaries</p>
                <div className="flex gap-2 flex-wrap pt-1 border-t border-slate-100 dark:border-slate-700">
                  {[CURRENCIES[0], CURRENCIES[1], CURRENCIES[2]].filter((c) => c.code !== currency.code).slice(0, 2).map((c) => (
                    <button key={c.code} onClick={() => setCurrency(c)} className="text-[11px] text-slate-400 hover:text-primary transition-colors font-medium">
                      {convertSalary(data.salaryKES, c)} {c.code}
                    </button>
                  ))}
                </div>
              </div>
              <div className="card p-6 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <span className="material-symbols-outlined text-[20px]">work</span>Market Demand
                </div>
                <div className="flex items-end gap-3">
                  <span className="text-3xl font-bold leading-none text-slate-900 dark:text-white">{data.marketDemand}%</span>
                  <span className="flex items-center text-sm font-semibold px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <span className="material-symbols-outlined text-[16px]">trending_up</span>+{data.demandTrend}% YoY
                  </span>
                </div>
                <div className="mt-1"><ProgressBar value={data.marketDemand} color="primary" size="sm" /></div>
                <p className="text-xs text-slate-500">{data.jobOpenings.toLocaleString()} open positions actively recruiting</p>
              </div>
              <div className="card p-6 bg-gradient-to-br from-navy to-blue-600 border-0 text-white flex flex-col gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/70">
                  <span className="material-symbols-outlined text-[20px]">rocket_launch</span>Career Growth (CAGR)
                </div>
                <div className="flex items-end gap-3">
                  <span className="text-3xl font-bold leading-none text-white">{data.cagr}%</span>
                  <span className="text-sm font-semibold px-2 py-0.5 rounded bg-white/20 text-white">5-yr avg</span>
                </div>
                <p className="text-xs text-white/60">Projected over next 5 years in East Africa</p>
              </div>
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="card p-6">
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Regional Salary Comparison</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Median monthly · {currency.code} equivalent</p>
                  </div>
                  <span className="material-symbols-outlined text-slate-400">bar_chart</span>
                </div>
                <div className="flex items-end gap-3 h-44 border-b border-slate-100 dark:border-slate-700 pb-3 mb-3 relative">
                  <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[9px] text-slate-400 pb-3">
                    <span>{formatSalaryShort(maxRegional / 1000, currency).replace(/\s/g, "")}</span>
                    <span>{formatSalaryShort(maxRegional / 2000, currency).replace(/\s/g, "")}</span>
                    <span>0</span>
                  </div>
                  {data.regionalSalaries.map((d) => {
                    const pct = (d.salaryKES / maxRegional) * 100;
                    return (
                      <div key={d.country} className="flex flex-col items-center gap-1 flex-1 ml-5 group">
                        <span className="text-[9px] font-bold text-slate-600 group-hover:text-primary transition-colors">
                          {formatSalaryShort(d.salaryKES / 1000, currency).replace(/\s/g, "")}
                        </span>
                        <div className="w-full rounded-t-md overflow-hidden" style={{ height: `${pct}%`, minHeight: 8 }}>
                          <div className="w-full h-full bg-primary/25 group-hover:bg-primary transition-colors" />
                        </div>
                        <span className="text-[9px] text-slate-500 font-medium">{d.country}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-400 italic">PPP-adjusted · {data.dataSource}</p>
              </div>

              <div className="card p-6">
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Skills in Demand</h3>
                    <p className="text-xs text-slate-500 mt-0.5">% of {selectedCareer} postings requiring each skill</p>
                  </div>
                  <span className="material-symbols-outlined text-slate-400">stacked_bar_chart</span>
                </div>
                <div className="flex flex-col gap-3.5">
                  {data.skillsInDemand.map((s) => (
                    <div key={s.skill} className="flex items-center gap-2">
                      <div className="flex-1"><ProgressBar label={s.skill} value={s.pct} showLabel size="md" /></div>
                      <span className={`text-[10px] font-bold shrink-0 w-4 text-center ${s.trend === "up" ? "text-green-600" : s.trend === "down" ? "text-red-500" : "text-slate-400"}`}>
                        {s.trend === "up" ? "↑" : s.trend === "down" ? "↓" : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Trajectory chart */}
            <div className="card p-6 mb-8">
              <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">trending_up</span>
                    Salary Growth Trajectory
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{currency.code} monthly · East Africa average vs your personalised projection</p>
                </div>
                <div className="flex items-center gap-4 text-xs flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 rounded bg-primary" style={{ height: 2 }} />
                    <span className="text-slate-500">Regional average</span>
                  </div>
                  {adjustedTrajectory ? (
                    <div className="flex items-center gap-1.5">
                      <svg width="20" height="2"><line x1="0" y1="1" x2="20" y2="1" stroke="#3b82f6" strokeWidth="2" strokeDasharray="5 3" /></svg>
                      <span className="text-slate-500">Your projection ({readinessPct}% ready)</span>
                    </div>
                  ) : (
                    <Link href="/assessment" className="text-primary text-xs font-semibold hover:underline">Take assessment to personalise →</Link>
                  )}
                </div>
              </div>
              <TrajectoryChart points={data.trajectory} adjustedPoints={adjustedTrajectory} selectedCurrency={currency} />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-100 dark:border-slate-700">
                {data.trajectory.map((t, i) => {
                  const adj = adjustedTrajectory?.[i];
                  const base = formatSalaryShort(t.salaryKES / 1000, currency);
                  const adjFmt = adj ? formatSalaryShort(adj.salaryKES / 1000, currency) : null;
                  const higher = adj && adj.salaryKES > t.salaryKES;
                  return (
                    <div key={t.stage} className="bg-navy/5 dark:bg-navy/20 rounded-xl p-3 border border-navy/10 text-center">
                      <p className="text-lg font-black text-navy dark:text-blue-300">{base}</p>
                      {adjFmt && adjFmt !== base && (
                        <p className={`text-[10px] font-bold mt-0.5 ${higher ? "text-green-600" : "text-amber-600"}`}>{higher ? "↑" : "↓"} {adjFmt} (you)</p>
                      )}
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold mt-0.5">{t.stage}</p>
                      <p className="text-[9px] text-slate-400">{t.years}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Employers + CTA */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 card p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Top Employers in Region</h3>
                  <div className="flex gap-1.5 flex-wrap">
                    {EMPLOYER_REGIONS.map((r) => (
                      <button key={r} onClick={() => setEmployerRegion(r)}
                        className={`px-3 h-6 rounded-full text-[11px] font-medium transition-colors ${employerRegion === r ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200"}`}
                      >{r}</button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredEmployers.length > 0 ? filteredEmployers.map((e) => (
                    <div key={e.name} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-primary/30 transition-colors">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-base shrink-0 ${e.color}`}>{e.name[0]}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{e.name}</p>
                        <p className="text-xs text-slate-500 truncate">{e.sector}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs font-bold text-primary">{e.openRoles}</p>
                        <p className="text-[9px] text-slate-400">open roles</p>
                      </div>
                    </div>
                  )) : (
                    <p className="col-span-2 text-sm text-slate-400 py-4 text-center">No employers match this region filter.</p>
                  )}
                </div>
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Compensation Overview</h4>
                    <span className="text-xs text-slate-400">{currency.code} / month</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {data.trajectory.map((t) => (
                      <div key={t.stage} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-center border border-slate-100 dark:border-slate-700">
                        <p className="text-sm font-black text-slate-900 dark:text-white">{formatSalaryShort(t.salaryKES / 1000, currency)}</p>
                        <p className="text-[9px] text-slate-500 mt-0.5">{t.stage}</p>
                        <p className="text-[9px] text-slate-400">{t.years}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between gap-4 rounded-xl bg-gradient-to-br from-primary to-orange-600 p-6 shadow-md text-white">
                <div>
                  <span className="material-symbols-outlined text-4xl mb-3 block">school</span>
                  <h3 className="text-xl font-bold mb-2">Ready to start?</h3>
                  <p className="text-white/80 text-sm leading-relaxed">View curated learning paths and get matched with universities for your {selectedCareer} career.</p>
                  {readinessPct !== null && (
                    <div className="mt-4 bg-white/10 rounded-xl p-3">
                      <p className="text-xs text-white/70 mb-1.5">Your readiness score</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-white/20 rounded-full h-2 overflow-hidden">
                          <div className="h-2 bg-white rounded-full" style={{ width: `${readinessPct}%` }} />
                        </div>
                        <span className="text-white font-bold text-sm">{readinessPct}%</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Link href="/roadmap" className="w-full bg-white text-primary hover:bg-slate-50 font-bold py-3 px-4 rounded-xl text-center text-sm transition-colors">Explore Learning Paths</Link>
                  <Link href="/resources" className="w-full bg-white/20 hover:bg-white/30 text-white font-medium py-2.5 px-4 rounded-xl text-center text-sm transition-colors">Browse Course Resources</Link>
                  <Link href="/universities" className="w-full bg-white/20 hover:bg-white/30 text-white font-medium py-2.5 px-4 rounded-xl text-center text-sm transition-colors">Compare Universities</Link>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
