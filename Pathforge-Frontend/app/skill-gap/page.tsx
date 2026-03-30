"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import DonutChart from "@/components/charts/DonutChart";
import ProgressBar from "@/components/ui/ProgressBar";
import { MOCK, getSkillGap, getMockGapResult, getCareerCompatibility } from "@/lib/api";
import type { GapAnalysisResult, SkillGap, StudentProfile, CareerCompatibility } from "@/lib/types";
import { getTargetCareer, getStudentProfile, syncTargetCareerFromBackend } from "@/lib/careerStore";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CareerReadiness {
  career: string;
  sector: string;
  readiness: number; // 0–100
  criticalGaps: number;
  moderateGaps: number;
  minorGaps: number;
  noneCount: number;
  timeMonths: number;
  topGaps: string[];
  skillGaps: SkillGap[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG = {
  critical: {
    badge: "bg-red-500 text-white",
    border: "border-red-400/50",
    bg: "bg-red-50 dark:bg-red-900/10",
    bar: "red" as const,
    icon: "warning",
    iconColor: "text-red-500",
  },
  moderate: {
    badge: "bg-amber-400 text-white",
    border: "border-amber-300/50",
    bg: "bg-amber-50 dark:bg-amber-900/10",
    bar: "yellow" as const,
    icon: "info",
    iconColor: "text-amber-500",
  },
  minor: {
    badge: "bg-blue-400 text-white",
    border: "border-blue-300/50",
    bg: "bg-blue-50 dark:bg-blue-900/10",
    bar: "blue" as const,
    icon: "check_circle",
    iconColor: "text-blue-500",
  },
  none: {
    badge: "bg-green-500 text-white",
    border: "border-green-300/50",
    bg: "bg-green-50 dark:bg-green-900/10",
    bar: "green" as const,
    icon: "verified",
    iconColor: "text-green-500",
  },
};

const FILTERS = ["All Skills", "Critical", "Moderate", "Minor"] as const;

const COMPARE_COLORS = ["#f97415", "#3b82f6", "#10b981", "#8b5cf6"];
const SECTOR_COLORS: Record<string, string> = {
  IT: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "Business & Finance":
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  Engineering:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

const SECTORS_FILTER = ["All", "IT", "Business & Finance", "Engineering"] as const;

// ── Readiness computation ─────────────────────────────────────────────────────

function computeCareerReadiness(
  career: (typeof MOCK.careers)[0],
  profile: StudentProfile | null
): CareerReadiness {
  const skills = career.skills ?? [];

  const skillGaps: SkillGap[] = skills.map((s) => {
    const current = profile
      ? Math.min(profile[s.skill] ?? 0.3, 1)
      : Math.max(0.1, s.requiredLevel - 0.3);
    const gap = Math.round(Math.max(0, s.requiredLevel - current) * 100) / 100;
    const severity: SkillGap["severity"] =
      gap > 0.4 ? "critical" : gap > 0.2 ? "moderate" : gap > 0.05 ? "minor" : "none";
    return {
      skill: s.skill,
      required: s.requiredLevel,
      current: Math.round(current * 100) / 100,
      gap,
      severity,
    };
  });

  const readiness =
    skills.length === 0
      ? 0
      : Math.round(
          (skillGaps.reduce((sum, g) => sum + g.current / g.required, 0) /
            skillGaps.length) *
            100
        );

  return {
    career: career.career,
    sector: career.sector,
    readiness,
    criticalGaps: skillGaps.filter((g) => g.severity === "critical").length,
    moderateGaps: skillGaps.filter((g) => g.severity === "moderate").length,
    minorGaps: skillGaps.filter((g) => g.severity === "minor").length,
    noneCount: skillGaps.filter((g) => g.severity === "none").length,
    timeMonths: Math.max(3, Math.ceil(((100 - readiness) / 100) * 18)),
    topGaps: skillGaps
      .filter((g) => g.severity === "critical" || g.severity === "moderate")
      .map((g) => g.skill)
      .slice(0, 3),
    skillGaps,
  };
}

// ── Readiness colour ──────────────────────────────────────────────────────────

function readinessColor(r: number) {
  if (r >= 75) return "text-green-600 dark:text-green-400";
  if (r >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function readinessBarColor(r: number): "green" | "yellow" | "red" {
  if (r >= 75) return "green";
  if (r >= 50) return "yellow";
  return "red";
}

function readinessLabel(pct: number): string {
  if (pct >= 80) return "Advanced";
  if (pct >= 55) return "Intermediate";
  return "Beginner";
}

function skillSuggestion(skill: SkillGap): { title: string; detail: string } {
  const pct = Math.round(skill.current * 100);
  switch (skill.severity) {
    case "critical":
      return {
        title: `${skill.skill} Fundamentals`,
        detail: `You're at ${pct}% — start with a beginner course to build the foundation.`,
      };
    case "moderate":
      return {
        title: `Intermediate ${skill.skill}`,
        detail: `You're at ${pct}% — close the gap with an intermediate-level course.`,
      };
    case "minor":
      return {
        title: `Practice ${skill.skill}`,
        detail: `You're at ${pct}% — apply in real projects to reach the required level.`,
      };
    case "none":
      return {
        title: `Strong Skill`,
        detail: `You're at ${pct}% — maintain this strength with advanced challenges.`,
      };
  }
}

// ── Radar / bar SVG chart ─────────────────────────────────────────────────────

function ReadinessBarChart({ careers }: { careers: CareerReadiness[] }) {
  if (careers.length === 0) return null;
  const W = 480;
  const H = 220;
  const PAD = { top: 20, right: 20, bottom: 60, left: 40 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const barW = Math.min(48, (chartW / careers.length) * 0.6);
  const gap = chartW / careers.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 220 }}>
      {/* Gridlines */}
      {[0, 25, 50, 75, 100].map((v) => {
        const y = PAD.top + chartH - (v / 100) * chartH;
        return (
          <g key={v}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y}
              y2={y}
              stroke="#e2e8f0"
              strokeDasharray="4 3"
            />
            <text x={PAD.left - 4} y={y + 4} textAnchor="end" fontSize={9} fill="#94a3b8">
              {v}%
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {careers.map((c, i) => {
        const x = PAD.left + i * gap + gap / 2 - barW / 2;
        const barH = (c.readiness / 100) * chartH;
        const y = PAD.top + chartH - barH;
        const color = COMPARE_COLORS[i % COMPARE_COLORS.length];
        return (
          <g key={c.career}>
            <rect x={x} y={y} width={barW} height={barH} fill={color} rx={4} opacity={0.85} />
            <text
              x={x + barW / 2}
              y={y - 4}
              textAnchor="middle"
              fontSize={10}
              fontWeight="700"
              fill={color}
            >
              {c.readiness}%
            </text>
            <text
              x={x + barW / 2}
              y={PAD.top + chartH + 14}
              textAnchor="middle"
              fontSize={9}
              fill="#64748b"
            >
              {c.career.length > 12 ? c.career.slice(0, 11) + "…" : c.career}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Compare metric rows ───────────────────────────────────────────────────────

const COMPARE_METRICS = [
  { key: "readiness", label: "Overall Readiness", icon: "donut_large", unit: "%" },
  { key: "criticalGaps", label: "Critical Gaps", icon: "warning", unit: "" },
  { key: "moderateGaps", label: "Moderate Gaps", icon: "info", unit: "" },
  { key: "minorGaps", label: "Minor Gaps", icon: "check_circle", unit: "" },
  { key: "noneCount", label: "Skills Mastered", icon: "verified", unit: "" },
  { key: "timeMonths", label: "Time to Job-Ready", icon: "schedule", unit: " mo" },
] as const;

type MetricKey = (typeof COMPARE_METRICS)[number]["key"];

function isBestMetric(key: MetricKey, val: number, all: number[]) {
  if (key === "readiness" || key === "noneCount") return val === Math.max(...all);
  return val === Math.min(...all);
}

// ── CompareView ───────────────────────────────────────────────────────────────

function CompareView({
  allReadiness,
  profile,
}: {
  allReadiness: CareerReadiness[];
  profile: StudentProfile | null;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [sectorFilter, setSectorFilter] = useState<(typeof SECTORS_FILTER)[number]>("All");
  const [sortBy, setSortBy] = useState<"readiness" | "name" | "sector">("readiness");
  const [searchQ, setSearchQ] = useState("");

  function toggleCareer(name: string) {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : prev.length < 4 ? [...prev, name] : prev
    );
  }

  const filtered = allReadiness
    .filter(
      (c) =>
        (sectorFilter === "All" || c.sector === sectorFilter) &&
        c.career.toLowerCase().includes(searchQ.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "readiness") return b.readiness - a.readiness;
      if (sortBy === "name") return a.career.localeCompare(b.career);
      return a.sector.localeCompare(b.sector);
    });

  const selectedData = selected.map(
    (name) => allReadiness.find((c) => c.career === name)!
  ).filter(Boolean);

  return (
    <div className="flex flex-col gap-8">
      {/* ── Selected pills ── */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-slate-500 mr-1">Comparing:</span>
          {selected.map((name, i) => (
            <span
              key={name}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium text-white"
              style={{ background: COMPARE_COLORS[i % COMPARE_COLORS.length] }}
            >
              {name}
              <button
                onClick={() => toggleCareer(name)}
                className="hover:opacity-70 transition-opacity leading-none"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            </span>
          ))}
          {selected.length < 4 && (
            <span className="text-xs text-slate-400">
              (select up to {4 - selected.length} more)
            </span>
          )}
        </div>
      )}

      {/* ── Side-by-side comparison table ── */}
      {selectedData.length >= 2 && (
        <div className="card overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">compare_arrows</span>
              Head-to-Head Comparison
            </h3>
          </div>

          {/* Bar chart */}
          <div className="px-6 pt-5 pb-2">
            <ReadinessBarChart careers={selectedData} />
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 px-6 pb-4 justify-center">
            {selectedData.map((c, i) => (
              <div key={c.career} className="flex items-center gap-1.5 text-sm">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ background: COMPARE_COLORS[i % COMPARE_COLORS.length] }}
                />
                <span className="text-slate-700 dark:text-slate-300">{c.career}</span>
              </div>
            ))}
          </div>

          {/* Metrics table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60">
                  <th className="text-left px-5 py-3 text-slate-500 font-medium w-44">Metric</th>
                  {selectedData.map((c, i) => (
                    <th
                      key={c.career}
                      className="px-4 py-3 text-center font-semibold"
                      style={{ color: COMPARE_COLORS[i % COMPARE_COLORS.length] }}
                    >
                      {c.career}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE_METRICS.map((metric) => {
                  const vals = selectedData.map(
                    (c) => c[metric.key as keyof CareerReadiness] as number
                  );
                  return (
                    <tr
                      key={metric.key}
                      className="border-t border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-400 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-slate-400">
                          {metric.icon}
                        </span>
                        {metric.label}
                      </td>
                      {selectedData.map((c, i) => {
                        const val = c[metric.key as keyof CareerReadiness] as number;
                        const best = isBestMetric(metric.key, val, vals);
                        return (
                          <td key={c.career} className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex items-center gap-1 font-bold ${
                                best
                                  ? "text-slate-900 dark:text-white"
                                  : "text-slate-500 dark:text-slate-400"
                              }`}
                            >
                              {best && (
                                <span className="material-symbols-outlined text-[14px] text-amber-500">
                                  star
                                </span>
                              )}
                              {metric.key === "readiness" ? (
                                <span style={{ color: COMPARE_COLORS[i % COMPARE_COLORS.length] }}>
                                  {val}%
                                </span>
                              ) : (
                                <span>
                                  {val}
                                  {metric.unit}
                                </span>
                              )}
                            </span>
                            {metric.key === "readiness" && (
                              <div className="mt-1.5 w-24 mx-auto">
                                <ProgressBar value={val} color={readinessBarColor(val)} size="sm" />
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {/* Top gaps row */}
                <tr className="border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/20">
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-slate-400">
                      psychology
                    </span>
                    Top Skills to Bridge
                  </td>
                  {selectedData.map((c) => (
                    <td key={c.career} className="px-4 py-3 text-center">
                      {c.topGaps.length === 0 ? (
                        <span className="text-green-600 dark:text-green-400 text-xs font-semibold">
                          Job Ready!
                        </span>
                      ) : (
                        <div className="flex flex-col gap-1 items-center">
                          {c.topGaps.map((s) => (
                            <span
                              key={s}
                              className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-md text-slate-700 dark:text-slate-300"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  ))}
                </tr>

                {/* View full gap row */}
                <tr className="border-t border-slate-100 dark:border-slate-700/50">
                  <td className="px-5 py-3 text-slate-500 text-xs">Full Analysis</td>
                  {selectedData.map((c) => (
                    <td key={c.career} className="px-4 py-3 text-center">
                      <Link
                        href={`/market-intel?career=${encodeURIComponent(c.career)}`}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        Market Intel →
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedData.length === 1 && (
        <div className="card p-6 text-center text-slate-500 text-sm">
          <span className="material-symbols-outlined text-3xl text-slate-300 mb-2 block">
            compare_arrows
          </span>
          Select at least one more career below to compare head-to-head.
        </div>
      )}

      {/* ── All careers ranked list ── */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex flex-wrap gap-3 items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            All Careers — Ranked by Your Readiness
          </h3>
          <div className="flex flex-wrap gap-2 items-center">
            {/* Search */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]">
                search
              </span>
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search careers…"
                className="pl-8 pr-3 h-8 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>

            {/* Sector filter */}
            <div className="flex gap-1">
              {SECTORS_FILTER.map((s) => (
                <button
                  key={s}
                  onClick={() => setSectorFilter(s)}
                  className={`px-3 h-8 rounded-lg text-xs font-medium transition-colors ${
                    sectorFilter === s
                      ? "bg-primary text-white"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="h-8 px-2 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            >
              <option value="readiness">Sort: Readiness</option>
              <option value="name">Sort: Name</option>
              <option value="sector">Sort: Sector</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {filtered.map((c, rank) => {
            const isSelected = selected.includes(c.career);
            const colorIdx = selected.indexOf(c.career);
            const canAdd = !isSelected && selected.length < 4;

            return (
              <div
                key={c.career}
                className={`flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${
                  isSelected ? "bg-primary/5 dark:bg-primary/10" : ""
                }`}
              >
                {/* Rank */}
                <span className="text-sm font-bold text-slate-400 w-6 shrink-0 text-right">
                  #{rank + 1}
                </span>

                {/* Career info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="font-semibold text-slate-900 dark:text-white text-sm">
                      {c.career}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        SECTOR_COLORS[c.sector] ?? ""
                      }`}
                    >
                      {c.sector}
                    </span>
                    {isSelected && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                        style={{
                          background: COMPARE_COLORS[colorIdx % COMPARE_COLORS.length],
                        }}
                      >
                        Selected
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 max-w-[200px]">
                      <ProgressBar value={c.readiness} color={readinessBarColor(c.readiness)} size="sm" />
                    </div>
                    <span className={`text-sm font-bold ${readinessColor(c.readiness)}`}>
                      {c.readiness}%
                    </span>
                  </div>

                  {/* Gap badges */}
                  <div className="flex gap-2 mt-1.5 flex-wrap">
                    {c.criticalGaps > 0 && (
                      <span className="text-[10px] font-semibold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full">
                        {c.criticalGaps} critical
                      </span>
                    )}
                    {c.moderateGaps > 0 && (
                      <span className="text-[10px] font-semibold bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full">
                        {c.moderateGaps} moderate
                      </span>
                    )}
                    {c.noneCount > 0 && (
                      <span className="text-[10px] font-semibold bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full">
                        {c.noneCount} mastered
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">{c.timeMonths} mo to ready</span>
                  </div>
                </div>

                {/* Add / Remove button */}
                <button
                  onClick={() => toggleCareer(c.career)}
                  disabled={!canAdd && !isSelected}
                  className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isSelected
                      ? "bg-primary/10 text-primary hover:bg-primary/20"
                      : canAdd
                      ? "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                      : "opacity-30 cursor-not-allowed bg-slate-100 dark:bg-slate-700 text-slate-400"
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {isSelected ? "remove_circle" : "add_circle"}
                  </span>
                  {isSelected ? "Remove" : "Compare"}
                </button>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="p-10 text-center text-slate-400 text-sm">
              No careers match your search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SkillGapPage() {
  const [data, setData] = useState<GapAnalysisResult>(() =>
    getMockGapResult(getTargetCareer() ?? "Data Scientist")
  );
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All Skills");
  const [mode, setMode] = useState<"analysis" | "compare">("analysis");
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [altCareers, setAltCareers] = useState<CareerCompatibility[]>([]);
  const [loadingAlt, setLoadingAlt] = useState(false);

  useEffect(() => {
    syncTargetCareerFromBackend().then((backendCareer) => {
      const career = backendCareer || getTargetCareer();
      const prof = getStudentProfile();
      setProfile(prof);

      if (prof && career) {
        getSkillGap(career, prof)
          .then(setData)
          .catch(() => setData(getMockGapResult(career)));

        // Fetch alternative career compatibility
        setLoadingAlt(true);
        getCareerCompatibility(prof)
          .then((results) =>
            // Exclude the user's selected career from alternatives
            setAltCareers(results.filter((c) => c.career !== career))
          )
          .catch(() => {})
          .finally(() => setLoadingAlt(false));
      } else if (career) {
        setData(getMockGapResult(career));
      }
    });
  }, []);

  // Compute readiness for every career using current profile
  const allReadiness = useMemo<CareerReadiness[]>(
    () => MOCK.careers.map((c) => computeCareerReadiness(c, profile)),
    [profile]
  );

  const careerRank = useMemo(() => {
    const sorted = [...allReadiness].sort((a, b) => b.readiness - a.readiness);
    const idx = sorted.findIndex((c) => c.career === data.career);
    return idx === -1 ? null : idx + 1;
  }, [allReadiness, data.career]);

  const filtered: SkillGap[] =
    filter === "All Skills"
      ? data.skill_gaps
      : data.skill_gaps.filter((s) => s.severity === filter.toLowerCase());

  const critical = data.skill_gaps.filter((s) => s.severity === "critical").length;
  const moderate = data.skill_gaps.filter((s) => s.severity === "moderate").length;

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-[1200px] mx-auto w-full px-4 md:px-10 py-8 pb-28">
        {/* Breadcrumb & header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
            <Link href="/dashboard" className="hover:text-primary">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">Skill Gap Analysis</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white">
                Skill Gap Analysis
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                {mode === "analysis"
                  ? `Detailed breakdown for `
                  : `See how close you are to every career — `}
                {mode === "analysis" && (
                  <span className="font-semibold text-primary">{data.career}</span>
                )}
                {mode === "analysis" ? " roles in East Africa." : "pick up to 4 to compare."}
              </p>
            </div>
            <Link href="/assessment" className="btn-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              Retake Assessment
            </Link>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit mb-8">
          {(["analysis", "compare"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                mode === m
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {m === "analysis" ? "manage_search" : "compare_arrows"}
              </span>
              {m === "analysis" ? "My Analysis" : "Compare Careers"}
            </button>
          ))}
        </div>

        {/* ── Analysis mode ── */}
        {mode === "analysis" && (
          <>
            {/* Filter pills */}
            <div className="flex gap-2 mb-8 flex-wrap">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-5 h-9 rounded-full text-sm font-medium transition-colors ${
                    filter === f
                      ? "bg-primary text-white shadow-sm"
                      : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left: skill cards */}
              <div className="lg:col-span-2 flex flex-col gap-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Detailed Skill Breakdown
                </h2>

                {filtered.length === 0 && (
                  <div className="card p-10 flex flex-col items-center text-center">
                    <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-5xl mb-3">
                      search_off
                    </span>
                    <p className="text-slate-500">No skills match this filter.</p>
                  </div>
                )}

                {filtered.map((skill) => {
                  const cfg = SEVERITY_CONFIG[skill.severity];
                  const isCritical = skill.severity === "critical";
                  return (
                    <div
                      key={skill.skill}
                      className={`rounded-xl p-5 relative overflow-hidden border-2 ${cfg.border} ${cfg.bg} shadow-sm`}
                    >
                      {isCritical && (
                        <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wide">
                          Critical Gap
                        </div>
                      )}
                      <div className="flex items-start gap-4 mb-4">
                        <div
                          className={`flex items-center justify-center rounded-xl w-12 h-12 shrink-0 ${cfg.bg} border ${cfg.border}`}
                        >
                          <span className={`material-symbols-outlined text-2xl ${cfg.iconColor}`}>
                            {cfg.icon}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-base font-bold text-slate-900 dark:text-white">
                            {skill.skill}
                          </h4>
                          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                            Gap: {Math.round(skill.gap * 100)}% · Severity: {skill.severity}
                          </p>
                        </div>
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded-lg shrink-0 ${cfg.badge}`}
                        >
                          {skill.severity.toUpperCase()}
                        </span>
                      </div>

                      {/* Proficiency bar */}
                      <div className="bg-white/60 dark:bg-slate-900/40 rounded-xl p-4 mb-4">
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                            Proficiency vs. Required
                          </span>
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {Math.round(skill.current * 100)}%
                            <span className="text-slate-400 font-normal">
                              {" "}/ {Math.round(skill.required * 100)}%
                            </span>
                          </span>
                        </div>
                        <ProgressBar
                          value={skill.current * 100}
                          target={skill.required * 100}
                          color={cfg.bar}
                          size="lg"
                        />
                        <div className="flex justify-between mt-1 text-xs text-slate-400">
                          <span>Beginner</span>
                          <span>Target ({Math.round(skill.required * 100)}%)</span>
                        </div>
                      </div>

                      {/* Actions grid */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-white/60 dark:bg-slate-900/30 border border-white/80 dark:border-slate-700/50 rounded-xl p-3">
                          <p className="font-medium text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px] text-slate-400">
                              check_circle
                            </span>
                            Prerequisites
                          </p>
                          <p className="text-slate-700 dark:text-slate-300 text-xs">
                            Current: {Math.round(skill.current * 100)}%
                          </p>
                        </div>
                        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
                          <p className="font-medium text-primary mb-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">school</span>
                            Recommended Action
                          </p>
                          {(() => {
                            const s = skillSuggestion(skill);
                            return (
                              <>
                                <p className="text-slate-800 dark:text-slate-200 text-xs font-semibold">
                                  {s.title}
                                </p>
                                <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 leading-snug">
                                  {s.detail}
                                </p>
                              </>
                            );
                          })()}
                          <Link
                            href="/roadmap"
                            className="text-primary text-xs hover:underline mt-1 block"
                          >
                            View Roadmap →
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right: summary panel */}
              <div className="flex flex-col gap-5">
                {/* Donut */}
                <div className="card p-6 text-center">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 text-left">
                    Overall Readiness
                  </h3>
                  <div className="flex justify-center mb-3">
                    <DonutChart
                      value={data.overall_readiness * 100}
                      size={140}
                      label={readinessLabel(data.overall_readiness * 100)}
                    />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Match for {data.career} roles in East Africa.
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                    {careerRank !== null && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                        <span className="material-symbols-outlined text-[13px]">emoji_events</span>
                        #{careerRank} / {allReadiness.length} careers
                      </span>
                    )}
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                      data.overall_readiness >= 0.8
                        ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400"
                        : data.overall_readiness >= 0.55
                        ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
                        : "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400"
                    }`}>
                      {readinessLabel(data.overall_readiness * 100)}
                    </span>
                  </div>
                  <button
                    onClick={() => setMode("compare")}
                    className="mt-3 w-full btn-secondary text-xs py-2 flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">compare_arrows</span>
                    Compare to Other Careers
                  </button>
                </div>

                {/* Stats */}
                <div className="card p-5">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
                    Gap Summary
                  </h3>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-xl p-4 text-center">
                      <p className="text-2xl font-black text-red-600 dark:text-red-400">{critical}</p>
                      <p className="text-xs text-slate-500 mt-1">Critical Gaps</p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-xl p-4 text-center">
                      <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
                        {moderate}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">Moderate Gaps</p>
                    </div>
                  </div>
                </div>

                {/* Time to ready */}
                <div className="card p-5">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">schedule</span>
                    Time to Job-Ready
                  </h3>
                  <div className="flex items-end gap-2 mb-1">
                    <span className="text-4xl font-black text-slate-900 dark:text-white">
                      {data.time_to_ready_months}
                    </span>
                    <span className="text-lg font-medium text-slate-500 mb-1">months</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    Based on studying 10 hours/week.
                  </p>
                  <div className="bg-primary/10 border border-primary/20 rounded-xl p-3">
                    <p className="text-xs font-semibold text-primary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">bolt</span>
                      Accelerated: {Math.round(data.time_to_ready_months * 0.67)} months @ 15 hrs/wk
                    </p>
                  </div>
                </div>

                {/* Top skills to learn */}
                <div className="card p-5">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">
                    Priority Skills
                  </h3>
                  <div className="flex flex-col gap-2">
                    {data.top_skills_to_learn.map((s, i) => (
                      <div
                        key={s}
                        className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50"
                      >
                        <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                          {s}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Compare mode ── */}
        {mode === "compare" && <CompareView allReadiness={allReadiness} profile={profile} />}

        {/* ── Alternative Career Paths ── */}
        {mode === "analysis" && (
          <div className="mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary/10 p-2 rounded-lg">
                <span className="material-symbols-outlined text-primary text-[22px]">
                  explore
                </span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Other careers that match your profile
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Based on all skills you rated — careers where your compatibility is above 30%.
                </p>
              </div>
            </div>

            {loadingAlt ? (
              <div className="card p-8 flex items-center justify-center gap-2 text-slate-500">
                <span className="material-symbols-outlined text-xl animate-spin">autorenew</span>
                Calculating compatibility…
              </div>
            ) : altCareers.length === 0 ? (
              <div className="card p-8 text-center text-slate-500 dark:text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-2 block text-slate-300">work_off</span>
                No strong alternative matches found — add more skills to your assessment to explore broader options.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {altCareers.map((c) => {
                  const pctScore = Math.round(c.readiness_score * 100);
                  const labelColor =
                    c.readiness_label === "Advanced"
                      ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400"
                      : c.readiness_label === "Intermediate"
                      ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
                      : "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400";
                  return (
                    <div key={c.career} className="card p-5 flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-sm text-slate-900 dark:text-white">{c.career}</p>
                          <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full mt-1 inline-block">
                            {c.sector}
                          </span>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border shrink-0 ${labelColor}`}>
                          {c.readiness_label}
                        </span>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>Compatibility</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{pctScore}%</span>
                        </div>
                        <ProgressBar value={pctScore} showLabel={false} />
                      </div>
                      {c.top_gaps.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                            Top gaps
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {c.top_gaps.map((g) => (
                              <span
                                key={g.skill}
                                className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                              >
                                {g.skill.replace(/_/g, " ")} ({Math.round(g.gap * 100)}%)
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 px-6 shadow-lg z-50">
        <div className="max-w-[1200px] mx-auto flex justify-between items-center">
          <p className="text-sm text-slate-600 dark:text-slate-400 hidden sm:block">
            {mode === "compare"
              ? "Select careers to see your readiness comparison."
              : "Ready to bridge the gap?"}
          </p>
          <div className="flex gap-3 w-full sm:w-auto">
            <Link href="/dashboard" className="btn-secondary flex-1 sm:flex-none text-center py-2">
              Back to Overview
            </Link>
            <Link href="/roadmap" className="btn-primary flex-1 sm:flex-none text-center py-2">
              View Learning Path →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
