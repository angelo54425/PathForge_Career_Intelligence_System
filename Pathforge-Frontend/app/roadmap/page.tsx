"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Navbar from "@/components/layout/Navbar";
import ProgressBar from "@/components/ui/ProgressBar";
import type { LearningModule, RoadmapResponse } from "@/lib/types";
import { getTargetCareer, getStudentProfile, syncTargetCareerFromBackend } from "@/lib/careerStore";
import { MOCK, getStudentRoadmap } from "@/lib/api";
import { getDeviceId } from "@/lib/deviceId";

// Generate learning modules from a career's required skills
function generateModules(careerName: string): LearningModule[] {
  // Find the career in MOCK data to get its skills
  const careerData = MOCK.careers.find(
    (c) => c.career.toLowerCase() === careerName.toLowerCase()
  );

  if (!careerData || !careerData.skills || careerData.skills.length === 0) {
    // Fallback modules
    return [
      { id: "assess", title: "Take Skills Assessment", duration_weeks: 1, phase: "foundation", status: "locked", dependencies: [] },
      { id: "roadmap", title: "Generate Personalised Roadmap", duration_weeks: 1, phase: "foundation", status: "locked", dependencies: ["assess"] },
    ];
  }

  const profile = getStudentProfile();
  const skills = careerData.skills;

  // Sort skills by gap (largest gap = most work needed)
  const sorted = [...skills].sort((a, b) => {
    const gapA = a.requiredLevel - (profile ? (profile[a.skill.toLowerCase().replace(/ /g, "_")] ?? 0) : 0);
    const gapB = b.requiredLevel - (profile ? (profile[b.skill.toLowerCase().replace(/ /g, "_")] ?? 0) : 0);
    return gapA - gapB; // smallest gap first (foundations)
  });

  return sorted.map((skill, i) => {
    const key = skill.skill.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    const currentLevel = profile ? (profile[key] ?? 0) : 0;
    const gap = Math.max(0, skill.requiredLevel - currentLevel);

    let status: LearningModule["status"] = "locked";
    let phase: LearningModule["phase"] = "foundation";

    if (gap <= 0.05) {
      status = "completed";
      phase = "foundation";
    } else if (i === sorted.findIndex((s) => {
      const k = s.skill.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      const cl = profile ? (profile[k] ?? 0) : 0;
      return Math.max(0, s.requiredLevel - cl) > 0.05;
    })) {
      status = "in_progress";
      phase = i < sorted.length / 3 ? "foundation" : i < (sorted.length * 2) / 3 ? "specialization" : "proficiency";
    } else {
      phase = i < sorted.length / 3 ? "foundation" : i < (sorted.length * 2) / 3 ? "specialization" : "proficiency";
    }

    const durationWeeks = Math.max(2, Math.round(gap * 12));

    return {
      id: key,
      title: skill.skill,
      duration_weeks: durationWeeks,
      phase,
      status,
      is_critical: gap > 0.4,
      dependencies: i > 0 ? [sorted[i - 1].skill.toLowerCase().replace(/[^a-z0-9]+/g, "_")] : [],
    };
  });
}

// Convert ML API roadmap response to LearningModule array
function convertRoadmapResponse(data: RoadmapResponse): LearningModule[] {
  const modules: LearningModule[] = [];
  const phaseKeys = ["foundation", "specialization", "proficiency"] as const;

  for (const phase of phaseKeys) {
    const skills = data.phases[phase] ?? [];
    for (const skill of skills) {
      const durationWeeks = Math.max(2, Math.round(skill.duration_months * 4.3));
      const isCompleted = skill.gap <= 0.05;
      const isFirst = modules.every((m) => m.status !== "in_progress") && !isCompleted;

      modules.push({
        id: skill.skill.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
        title: skill.skill.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        duration_weeks: durationWeeks,
        phase,
        status: isCompleted ? "completed" : isFirst ? "in_progress" : "locked",
        is_critical: skill.priority === "HIGH",
        dependencies: skill.prerequisites?.map((p) =>
          p.toLowerCase().replace(/[^a-z0-9]+/g, "_")
        ),
      });
    }
  }

  return modules;
}

