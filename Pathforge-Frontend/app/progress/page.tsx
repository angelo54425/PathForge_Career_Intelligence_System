"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Navbar from "@/components/layout/Navbar";
import ProgressBar from "@/components/ui/ProgressBar";
import DonutChart from "@/components/charts/DonutChart";
import { getTargetCareer, getStudentProfile, syncTargetCareerFromBackend } from "@/lib/careerStore";
import { MOCK, getSkillGap, getMockGapResult, getStudentReadiness, getStudentProgress } from "@/lib/api";
import { getDeviceId } from "@/lib/deviceId";
import type { GapAnalysisResult, StudentProfile, ReadinessTrajectory } from "@/lib/types";

// TODO: Fetch from /api/progress/:student_id once endpoint available
const PROGRESS_HISTORY = [
  { month: "Jan", readiness: 58 }, { month: "Feb", readiness: 61 },
  { month: "Mar", readiness: 65 }, { month: "Apr", readiness: 68 },
  { month: "May", readiness: 72 }, { month: "Jun", readiness: 75 },
  { month: "Jul", readiness: 76 }, { month: "Aug", readiness: 79 },
];

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const CURRENT_MONTH = 2; // March (0-indexed)
const CURRENT_YEAR = 2026;

function readinessLabel(pct: number): string {
  if (pct >= 80) return "Advanced";
  if (pct >= 55) return "Intermediate";
  return "Beginner";
}

function futureMonthLabel(monthsFromNow: number): string {
  const total = CURRENT_MONTH + monthsFromNow;
  return `Est. ${MONTH_NAMES[total % 12]} ${CURRENT_YEAR + Math.floor(total / 12)}`;
}

// ── Area chart ────────────────────────────────────────────────────────────────

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1], p1 = pts[i];
    const cp1x = p0.x + (p1.x - p0.x) / 3;
    const cp2x = p1.x - (p1.x - p0.x) / 3;
    d += ` C ${cp1x},${p0.y} ${cp2x},${p1.y} ${p1.x},${p1.y}`;
  }
  return d;
}

