"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import ProgressBar from "@/components/ui/ProgressBar";
import RadarChart from "@/components/charts/RadarChart";
import { MOCK, getCareerAlignment } from "@/lib/api";
import type { UniversityMatch } from "@/lib/types";
import { getTargetCareer, syncTargetCareerFromBackend } from "@/lib/careerStore";
import {
  UNIVERSITIES,
  REGIONS,
  PROGRAMS,
  METRIC_ROWS,
  filterUniversities,
  getMetricValue,
  getMetricScore,
  buildCSV,
  type Region,
  type Program,
  type UniversityData,
} from "@/lib/universities";

// ── Toast notification ──────────────────────────────────────────────────────
function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 dark:bg-slate-700 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-bounce-in">
      <span className="material-symbols-outlined text-[18px] text-green-400">check_circle</span>
      {message}
    </div>
  );
}

// ── Selector modal / panel ──────────────────────────────────────────────────
function SelectorPanel({
  all,
  selected,
  onToggle,
  onClose,
  region,
  program,
  search,
}: {
  all: UniversityData[];
  selected: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
  region: Region;
  program: Program;
  search: string;
}) {
  const filtered = filterUniversities(all, region, program, search);
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">compare</span>
            Select Universities to Compare
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              {selected.length}/4 selected
            </span>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <span className="material-symbols-outlined text-[20px] text-slate-400">close</span>
            </button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filtered.map((u) => {
              const isSelected = selected.includes(u.id);
              const disabled = !isSelected && selected.length >= 4;
              return (
                <button
                  key={u.id}
                  onClick={() => !disabled && onToggle(u.id)}
                  disabled={disabled}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : disabled
                      ? "border-slate-100 dark:border-slate-700 opacity-40 cursor-not-allowed"
                      : "border-slate-100 dark:border-slate-700 hover:border-primary/40 hover:shadow-sm"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-black text-xs ${u.colorClass}`}>
                    {u.abbr}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{u.fullName}</p>
                    <p className="text-[11px] text-slate-500">{u.country} · {u.type}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                      u.metrics.overall >= 85
                        ? "bg-green-100 text-green-700"
                        : u.metrics.overall >= 75
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                    }`}>
                      {u.metrics.overall}
                    </span>
                    {isSelected && (
                      <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>
                    )}
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="col-span-2 text-center text-slate-400 py-8">No universities match the current filters.</p>
            )}
          </div>
        </div>
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 flex justify-end">
          <button onClick={onClose} className="btn-primary text-sm py-2">
            Done ({selected.length} selected)
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page content ───────────────────────────────────────────────────────
function UniversitiesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Init state from URL params
  const initCompare = searchParams.get("compare")?.split(",").filter(Boolean) ?? ["cmu", "makerere", "uon"];
  const initRegion = (searchParams.get("region") as Region) ?? "All Regions";
  const initProgram = (searchParams.get("program") as Program) ?? "All Programs";

  const [matches, setMatches] = useState<UniversityMatch[]>(MOCK.universityMatches);
  const [career, setCareer] = useState("Data Scientist");
  const [region, setRegion] = useState<Region>(initRegion);
  const [program, setProgram] = useState<Program>(initProgram);
  const [search, setSearch] = useState("");
  const [compare, setCompare] = useState<string[]>(initCompare);
  const [showSelector, setShowSelector] = useState(false);
  const [sortMetric, setSortMetric] = useState<string>("overall");
  const [toast, setToast] = useState<string | null>(null);
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Sync state → URL (for sharing)
  const syncUrl = useCallback(
    (newCompare: string[], newRegion: Region, newProgram: Program) => {
      const params = new URLSearchParams();
      if (newCompare.length > 0) params.set("compare", newCompare.join(","));
      if (newRegion !== "All Regions") params.set("region", newRegion);
      if (newProgram !== "All Programs") params.set("program", newProgram);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router]
  );

  useEffect(() => {
    syncTargetCareerFromBackend().then((backendCareer) => {
      const targetCareer = backendCareer || getTargetCareer();
      if (targetCareer) {
        setCareer(targetCareer);
        setLoadingMatches(true);
        getCareerAlignment(targetCareer, { top_n: 6 })
          .then(setMatches)
          .catch(() => setMatches(MOCK.universityMatches))
          .finally(() => setLoadingMatches(false));
      }
    });
  }, []);

  const handleCareerChange = (newCareer: string) => {
    setCareer(newCareer);
    setLoadingMatches(true);
    getCareerAlignment(newCareer, { top_n: 6 })
      .then(setMatches)
      .catch(() => setMatches(MOCK.universityMatches))
      .finally(() => setLoadingMatches(false));
  };

  const setRegionAndSync = (r: Region) => {
    setRegion(r);
    syncUrl(compare, r, program);
  };
  const setProgramAndSync = (p: Program) => {
    setProgram(p);
    syncUrl(compare, region, p);
  };
  const toggleCompare = (id: string) => {
    const next = compare.includes(id)
      ? compare.filter((c) => c !== id)
      : compare.length < 4
      ? [...compare, id]
      : compare;
    setCompare(next);
    syncUrl(next, region, program);
  };

  const filtered = filterUniversities(UNIVERSITIES, region, program, search);
  const selected = compare
    .map((id) => UNIVERSITIES.find((u) => u.id === id))
    .filter(Boolean) as UniversityData[];

  // Sort filtered list by selected metric
  const sortedFiltered = [...filtered].sort(
    (a, b) => getMetricScore(b, sortMetric) - getMetricScore(a, sortMetric)
  );

  // ── Share ──────────────────────────────────────────────────────────────────
  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setToast("Comparison link copied to clipboard!");
    } catch {
      // Fallback: prompt
      const el = document.createElement("input");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setToast("Link copied!");
    }
  };

  // ── Export CSV ─────────────────────────────────────────────────────────────
  const handleExport = () => {
    const exportData = selected.length > 0 ? selected : filtered.slice(0, 10);
    const csv = buildCSV(exportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `pathforge-university-comparison-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    setToast(`Exported ${exportData.length} universities as CSV`);
  };

  const RADAR_COLORS = ["#f97415", "#3b82f6", "#10b981", "#8b5cf6"];

  return (
    <>
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      {showSelector && (
        <SelectorPanel
          all={UNIVERSITIES}
          selected={compare}
          onToggle={toggleCompare}
          onClose={() => setShowSelector(false)}
          region={region}
          program={program}
          search={search}
        />
      )}

      <main className="flex-1 max-w-[1280px] mx-auto w-full px-4 md:px-10 py-8">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
            <Link href="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">University Comparison</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white">
                University Program Comparison
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                Find the program that best fits your career goals in East Africa.
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setShowSelector(true)}
                className="btn-secondary flex items-center gap-2 py-2 text-sm"
              >
                <span className="material-symbols-outlined text-[18px]">compare</span>
                Select Universities
                <span className="bg-primary text-white text-[10px] font-black px-1.5 py-0.5 rounded-full ml-1">
                  {compare.length}
                </span>
              </button>
              <button
                onClick={handleExport}
                className="btn-secondary flex items-center gap-2 py-2 text-sm"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                Export CSV
              </button>
              <button
                onClick={handleShare}
                className="btn-primary flex items-center gap-2 py-2 text-sm"
              >
                <span className="material-symbols-outlined text-[18px]">share</span>
                Share
              </button>
            </div>
          </div>
        </div>

        {/* ── Search & Filters ───────────────────────────────────────────── */}
        <div className="card p-4 mb-6">
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 mb-4 border border-slate-200 dark:border-slate-700">
            <span className="material-symbols-outlined text-slate-400 text-[22px]">search</span>
            <input
              className="bg-transparent flex-1 text-sm placeholder:text-slate-400 text-slate-900 dark:text-white focus:outline-none"
              placeholder="Search universities or programs…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {REGIONS.map((r) => (
              <button
                key={r}
                onClick={() => setRegionAndSync(r)}
                className={`px-4 h-8 rounded-full text-xs font-medium transition-colors ${
                  region === r
                    ? "bg-primary text-white"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                }`}
              >
                {r}
              </button>
            ))}
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
            {PROGRAMS.map((p) => (
              <button
                key={p}
                onClick={() => setProgramAndSync(p)}
                className={`px-4 h-8 rounded-full text-xs font-medium transition-colors ${
                  program === p
                    ? "bg-navy/20 text-navy dark:bg-blue-900/30 dark:text-blue-300 font-bold"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* ── AI-matched list ────────────────────────────────────────────── */}
        <div className="card p-5 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">psychology</span>
              AI-Matched Programs
              {loadingMatches && (
                <span className="material-symbols-outlined text-slate-300 text-[16px] animate-spin">refresh</span>
              )}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Career / Major:</span>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-primary text-[15px] pointer-events-none">
                  work
                </span>
                <select
                  value={career}
                  onChange={(e) => handleCareerChange(e.target.value)}
                  className="pl-8 pr-8 h-9 text-sm rounded-xl border border-primary/40 bg-primary/5 text-slate-900 dark:text-white dark:bg-primary/10 font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none cursor-pointer"
                >
                  {MOCK.careers.map((c) => (
                    <option key={c.career} value={c.career}>
                      {c.career}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[14px] pointer-events-none">
                  expand_more
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {matches.map((m) => {
              const uData = UNIVERSITIES.find(
                (u) => u.fullName.toLowerCase() === m.university.toLowerCase()
              );
              const isInCompare = uData && compare.includes(uData.id);
              return (
                <div
                  key={`${m.university}-${m.program}`}
                  className="flex flex-col gap-2 p-3 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-primary/40 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${uData?.colorClass ?? "bg-slate-100 text-slate-600"}`}>
                      <span className="material-symbols-outlined text-[20px]">school</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{m.university}</p>
                      <p className="text-xs text-slate-500 truncate">{m.program} · {m.region}</p>
                    </div>
                    <div className="shrink-0 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold px-2 py-1 rounded-lg">
                      {Math.round(m.alignment_score * 100)}%
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {uData?.website && (
                      <a
                        href={uData.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                        Visit Website
                      </a>
                    )}
                    {uData && (
                      <button
                        onClick={() => toggleCompare(uData.id)}
                        className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                          isInCompare
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-slate-200 dark:border-slate-600 text-slate-500 hover:border-primary hover:text-primary"
                        }`}
                      >
                        {isInCompare ? "✓ Added" : "+ Compare"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Comparison Table ───────────────────────────────────────────── */}
        <div className="card overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Detailed Comparison
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {selected.length > 0
                  ? `Comparing ${selected.length} universities`
                  : "Select universities above to compare"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Sort by:</span>
              <select
                value={sortMetric}
                onChange={(e) => setSortMetric(e.target.value)}
                className="text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-primary"
              >
                <option value="overall">Overall Score</option>
                <option value="employability">Employability</option>
                <option value="research">Research</option>
                <option value="roi">ROI</option>
                <option value="tuition">Best Value</option>
                <option value="facilities">Facilities</option>
                <option value="studentLife">Student Life</option>
              </select>
              <button
                onClick={() => setShowSelector(true)}
                className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">edit</span>
                Edit
              </button>
            </div>
          </div>

          {selected.length === 0 ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-5xl mb-3 block">compare</span>
              <p className="text-slate-500 font-medium mb-3">No universities selected for comparison</p>
              <button onClick={() => setShowSelector(true)} className="btn-primary text-sm py-2">
                Select Universities
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left" style={{ minWidth: `${Math.max(700, 200 + selected.length * 200)}px` }}>
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                    <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-44">
                      Metric
                    </th>
                    {selected.map((u) => (
                      <th key={u.id} className="px-5 py-4 border-l border-slate-100 dark:border-slate-700">
                        <div className="flex items-start gap-2 relative pr-8">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${u.colorClass}`}>
                            {u.abbr}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{u.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{u.country} · {u.type}</p>
                          </div>
                          {u.badge && (
                            <div className={`absolute -top-3 -right-1 ${u.badgeColor} text-white text-[8px] font-black px-1.5 py-0.5 rounded-bl-lg whitespace-nowrap`}>
                              {u.badge}
                            </div>
                          )}
                          <button
                            onClick={() => toggleCompare(u.id)}
                            className="absolute top-0 right-0 p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            title="Remove from comparison"
                          >
                            <span className="material-symbols-outlined text-slate-400 text-[16px]">close</span>
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {METRIC_ROWS.map((row) => {
                    // Find the best value among selected unis for highlighting
                    const scores = selected.map((u) => getMetricScore(u, row.key));
                    const maxScore = Math.max(...scores);
                    return (
                      <tr
                        key={row.key}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${
                          sortMetric === row.key ? "bg-primary/5 dark:bg-primary/5" : ""
                        }`}
                      >
                        <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300 text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-slate-400 text-[17px]">{row.icon}</span>
                            <span className="text-xs">{row.label}</span>
                          </div>
                        </td>
                        {selected.map((u) => {
                          const val = getMetricValue(u, row.key);
                          const score = getMetricScore(u, row.key);
                          const isBest = scores.length > 1 && score === maxScore && score > 0 && row.isScore;
                          return (
                            <td key={u.id} className="px-5 py-3.5 border-l border-slate-100 dark:border-slate-700">
                              {row.key === "overall" ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-base font-bold text-slate-900 dark:text-white">{val}%</span>
                                  <div className="flex-1 max-w-[50px]">
                                    <ProgressBar value={val as number} size="sm" />
                                  </div>
                                  {isBest && (
                                    <span className="material-symbols-outlined text-primary text-[16px]">star</span>
                                  )}
                                </div>
                              ) : row.key === "alignment" ? (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold ${
                                  val === "High"
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                    : val === "Medium"
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                    : "bg-slate-100 text-slate-500"
                                }`}>
                                  {val}
                                </span>
                              ) : row.key === "research" ? (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold ${
                                  val === "Very High"
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                    : val === "High"
                                    ? "bg-green-100 text-green-700"
                                    : val === "Medium"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-slate-100 text-slate-500"
                                }`}>
                                  {val}
                                </span>
                              ) : row.isScore ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{val}</span>
                                  <div className="flex-1 max-w-[40px]">
                                    <ProgressBar value={val as number} size="sm" />
                                  </div>
                                  {isBest && (
                                    <span className="material-symbols-outlined text-primary text-[14px]">star</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{val}</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  {/* Programs row */}
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300 text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-slate-400 text-[17px]">checklist</span>
                        <span className="text-xs">Programs Offered</span>
                      </div>
                    </td>
                    {selected.map((u) => (
                      <td key={u.id} className="px-5 py-3.5 border-l border-slate-100 dark:border-slate-700">
                        <div className="flex flex-wrap gap-1">
                          {u.programs.slice(0, 4).map((p) => (
                            <span key={p} className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">
                              {p}
                            </span>
                          ))}
                          {u.programs.length > 4 && (
                            <span className="text-[10px] text-slate-400">+{u.programs.length - 4} more</span>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                  {/* Strengths row */}
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300 text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-slate-400 text-[17px]">thumb_up</span>
                        <span className="text-xs">Key Strengths</span>
                      </div>
                    </td>
                    {selected.map((u) => (
                      <td key={u.id} className="px-5 py-3.5 border-l border-slate-100 dark:border-slate-700">
                        <ul className="space-y-1">
                          {u.strengths.map((s) => (
                            <li key={s} className="text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-1">
                              <span className="material-symbols-outlined text-primary text-[11px] mt-0.5 shrink-0">check_small</span>
                              {s}
                            </li>
                          ))}
                        </ul>
                      </td>
                    ))}
                  </tr>
                  {/* Website row */}
                  <tr className="bg-slate-50 dark:bg-slate-800/30">
                    <td className="px-5 py-3.5 text-xs font-medium text-slate-500">Apply / Learn More</td>
                    {selected.map((u) => (
                      <td key={u.id} className="px-5 py-3.5 border-l border-slate-100 dark:border-slate-700">
                        <a
                          href={u.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary text-xs py-1.5 px-3 inline-flex items-center gap-1"
                        >
                          Visit Website
                          <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                        </a>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Bottom section: Radar + All Universities List ──────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Radar chart */}
          <div className="lg:col-span-2 card p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">radar</span>
              Performance Radar
            </h3>
            {selected.length > 0 ? (
              <>
                <div className="flex justify-center">
                  <RadarChart
                    axes={["Academics", "Employability", "Facilities", "ROI", "Student Life", "Research"]}
                    series={selected.map((u, i) => ({
                      label: u.name,
                      color: RADAR_COLORS[i % RADAR_COLORS.length],
                      values: u.radar,
                    }))}
                    size={300}
                  />
                </div>
                <div className="flex flex-wrap gap-4 mt-4 justify-center">
                  {selected.map((u, i) => (
                    <div key={u.id} className="flex items-center gap-1.5">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: RADAR_COLORS[i % RADAR_COLORS.length] }}
                      />
                      <span className="text-xs text-slate-600 dark:text-slate-400">{u.name}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-4xl mb-2 block">radar</span>
                <p className="text-slate-400 text-sm">Select universities to see radar chart</p>
              </div>
            )}
          </div>

          {/* Recommendations sidebar */}
          <div className="flex flex-col gap-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">lightbulb</span>
              PathForge Picks
            </h3>
            {UNIVERSITIES.filter((u) => u.badge)
              .slice(0, 3)
              .map((u) => (
                <div key={u.id} className="card p-4 relative overflow-hidden hover:shadow-md transition-shadow">
                  {u.badge && (
                    <div className={`absolute top-0 right-0 ${u.badgeColor} text-white text-[9px] font-black px-2.5 py-1 rounded-bl-xl uppercase tracking-wide`}>
                      {u.badge}
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 font-black text-xs ${u.colorClass}`}>
                      {u.abbr}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">{u.name}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {u.country} · Overall: <strong className="text-slate-700 dark:text-slate-200">{u.metrics.overall}%</strong>
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        ROI: <strong className="text-slate-700 dark:text-slate-200">{u.metrics.roi}</strong> ·
                        {" "}{u.metrics.employability}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <a
                          href={u.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                        >
                          Visit
                          <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                        </a>
                        <button
                          onClick={() => toggleCompare(u.id)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ml-1 ${
                            compare.includes(u.id)
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-slate-200 text-slate-500 hover:border-primary hover:text-primary"
                          }`}
                        >
                          {compare.includes(u.id) ? "✓ In compare" : "+ Compare"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* ── All Universities Table (sorted) ────────────────────────────── */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">format_list_bulleted</span>
              All Universities
              <span className="text-xs text-slate-400 font-normal ml-1">({sortedFiltered.length} results)</span>
            </h3>
            <span className="text-xs text-slate-400">Sorted by {sortMetric}</span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {sortedFiltered.map((u, rank) => {
              const isInCompare = compare.includes(u.id);
              return (
                <div
                  key={u.id}
                  className={`flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${
                    isInCompare ? "bg-primary/5" : ""
                  }`}
                >
                  <span className="w-6 text-center text-sm font-bold text-slate-400 shrink-0">
                    {rank + 1}
                  </span>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-black text-xs ${u.colorClass}`}>
                    {u.abbr}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">{u.fullName}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {u.country} · {u.type} · est. {u.founded} · {u.students} students
                    </p>
                  </div>
                  <div className="hidden md:flex items-center gap-4 shrink-0">
                    <div className="text-center">
                      <p className="text-xs font-black text-slate-900 dark:text-white">{u.metrics.overall}%</p>
                      <p className="text-[10px] text-slate-400">Overall</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{u.metrics.employability}</p>
                      <p className="text-[10px] text-slate-400">Employed</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{u.metrics.roi}</p>
                      <p className="text-[10px] text-slate-400">ROI</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={u.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary font-semibold hover:underline hidden sm:flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                      Visit
                    </a>
                    <button
                      onClick={() => toggleCompare(u.id)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-colors ${
                        isInCompare
                          ? "border-primary bg-primary/10 text-primary"
                          : compare.length >= 4
                          ? "border-slate-200 text-slate-400 cursor-not-allowed"
                          : "border-slate-200 dark:border-slate-600 text-slate-500 hover:border-primary hover:text-primary"
                      }`}
                      disabled={!isInCompare && compare.length >= 4}
                    >
                      {isInCompare ? "✓ Added" : "+ Compare"}
                    </button>
                  </div>
                </div>
              );
            })}
            {sortedFiltered.length === 0 && (
              <div className="p-10 text-center">
                <span className="material-symbols-outlined text-slate-300 text-4xl mb-2 block">search_off</span>
                <p className="text-slate-400">No universities match your filters.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

// ── Page export ─────────────────────────────────────────────────────────────
export default function UniversitiesPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <Suspense
        fallback={
          <main className="flex-1 max-w-[1280px] mx-auto w-full px-4 md:px-10 py-8">
            <div className="card p-12 text-center">
              <span className="material-symbols-outlined text-slate-300 text-4xl mb-3 block animate-spin">refresh</span>
              <p className="text-slate-500">Loading universities…</p>
            </div>
          </main>
        }
      >
        <UniversitiesContent />
      </Suspense>
    </div>
  );
}