const PHASE_CONFIG = {
  foundation: { label: "Phase 1: Foundation", icon: "menu_book", color: "text-primary bg-primary/10", bar: "primary" as const, months: "Months 1–4" },
  specialization: { label: "Phase 2: Specialisation", icon: "psychology", color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20", bar: "blue" as const, months: "Months 5–10" },
  proficiency: { label: "Phase 3: Proficiency", icon: "workspace_premium", color: "text-violet-600 bg-violet-50 dark:bg-violet-900/20", bar: "green" as const, months: "Months 11–14" },
};

const STATUS_STYLES = {
  completed: "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md",
  in_progress: "bg-gradient-to-r from-primary to-orange-500 text-white shadow-md",
  locked: "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300",
};

const STATUS_ICONS = {
  completed: "check_circle",
  in_progress: "play_circle",
  locked: "lock",
};

export default function RoadmapPage() {
  const { data: session } = useSession();
  const [career, setCareer] = useState("");
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [apiSource, setApiSource] = useState<"ml" | "local">("local");

  useEffect(() => {
    syncTargetCareerFromBackend().then((backendCareer) => {
      const targetCareer = backendCareer || getTargetCareer();
      if (!targetCareer) return;
      setCareer(targetCareer);
      loadRoadmap(targetCareer);
    });
  }, []);

  async function loadRoadmap(targetCareer: string) {
    const studentId = session?.user?.id || getDeviceId();
    try {
      // Try ML API roadmap first
      const roadmapData = await getStudentRoadmap(studentId, targetCareer);
      const converted = convertRoadmapResponse(roadmapData);
      if (converted.length > 0) {
        setModules(converted);
        setApiSource("ml");
        const firstActive = converted.find((m) => m.status === "in_progress") || converted.find((m) => m.status === "locked");
        if (firstActive) setExpandedId(firstActive.id);
        return;
      }
    } catch {
      // ML API unavailable, fall back to local generation
    }
    const generated = generateModules(targetCareer);
    setModules(generated);
    setApiSource("local");
    const firstActive = generated.find((m) => m.status === "in_progress") || generated.find((m) => m.status === "locked");
    if (firstActive) setExpandedId(firstActive.id);
  }

  const phases = ["foundation", "specialization", "proficiency"] as const;
  const completed = modules.filter((m) => m.status === "completed").length;
  const totalWeeks = modules.reduce((a, m) => a + m.duration_weeks, 0);
  const totalMonths = (totalWeeks / 4.3).toFixed(1);

  // Build dependency map from modules
  const depPairs = modules
    .filter((m) => m.dependencies && m.dependencies.length > 0)
    .slice(0, 4)
    .map((m) => ({
      from: modules.find((x) => x.id === m.dependencies![0])?.title ?? m.dependencies![0],
      to: m.title,
      active: m.status === "in_progress" || modules.find((x) => x.id === m.dependencies![0])?.status === "in_progress",
    }));

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-[1200px] mx-auto w-full px-4 md:px-10 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Roadmap timeline */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-start gap-4">
              <div>
                <h1 className="text-4xl font-black text-slate-900 dark:text-white">
                  Personalised Learning Roadmap
                </h1>
                <p className="text-primary font-semibold mt-1">
                  {career} · Estimated Duration: {totalMonths} months
                </p>
              </div>
              <Link href="/assessment" className="btn-secondary flex items-center gap-2 py-2">
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                Retake Assessment
              </Link>
            </div>

            {modules.length === 0 && (
              <div className="card p-10 text-center">
                <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-5xl mb-3 block">route</span>
                <p className="text-slate-500 mb-3">Take an assessment to generate your personalised roadmap.</p>
                <Link href="/assessment" className="btn-primary text-sm py-2 px-6 inline-block">
                  Start Assessment
                </Link>
              </div>
            )}

            {/* Phases */}
            {phases.map((phase) => {
              const cfg = PHASE_CONFIG[phase];
              const phaseModules = modules.filter((m) => m.phase === phase);
              if (phaseModules.length === 0) return null;
              const phaseDone = phaseModules.filter((m) => m.status === "completed").length;
              const isActive = phaseModules.some((m) => m.status === "in_progress");
              const isLocked = phaseModules.every((m) => m.status === "locked");

              return (
                <div key={phase} className="card p-6 relative">
                  {/* Phase header */}
                  <div className="flex items-center gap-4 mb-5">
                    <div className={`p-2.5 rounded-xl ${cfg.color} shrink-0`}>
                      <span className="material-symbols-outlined text-[22px]">{cfg.icon}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">{cfg.label}</h3>
                        {isActive && (
                          <span className="text-[10px] font-bold bg-primary text-white px-2 py-0.5 rounded-full uppercase tracking-wide animate-pulse">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">{cfg.months}</p>
                    </div>
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                      {phaseDone}/{phaseModules.length}
                    </span>
                  </div>

                  {/* Phase progress bar */}
                  <ProgressBar
                    value={(phaseDone / phaseModules.length) * 100}
                    color={isLocked ? "blue" : cfg.bar}
                    size="sm"
                  />

                  {/* Modules */}
                  <div className="flex flex-col gap-3 mt-5">
                    {phaseModules.map((mod) => (
                      <div key={mod.id}>
                        <button
                          onClick={() => setExpandedId(expandedId === mod.id ? null : mod.id)}
                          className={`w-full rounded-xl p-4 flex items-center justify-between relative overflow-hidden transition-all ${STATUS_STYLES[mod.status]}`}
                        >
                          {/* Critical badge */}
                          {mod.is_critical && mod.status === "locked" && (
                            <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-bl-lg uppercase tracking-widest">
                              CRITICAL
                            </div>
                          )}
                          <div className="text-left">
                            <h4 className="font-bold">{mod.title}</h4>
                            <p className={`text-sm ${mod.status === "locked" ? "text-slate-400" : "text-white/80"}`}>
                              {mod.duration_weeks} weeks
                              {mod.dependencies && mod.dependencies.length > 0 && (
                                <span className="ml-2 text-[11px] opacity-70">
                                  · Requires: {mod.dependencies.join(", ")}
                                </span>
                              )}
                            </p>
                          </div>
                          <span className={`material-symbols-outlined text-[24px] ${mod.status === "locked" ? "text-slate-400" : "text-white"}`}>
                            {expandedId === mod.id ? "expand_less" : STATUS_ICONS[mod.status]}
                          </span>
                        </button>

                        {/* Expanded module detail */}
                        {expandedId === mod.id && (
                          <div className="mt-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl p-5 border border-slate-200 dark:border-slate-700 text-sm">
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Duration</p>
                                <p className="font-bold text-slate-900 dark:text-white">{mod.duration_weeks} weeks</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Phase</p>
                                <p className="font-bold text-slate-900 dark:text-white capitalize">{mod.phase}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Status</p>
                                <p className={`font-bold capitalize ${mod.status === "completed" ? "text-green-600" : mod.status === "in_progress" ? "text-primary" : "text-slate-500"}`}>
                                  {mod.status.replace("_", " ")}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Priority</p>
                                <p className={`font-bold ${mod.is_critical ? "text-red-600" : "text-slate-600 dark:text-slate-300"}`}>
                                  {mod.is_critical ? "Critical" : "Standard"}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2 mt-2">
                              <Link
                                href="/skill-gap"
                                className="btn-primary text-xs py-2 px-4 flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[14px]">play_circle</span>
                                {mod.status === "in_progress" ? "Continue" : "Start Module"}
                              </Link>
                              <Link
                                href={`/resources?skill=${encodeURIComponent(mod.title)}`}
                                className="btn-secondary text-xs py-2 px-3 flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[14px]">menu_book</span>
                                View Resources
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Summary sidebar */}
          <aside className="flex flex-col gap-5">
            {/* Summary */}
            <div className="card p-5">
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">analytics</span>
                Roadmap Summary
              </h2>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { label: "Duration", value: `${totalMonths}m`, highlight: true },
                  { label: "Modules", value: String(modules.length), highlight: false },
                  { label: "Completed", value: `${completed}/${modules.length}`, highlight: false },
                  { label: "Total Weeks", value: String(totalWeeks), highlight: false },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center border border-slate-100 dark:border-slate-700"
                  >
                    <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider mb-1">{s.label}</p>
                    <p className={`text-xl font-black ${s.highlight ? "text-primary" : "text-slate-900 dark:text-white"}`}>
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>
              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                {phases.map((phase) => {
                  const phaseModules = modules.filter((m) => m.phase === phase);
                  if (phaseModules.length === 0) return null;
                  const phaseDone = phaseModules.filter((m) => m.status === "completed").length;
                  const pct = Math.round((phaseDone / phaseModules.length) * 100);
                  return (
                    <div key={phase}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">{phase}</span>
                        <span className={`font-bold ${pct > 0 ? "text-primary" : "text-slate-400"}`}>{pct}%</span>
                      </div>
                      <ProgressBar value={pct} size="sm" color={pct > 0 ? "primary" : "blue"} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dependency map */}
            <div className="card p-5">
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">account_tree</span>
                Dependency Map
              </h2>
              <div className="flex flex-col gap-3 text-sm">
                {depPairs.length > 0 ? depPairs.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`px-2 py-1 rounded text-xs font-bold ${d.active ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : "bg-slate-100 dark:bg-slate-700 text-slate-500"}`}>
                      {d.from}
                    </div>
                    <span className="material-symbols-outlined text-slate-400 text-[16px]">arrow_forward</span>
                    <div className={`flex-1 px-2 py-1 rounded text-xs font-bold border ${d.active ? "border-primary/40 bg-primary/5 text-slate-800 dark:text-slate-200" : "border-dashed border-slate-300 dark:border-slate-600 text-slate-400"}`}>
                      {d.to}
                    </div>
                  </div>
                )) : (
                  <p className="text-xs text-slate-400">Take an assessment to see dependencies.</p>
                )}
              </div>
            </div>

            {/* Study plan */}
            <div className="card p-5">
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">schedule</span>
                Study Plan
              </h2>
              <div className="flex flex-col gap-2 text-sm">
                {[
                  { pace: "Casual (5 hrs/wk)", time: `~${(totalWeeks / 4.3 * 2).toFixed(0)} months` },
                  { pace: "Standard (10 hrs/wk)", time: `~${totalMonths} months`, selected: true },
                  { pace: "Accelerated (15 hrs/wk)", time: `~${(totalWeeks / 4.3 * 0.67).toFixed(0)} months` },
                  { pace: "Intensive (20 hrs/wk)", time: `~${(totalWeeks / 4.3 * 0.5).toFixed(0)} months` },
                ].map((p) => (
                  <div
                    key={p.pace}
                    className={`flex justify-between items-center p-3 rounded-xl border ${
                      p.selected
                        ? "border-primary bg-primary/5"
                        : "border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600"
                    }`}
                  >
                    <span className={p.selected ? "font-semibold text-primary" : "text-slate-700 dark:text-slate-300"}>
                      {p.pace}
                    </span>
                    <span className={p.selected ? "font-bold text-primary" : "text-slate-500"}>
                      {p.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Link href="/skill-gap" className="btn-primary text-center py-3">
              View My Skill Gaps
            </Link>
          </aside>
        </div>
      </main>
    </div>
  );
}
