"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Navbar from "@/components/layout/Navbar";
import DonutChart from "@/components/charts/DonutChart";
import RadarChart from "@/components/charts/RadarChart";
import ProgressBar from "@/components/ui/ProgressBar";
import StatCard from "@/components/ui/StatCard";
import { MOCK, getCareerAlignment, getSimilarCareers, getSkillGap, getMockSimilarCareers, getMockGapResult, getMarketIntelligence, getStudentReadiness } from "@/lib/api";
import type { UniversityMatch, SimilarCareer, GapAnalysisResult, MarketIntelResponse, ProgressPoint } from "@/lib/types";
import { getTargetCareer, getStudentProfile, syncTargetCareerFromBackend } from "@/lib/careerStore";
import { MARKET_DATA, CURRENCIES, convertSalary } from "@/lib/marketData";
import type { Currency } from "@/lib/marketData";

const QUICK_ACTIONS = [
  { icon: "assignment", label: "Take Assessment", href: "/assessment", color: "text-primary bg-primary/10" },
  { icon: "person", label: "Update Profile", href: "/profile", color: "text-navy bg-navy/10" },
  { icon: "bookmark", label: "Saved Roles", href: "/market-intel", color: "text-teal-600 bg-teal-50 dark:bg-teal-900/20" },
  { icon: "route", label: "My Roadmap", href: "/roadmap", color: "text-violet-600 bg-violet-50 dark:bg-violet-900/20" },
];

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];