function ProgressAreaChart({
  history,
  projected,
}: {
  history: { month: string; readiness: number }[];
  projected: { month: string; readiness: number }[];
}) {
  const W = 480, H = 190;
  const PAD = { top: 28, right: 16, bottom: 34, left: 36 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  const all = [...history, ...projected];
  const minV = Math.max(0, Math.min(...all.map((p) => p.readiness)) - 8);
  const maxV = Math.min(100, Math.max(...all.map((p) => p.readiness)) + 6);
  const n = all.length;

  const xOf = (i: number) => PAD.left + (i / (n - 1)) * cW;
  const yOf = (v: number) => PAD.top + (1 - (v - minV) / (maxV - minV)) * cH;

  const allPts = all.map((p, i) => ({ x: xOf(i), y: yOf(p.readiness) }));
  const histPts = allPts.slice(0, history.length);
  const projPts = allPts.slice(history.length - 1);

  const histLine = smoothPath(histPts);
  const projLine = smoothPath(projPts);
  const areaD =
    histLine +
    ` L ${histPts[histPts.length - 1].x},${PAD.top + cH} L ${PAD.left},${PAD.top + cH} Z`;

  const gridVals = [60, 70, 80, 90, 100].filter((v) => v >= minV && v <= maxV + 2);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 190 }}>
      <defs>
        <linearGradient id="pgAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f97415" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#f97415" stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* Gridlines */}
      {gridVals.map((v) => (
        <g key={v}>
          <line
            x1={PAD.left} x2={W - PAD.right}
            y1={yOf(v)} y2={yOf(v)}
            stroke="#e2e8f0" strokeDasharray="4 3"
          />
          <text x={PAD.left - 4} y={yOf(v) + 4} textAnchor="end" fontSize={9} fill="#94a3b8">
            {v}%
          </text>
        </g>
      ))}

      {/* Area fill */}
      <path d={areaD} fill="url(#pgAreaGrad)" />

      {/* History line */}
      <path d={histLine} fill="none" stroke="#f97415" strokeWidth={2.5} strokeLinecap="round" />

      {/* Projected dashed line */}
      {projected.length > 0 && (
        <path
          d={projLine}
          fill="none"
          stroke="#f97415"
          strokeWidth={1.5}
          strokeDasharray="6 4"
          opacity={0.45}
        />
      )}

      {/* Data points */}
      {histPts.map((p, i) => {
        const isLast = i === histPts.length - 1;
        const isFirst = i === 0;
        return (
          <g key={i}>
            <circle
              cx={p.x} cy={p.y}
              r={isLast ? 5 : 3}
              fill={isLast ? "#f97415" : "white"}
              stroke="#f97415"
              strokeWidth={isLast ? 0 : 2}
            />
            {(isFirst || isLast) && (
              <text
                x={p.x} y={p.y - 9}
                textAnchor="middle"
                fontSize={10}
                fontWeight="700"
                fill="#f97415"
              >
                {history[i].readiness}%
              </text>
            )}
          </g>
        );
      })}

      {/* X-axis labels */}
      {all.map((p, i) => (
        <text
          key={i}
          x={xOf(i)} y={H - 6}
          textAnchor="middle"
          fontSize={9}
          fill={i >= history.length ? "#94a3b8" : "#64748b"}
        >
          {p.month}
          {i >= history.length ? "›" : ""}
        </text>
      ))}
    </svg>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ProgressPage() {
  const { data: session } = useSession();
  const [career, setCareer] = useState(MOCK.careers[0].career);
  const [gapData, setGapData] = useState<GapAnalysisResult | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [toast, setToast] = useState("");
  const [trajectory, setTrajectory] = useState<ReadinessTrajectory | null>(null);
  const [progressTrend, setProgressTrend] = useState<string>("insufficient_data");

  // Load career + profile on mount
  useEffect(() => {
    syncTargetCareerFromBackend().then((backendCareer) => {
      const targetCareer = backendCareer || getTargetCareer();
      const prof = getStudentProfile();
      if (targetCareer) setCareer(targetCareer);
      setProfile(prof);
      fetchGap(targetCareer, prof);
      fetchTrajectory(targetCareer);
    });
  }, []);

  async function fetchTrajectory(targetCareer: string) {
    const studentId = session?.user?.id || getDeviceId();
    try {
      const [readinessData, progressData] = await Promise.all([
        getStudentReadiness(studentId, targetCareer),
        getStudentProgress(studentId, targetCareer),
      ]);
      setTrajectory(readinessData);
      setProgressTrend(progressData.trend);
    } catch {
      // ML API unavailable, use fallback data
    }
  }

  function fetchGap(targetCareer: string, prof: StudentProfile | null) {
    if (prof) {
      getSkillGap(targetCareer, prof)
        .then(setGapData)
        .catch(() => setGapData(getMockGapResult(targetCareer)));
    } else {
      setGapData(getMockGapResult(targetCareer));
    }
  }

  function handleCareerChange(newCareer: string) {
    setCareer(newCareer);
    fetchGap(newCareer, profile);
  }

  // ── Derived stats — prefer ML trajectory when available ──
  const latest = trajectory
    ? trajectory.current_readiness_percentage
    : PROGRESS_HISTORY[PROGRESS_HISTORY.length - 1].readiness;
  const earliest = PROGRESS_HISTORY[0].readiness;
  const improvement = latest - earliest;
  const velocity = Math.round((improvement / (PROGRESS_HISTORY.length - 1)) * 10) / 10;
  const streakDays = Math.round(improvement * 0.67);

  // Projected points — use ML trajectory if available, else extrapolate
  const projected = useMemo(() => {
    if (trajectory) {
      return trajectory.trajectory
        .filter((t) => t.month >= 1 && t.month <= 3)
        .map((t) => ({
          month: MONTH_NAMES[(CURRENT_MONTH + t.month) % 12],
          readiness: Math.min(100, Math.round(t.projected_readiness)),
        }));
    }
    return Array.from({ length: 3 }, (_, i) => ({
      month: MONTH_NAMES[(CURRENT_MONTH + 1 + i) % 12],
      readiness: Math.min(100, Math.round(latest + velocity * (i + 1))),
    }));
  }, [latest, velocity, trajectory]);

  // When will readiness reach milestones? Prefer ML data
  const monthsTo90 = trajectory?.months_to_expert
    ?? (velocity > 0 ? Math.ceil((90 - latest) / velocity) : null);
  const monthsToAdvanced = trajectory?.months_to_advanced ?? null;
  const dateAt90 = monthsTo90 != null ? futureMonthLabel(monthsTo90) : null;

  // ── Skill data from gap result ──
  const skillProgress = useMemo(() => {
    if (!gapData) return [] as { skill: string; value: number; target: number; color: "red" | "yellow" | "green" | "blue"; delta: number }[];
    return gapData.skill_gaps.map((s, i) => ({
      skill: s.skill,
      value: Math.round(s.current * 100),
      target: Math.round(s.required * 100),
      color: (s.severity === "critical" ? "red" : s.severity === "moderate" ? "yellow" : "green") as "red" | "yellow" | "green" | "blue",
      // Simulate per-skill improvement as a descending function of index
      delta: Math.max(0, Math.round((improvement / (i + 2)) * 0.4)),
    }));
  }, [gapData, improvement]);

  const mostImprovedIdx = useMemo(
    () =>
      skillProgress.reduce((best, s, i) => (s.delta > (skillProgress[best]?.delta ?? 0) ? i : best), 0),
    [skillProgress]
  );

  // ── Milestones with estimated dates ──
  const milestones = useMemo(() => {
    if (!gapData) return [
      { label: "Completed Python Basics", date: "Jan 2026", done: true, icon: "code" },
      { label: "Passed Statistics Module", date: "Feb 2026", done: true, icon: "calculate" },
      { label: "Completed SQL Course", date: "Mar 2026", done: true, icon: "storage" },
      { label: "Start ML Fundamentals", date: futureMonthLabel(1), done: false, icon: "model_training" },
      { label: "Cloud Computing Module", date: futureMonthLabel(3), done: false, icon: "cloud" },
    ];

    const pastMonths = ["Jan 2026", "Feb 2026", "Mar 2026"];
    let pastIdx = 0;
    let futureMonthOffset = 1;

    return gapData.skill_gaps.map((s) => {
      const done = s.severity === "none" || s.severity === "minor";
      const date = done
        ? (pastMonths[pastIdx++] ?? "Mar 2026")
        : futureMonthLabel(futureMonthOffset++);
      return {
        label: done ? `Completed ${s.skill}` : `Complete ${s.skill}`,
        date,
        done,
        icon: s.severity === "none" ? "check_circle" : s.severity === "critical" ? "warning" : "play_circle",
      };
    });
  }, [gapData]);

  // ── Badges ──
  const badges = useMemo(() => {
    if (!gapData) return [
      { icon: "emoji_events", label: "Python Pro", earned: true, color: "text-amber-500" },
      { icon: "database", label: "SQL Master", earned: true, color: "text-blue-500" },
      { icon: "insights", label: "Stats Geek", earned: true, color: "text-purple-500" },
      { icon: "model_training", label: "ML Starter", earned: false, color: "text-slate-300" },
      { icon: "cloud", label: "Cloud Ready", earned: false, color: "text-slate-300" },
      { icon: "workspace_premium", label: "Job Ready", earned: false, color: "text-slate-300" },
    ];
    return gapData.skill_gaps.slice(0, 6).map((s) => ({
      icon: s.severity === "none" || s.severity === "minor" ? "emoji_events" : "lock",
      label: s.skill,
      earned: s.severity === "none" || s.severity === "minor",
      color: s.severity === "none" ? "text-amber-500" : s.severity === "minor" ? "text-blue-500" : "text-slate-300",
    }));
  }, [gapData]);

  // ── Heatmap — intensity reflects progress trajectory ──
  const heatmap = useMemo(() => {
    return Array.from({ length: 28 }, (_, i) => {
      const week = Math.floor(i / 7); // 0-3
      const intensities = ["bg-primary/20", "bg-primary/40", "bg-primary/65", "bg-primary"];
      if (i >= 28 - streakDays) return intensities[3]; // active streak days = full
      if (week >= 2) return intensities[2];
      if (week === 1) return intensities[1];
      return intensities[0];
    });
  }, [streakDays]);

  function handleExport() {
    window.print();
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  return (
    <div className="flex flex-col min-h-screen">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .card { box-shadow: none !important; border: 1px solid #e2e8f0 !important; }
        }
      `}</style>

      <div className="no-print">
        <Navbar />
      </div>

      <main className="flex-1 max-w-[1200px] mx-auto w-full px-4 md:px-10 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-2 no-print">
              <Link href="/dashboard" className="hover:text-primary">Dashboard</Link>
              <span>/</span>
              <span className="text-slate-900 dark:text-white font-medium">Progress Journey</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">
              Student Progress Journey
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
              Track your readiness, milestones, and learning velocity over time.
            </p>
          </div>

          <div className="flex items-center gap-3 no-print">
            {/* Career switcher */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]">
                work
              </span>
              <select
                value={career}
                onChange={(e) => handleCareerChange(e.target.value)}
                className="pl-8 pr-8 h-10 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none"
              >
                {MOCK.careers.map((c) => (
                  <option key={c.career} value={c.career}>{c.career}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[14px] pointer-events-none">
                expand_more
              </span>
            </div>

            <button
              onClick={handleExport}
              className="btn-secondary flex items-center gap-2 h-10 px-4"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Export
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left column ── */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* Readiness area chart */}
            <div className="card p-6">
              <div className="flex flex-wrap justify-between items-start gap-4 mb-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Readiness Score Over Time
                  </h3>
                  <p className="text-slate-500 text-sm">
                    8-month trajectory for{" "}
                    <span className="font-semibold text-primary">{career}</span> path
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-slate-900 dark:text-white">
                    +{improvement}%
                  </p>
                  <div className="flex items-center gap-1 justify-end text-green-600 dark:text-green-400 text-sm font-medium">
                    <span className="material-symbols-outlined text-[16px]">trending_up</span>
                    vs 8 months ago
                  </div>
                </div>
              </div>

              <ProgressAreaChart history={PROGRESS_HISTORY} projected={projected} />

              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-500 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-8 h-0.5 bg-primary rounded-full" />
                  Actual progress
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-8 border-t border-dashed border-primary/50" />
                  Projected (at current pace)
                </span>
              </div>
            </div>

            {/* Projection tile */}
            {dateAt90 && (
              <div className="rounded-xl p-4 bg-gradient-to-r from-primary/10 to-blue-500/5 border border-primary/20 flex items-center gap-4">
                <span className="material-symbols-outlined text-primary text-[28px] shrink-0">
                  flag
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    At your current pace, you&apos;ll reach{" "}
                    <span className="text-primary">90% readiness</span> by{" "}
                    <span className="text-primary font-bold">{dateAt90}</span>.
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Keep up +{velocity}%/month velocity · {monthsTo90} month
                    {monthsTo90 !== 1 ? "s" : ""} to go
                  </p>
                </div>
                <Link
                  href="/roadmap"
                  className="ml-auto shrink-0 btn-primary text-xs px-4 py-2 no-print"
                >
                  View Path →
                </Link>
              </div>
            )}

            {/* Skill-by-skill progress */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Skill Progress vs. Target
                </h3>
                <span className="text-xs text-slate-400">
                  {skillProgress.filter((s) => s.value >= s.target).length} / {skillProgress.length} skills at target
                </span>
              </div>
              <div className="flex flex-col gap-5">
                {skillProgress.map((s, i) => (
                  <div key={s.skill}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        {s.skill}
                        {i === mostImprovedIdx && (
                          <span className="text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[10px]">trending_up</span>
                            Most Improved
                          </span>
                        )}
                      </span>
                      <span className="text-slate-500">
                        {s.value}%{" "}
                        <span className="text-slate-400">/</span>{" "}
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {s.target}% target
                        </span>
                      </span>
                    </div>
                    <ProgressBar value={s.value} target={s.target} color={s.color} size="md" />
                    {s.delta > 0 && (
                      <p className="text-[10px] text-green-600 dark:text-green-400 mt-1 flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[10px]">arrow_upward</span>
                        +{s.delta}% this period
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Milestones */}
            <div className="card p-6">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-5">
                Milestones
              </h3>
              <div className="relative flex flex-col gap-0">
                {milestones.map((m, i) => (
                  <div key={i} className="flex gap-4 relative">
                    {i < milestones.length - 1 && (
                      <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-slate-100 dark:bg-slate-700" />
                    )}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 ${
                        m.done
                          ? "bg-primary text-white shadow-sm"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-400"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">{m.icon}</span>
                    </div>
                    <div className={`flex-1 ${i < milestones.length - 1 ? "pb-6" : ""}`}>
                      <div className="flex justify-between items-start">
                        <p
                          className={`text-sm font-semibold ${
                            m.done
                              ? "text-slate-900 dark:text-white"
                              : "text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {m.label}
                        </p>
                        {m.date && (
                          <span className="text-[11px] text-slate-400 ml-2 shrink-0 font-medium">
                            {m.date}
                          </span>
                        )}
                      </div>
                      {m.done ? (
                        <span className="text-[11px] font-semibold text-green-600 dark:text-green-400 flex items-center gap-0.5 mt-0.5">
                          <span className="material-symbols-outlined text-[12px]">check_circle</span>
                          Completed
                        </span>
                      ) : (
                        <span className="text-[11px] text-primary mt-0.5 flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[12px]">schedule</span>
                          Upcoming
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right column ── */}
          <div className="flex flex-col gap-5">
            {/* Current readiness */}
            <div className="card p-6 text-center">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 text-left">
                Current Readiness
              </h3>
              <div className="flex justify-center mb-2">
                <DonutChart
                  value={gapData ? Math.round(gapData.overall_readiness * 100) : latest}
                  label={readinessLabel(gapData ? gapData.overall_readiness * 100 : latest)}
                />
              </div>
              <p className="text-xs text-slate-500">{career} · East Africa</p>
              {gapData && (
                <div className="flex justify-center mt-2 mb-1">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                    gapData.overall_readiness >= 0.8
                      ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400"
                      : gapData.overall_readiness >= 0.55
                      ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
                      : "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400"
                  }`}>
                    {readinessLabel(gapData.overall_readiness * 100)}
                  </span>
                </div>
              )}
              <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg py-1.5">
                <span className="material-symbols-outlined text-[14px]">trending_up</span>
                +{improvement}% since {PROGRESS_HISTORY[0].month}
              </div>
            </div>

            {/* Velocity */}
            <div className="card p-5">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                <span className="material-symbols-outlined text-[16px]">speed</span>
                Monthly Velocity
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-slate-900 dark:text-white">
                  +{velocity}%
                </span>
                <span className="text-sm font-semibold px-2 py-0.5 rounded mb-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[14px]">trending_up</span>
                  Improving
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Average readiness gain per month
              </p>
            </div>

            {/* Streak */}
            <div className="card p-5">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">
                Learning Streak
              </h3>
              <div className="flex items-end gap-2 mb-1">
                <span className="text-4xl font-black text-primary">{streakDays}</span>
                <span className="text-slate-500 font-medium mb-1">days</span>
              </div>
              <p className="text-xs text-slate-500 mb-4">Keep it up! You&apos;re on a roll</p>
              <div className="grid grid-cols-7 gap-1">
                {heatmap.map((cls, i) => (
                  <div key={i} className={`h-5 rounded-sm ${cls}`} />
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-1.5">
                <span>4 wks ago</span>
                <span>Today</span>
              </div>
            </div>

            {/* Achievements */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Achievements
                </h3>
                <span className="text-xs text-slate-400">
                  {badges.filter((b) => b.earned).length}/{badges.length} earned
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {badges.map((b) => (
                  <div
                    key={b.label}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                      b.earned
                        ? "border-amber-200 bg-amber-50 dark:border-amber-800/30 dark:bg-amber-900/10"
                        : "border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 opacity-40"
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[26px] ${b.color}`}>
                      {b.icon}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 leading-tight">
                      {b.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 no-print">
              <Link href="/roadmap" className="btn-primary text-center py-2.5">
                Continue Learning
              </Link>
              <Link href="/assessment" className="btn-secondary text-center py-2.5">
                Retake Assessment
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm font-medium px-5 py-2.5 rounded-xl shadow-lg z-50 flex items-center gap-2 no-print">
          <span className="material-symbols-outlined text-[16px] text-green-400">check_circle</span>
          {toast}
        </div>
      )}
    </div>
  );
}