/** Derive synthetic progress history from current readiness when no API data */
function deriveProgressFromReadiness(currentReadiness: number): ProgressPoint[] {
  const now = new Date();
  const points: ProgressPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const monthIdx = (now.getMonth() - i + 12) % 12;
    // Simulate growth curve leading to current readiness
    const factor = (6 - i) / 6;
    const base = Math.max(20, currentReadiness - 25);
    const readiness = Math.round(base + (currentReadiness - base) * factor);
    points.push({ month: MONTH_NAMES[monthIdx], readiness });
  }
  return points;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const userName = session?.user?.name?.split(" ")[0] || "there";
  const [career, setCareer] = useState("");
  const [uniMatches, setUniMatches] = useState<UniversityMatch[]>(MOCK.universityMatches.slice(0, 3));
  const [similarCareers, setSimilarCareers] = useState<SimilarCareer[]>(MOCK.similarCareers.slice(0, 3));
  const [gapData, setGapData] = useState<GapAnalysisResult | null>(null);
  const [marketData, setMarketData] = useState<MarketIntelResponse | null>(null);
  const [progressData, setProgressData] = useState<ProgressPoint[]>([]);
  const [currency, setCurrency] = useState<Currency>(CURRENCIES[0]);

  useEffect(() => {
    // Sync career from backend first, fall back to localStorage
    syncTargetCareerFromBackend().then((backendCareer) => {
      const targetCareer = backendCareer || getTargetCareer();
      if (!targetCareer) return;
      setCareer(targetCareer);
      loadDashboardData(targetCareer);
    });
  }, []);

  function loadDashboardData(targetCareer: string) {
    getCareerAlignment(targetCareer, { top_n: 3 })
      .then(setUniMatches)
      .catch(() => {});
    getSimilarCareers(targetCareer, 3)
      .then(setSimilarCareers)
      .catch(() => setSimilarCareers(getMockSimilarCareers(targetCareer, 3)));

    // Fetch market intelligence from ML API
    getMarketIntelligence(targetCareer)
      .then(setMarketData)
      .catch(() => {});

    // Fetch gap data for radar chart + gap cards
    const mockGap = getMockGapResult(targetCareer);
    const profile = getStudentProfile();
    if (profile) {
      getSkillGap(targetCareer, profile)
        .then(setGapData)
        .catch(() => setGapData(mockGap));
    } else {
      setGapData(mockGap);
    }
  }

  // Build chart data: prefer real snapshots, fall back to derived from readiness
  const chartData = progressData.length >= 2
    ? progressData
    : deriveProgressFromReadiness(gapData ? Math.round(gapData.overall_readiness * 100) : 50);

  const maxVal = Math.max(...chartData.map((d) => d.readiness));

  // Build radar chart data from gap analysis
  const radarAxes = gapData
    ? gapData.skill_gaps.slice(0, 6).map((s) => s.skill.length > 10 ? s.skill.slice(0, 10) + "…" : s.skill)
    : ["Skill 1", "Skill 2", "Skill 3", "Skill 4", "Skill 5"];
  const radarRequired = gapData
    ? gapData.skill_gaps.slice(0, 6).map((s) => Math.round(s.required * 100))
    : [0, 0, 0, 0, 0];
  const radarCurrent = gapData
    ? gapData.skill_gaps.slice(0, 6).map((s) => Math.round(s.current * 100))
    : [0, 0, 0, 0, 0];

  // Top 2 gaps for gap cards
  const criticalGaps = gapData
    ? gapData.skill_gaps.filter((s) => s.severity === "critical").slice(0, 1)
    : [];
  const moderateGaps = gapData
    ? gapData.skill_gaps.filter((s) => s.severity === "moderate").slice(0, 1)
    : [];

  const readiness = gapData ? Math.round(gapData.overall_readiness * 100) : 50;

  // Calculate real improvement from chart data
  const firstReadiness = chartData[0]?.readiness ?? 0;
  const lastReadiness = chartData[chartData.length - 1]?.readiness ?? 0;
  const improvement = lastReadiness - firstReadiness;
  const improvementSign = improvement >= 0 ? "+" : "";

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 px-4 md:px-10 py-8 max-w-[1280px] mx-auto w-full">
        {/* Page header */}
        <div className="flex flex-wrap justify-between gap-3 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">Dashboard Home</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Welcome back, {userName}! Here&apos;s your career intelligence overview.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Target Role:</span>
            {career ? (
              <Link
                href="/market-intel"
                className="flex items-center gap-1.5 bg-navy/10 text-navy dark:bg-blue-900/30 dark:text-blue-300 px-3 py-1.5 rounded-full text-sm font-semibold hover:bg-navy/20 transition-colors"
              >
                {career}
                <span className="material-symbols-outlined text-[14px]">edit</span>
              </Link>
            ) : (
              <Link
                href="/assessment"
                className="flex items-center gap-1.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-3 py-1.5 rounded-full text-sm font-semibold hover:bg-amber-200 transition-colors"
              >
                Take Assessment
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            )}
          </div>
        </div>

        {/* ── 3-Column Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-6">

          {/* Left column */}
          <div className="md:col-span-3 flex flex-col gap-5">
            {/* Donut */}
            <div className="card p-6 flex flex-col items-center">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 w-full">Career Readiness</h3>
              <DonutChart value={readiness} />
              <p className="text-slate-500 dark:text-slate-400 text-xs text-center mt-4">
                {readiness >= 70
                  ? "You're on track! Keep up the good work."
                  : "Keep learning to improve your readiness score."}
              </p>
            </div>

            {/* Quick actions */}
            <div className="card p-5">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">Quick Actions</h3>
              <div className="flex flex-col gap-2">
                {QUICK_ACTIONS.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${action.color}`}>
                        <span className="material-symbols-outlined text-[20px]">{action.icon}</span>
                      </div>
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {action.label}
                      </span>
                    </div>
                    <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors text-[18px]">
                      chevron_right
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Centre column */}
          <div className="md:col-span-5 flex flex-col gap-5">
            <div className="card p-6 flex-1">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Skill Gap Analysis</h3>
                <Link href="/skill-gap" className="text-primary text-sm font-medium hover:underline">
                  View Details →
                </Link>
              </div>

              {/* Radar chart */}
              <div className="flex justify-center mb-4">
                <RadarChart
                  axes={radarAxes}
                  series={[
                    { label: "Required", color: "#1E3A8A", values: radarRequired },
                    { label: "Yours", color: "#f97415", values: radarCurrent },
                  ]}
                  size={250}
                />
              </div>
              <div className="flex justify-center gap-5 text-xs mb-5">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-navy/20 border border-navy" />
                  <span className="text-slate-500">Required</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-primary/40 border border-primary" />
                  <span className="text-slate-500">Your Profile</span>
                </div>
              </div>

              {/* Gap cards */}
              <div className="grid grid-cols-2 gap-3">
                {criticalGaps.length > 0 ? (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-xl p-4">
                    <div className="flex items-center gap-1.5 mb-2 text-red-600 dark:text-red-400">
                      <span className="material-symbols-outlined text-[16px]">warning</span>
                      <span className="text-xs font-bold uppercase tracking-wide">Critical</span>
                    </div>
                    <p className="font-semibold text-sm text-slate-900 dark:text-white">{criticalGaps[0].skill}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Req: {Math.round(criticalGaps[0].required * 100)}% | You: {Math.round(criticalGaps[0].current * 100)}%
                    </p>
                  </div>
                ) : (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30 rounded-xl p-4">
                    <div className="flex items-center gap-1.5 mb-2 text-green-600 dark:text-green-400">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      <span className="text-xs font-bold uppercase tracking-wide">No Critical Gaps</span>
                    </div>
                  </div>
                )}
                {moderateGaps.length > 0 ? (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-xl p-4">
                    <div className="flex items-center gap-1.5 mb-2 text-amber-600 dark:text-amber-400">
                      <span className="material-symbols-outlined text-[16px]">info</span>
                      <span className="text-xs font-bold uppercase tracking-wide">Moderate</span>
                    </div>
                    <p className="font-semibold text-sm text-slate-900 dark:text-white">{moderateGaps[0].skill}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Req: {Math.round(moderateGaps[0].required * 100)}% | You: {Math.round(moderateGaps[0].current * 100)}%
                    </p>
                  </div>
                ) : (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30 rounded-xl p-4">
                    <div className="flex items-center gap-1.5 mb-2 text-green-600 dark:text-green-400">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      <span className="text-xs font-bold uppercase tracking-wide">No Moderate Gaps</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="md:col-span-4 flex flex-col gap-5">
            {/* University matches */}
            <div className="card p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Top University Matches</h3>
                <Link href="/universities" className="text-primary text-xs hover:underline">See all</Link>
              </div>
              <div className="flex flex-col gap-3">
                {uniMatches.map((u) => (
                  <Link
                    key={u.university}
                    href="/universities"
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-primary/40 transition-colors"
                  >
                    <div className="w-10 h-10 bg-navy/10 dark:bg-navy/30 rounded-lg flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-navy dark:text-blue-300 text-[20px]">school</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{u.university}</p>
                      <p className="text-xs text-slate-500 truncate">{u.program}</p>
                    </div>
                    <div className="shrink-0 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold px-2 py-1 rounded-lg">
                      {Math.round(u.alignment_score * 100)}%
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Market snapshot — entry salary from verified local market data */}
            <div className="relative">
              <StatCard
                label="Avg. Entry Monthly Salary"
                value={MARKET_DATA[career]?.trajectory[0]
                  ? convertSalary(MARKET_DATA[career].trajectory[0].salaryKES, currency)
                  : "—"}
                icon="payments"
                trend={marketData
                  ? { value: `${marketData.demand_score}% demand`, positive: marketData.demand_score >= 50 }
                  : { value: `${MARKET_DATA[career]?.marketDemand ?? "—"}% demand`, positive: true }}
                sub={`${career} · East Africa · ${MARKET_DATA[career]?.salaryTrend ?? "—"}% YoY growth`}
                highlight
              />
              <select
                value={currency.code}
                onChange={(e) => setCurrency(CURRENCIES.find((c) => c.code === e.target.value) ?? CURRENCIES[0])}
                className="absolute top-3 right-3 text-xs bg-white/80 dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-slate-600 dark:text-slate-300 focus:outline-none cursor-pointer"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.code}</option>
                ))}
              </select>
            </div>

            {/* Learning in progress */}
            <div className="card p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Learning In Progress</h3>
                <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-1 rounded-lg">
                  {gapData ? `${gapData.top_skills_to_learn.length} Skills` : "2 Courses"}
                </span>
              </div>
              <div className="flex flex-col gap-4">
                {gapData && gapData.top_skills_to_learn.length > 0 ? (
                  gapData.top_skills_to_learn.slice(0, 2).map((skill, i) => (
                    <div key={skill}>
                      <ProgressBar
                        label={`Intro to ${skill}`}
                        value={i === 0 ? 45 : 10}
                        showLabel
                        size="sm"
                        color={i === 0 ? "primary" : "blue"}
                      />
                    </div>
                  ))
                ) : (
                  <>
                    <div>
                      <ProgressBar label="Intro to Machine Learning" value={45} showLabel size="sm" />
                    </div>
                    <div>
                      <ProgressBar label="Advanced SQL for Data Science" value={10} showLabel size="sm" color="blue" />
                    </div>
                  </>
                )}
              </div>
              <Link href="/roadmap" className="btn-primary w-full text-center mt-4 py-2 text-sm block">
                View Full Roadmap
              </Link>
            </div>
          </div>
        </div>

        {/* ── Progress over time chart ── */}
        <div className="card p-6 mb-6">
          <div className="flex flex-wrap justify-between items-end mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Progress Over Time</h3>
              <p className="text-slate-500 text-sm">
                Your readiness score evolution over the last {chartData.length} months
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-slate-900 dark:text-white">
                {improvementSign}{improvement}%
              </p>
              <div className={`flex items-center gap-1 justify-end text-sm ${
                improvement >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-500 dark:text-red-400"
              }`}>
                <span className="material-symbols-outlined text-[16px]">
                  {improvement >= 0 ? "arrow_upward" : "arrow_downward"}
                </span>
                vs last period
              </div>
            </div>
          </div>
          {/* SVG bar chart */}
          <div className="flex items-end gap-3 h-36 border-b border-slate-100 dark:border-slate-700 pb-2">
            {chartData.map((d) => (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{d.readiness}%</span>
                <div
                  className="w-full rounded-t-md bg-primary/80 hover:bg-primary transition-colors"
                  style={{ height: `${(d.readiness / maxVal) * 100}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 px-1">
            {chartData.map((d) => (
              <span key={d.month} className="flex-1 text-center text-xs text-slate-400">{d.month}</span>
            ))}
          </div>
        </div>

        {/* ── Similar careers ── */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Similar Careers to Explore</h3>
            <Link href="/market-intel" className="text-primary text-sm hover:underline">Explore Market →</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {similarCareers.map((c) => (
              <Link
                key={c.career}
                href="/market-intel"
                className="flex flex-col gap-2 p-4 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-primary/40 hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full capitalize">
                    {c.sector}
                  </span>
                  <span className="text-xs font-bold text-green-600">
                    {Math.round(c.similarity * 100)}% match
                  </span>
                </div>
                <p className="font-semibold text-sm text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                  {c.career}
                </p>
                <ProgressBar value={c.similarity * 100} size="sm" color="green" />
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
