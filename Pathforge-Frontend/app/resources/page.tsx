"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import {
  SKILL_RESOURCES,
  PLATFORM_CONFIG,
  LEVEL_CONFIG,
  type Course,
  type Platform,
} from "@/lib/resources";

// ── Platform filter pills ───────────────────────────────────────────────────
const PLATFORMS: Platform[] = [
  "Coursera",
  "edX",
  "Udemy",
  "YouTube",
  "Khan Academy",
  "Other",
];

type LevelFilter = "All" | "Beginner" | "Intermediate" | "Advanced";

// ── Single course card ──────────────────────────────────────────────────────
function CourseCard({ course }: { course: Course }) {
  const pc = PLATFORM_CONFIG[course.platform];
  const lc = LEVEL_CONFIG[course.level];

  return (
    <a
      href={course.url}
      target="_blank"
      rel="noopener noreferrer"
      className="card p-5 flex flex-col gap-3 hover:shadow-md hover:border-primary/30 transition-all group"
    >
      {/* Platform badge + free/badge tag */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${pc.bg} ${pc.color}`}
        >
          <span className="material-symbols-outlined text-[14px]">{pc.icon}</span>
          {course.platform}
        </span>
        <div className="flex items-center gap-2">
          {course.free && (
            <span className="text-[10px] font-black bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-2 py-0.5 rounded-full uppercase tracking-wide">
              Free
            </span>
          )}
          {course.badge && course.badge !== "Free" && (
            <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-wide">
              {course.badge}
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="font-bold text-slate-900 dark:text-white text-sm leading-snug group-hover:text-primary transition-colors">
        {course.title}
      </h3>

      {/* Provider */}
      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
        <span className="material-symbols-outlined text-[13px]">person</span>
        {course.provider}
      </p>

      {/* Meta row */}
      <div className="flex items-center gap-3 mt-auto pt-2 border-t border-slate-100 dark:border-slate-700 flex-wrap">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${lc.color}`}>
          {course.level}
        </span>
        <span className="text-[11px] text-slate-400 flex items-center gap-1">
          <span className="material-symbols-outlined text-[13px]">schedule</span>
          {course.duration}
        </span>
        <span className="ml-auto text-primary text-[11px] font-semibold flex items-center gap-1 group-hover:underline">
          View course
          <span className="material-symbols-outlined text-[13px]">open_in_new</span>
        </span>
      </div>
    </a>
  );
}

// ── Skill browser (shown when no skill param) ───────────────────────────────
function SkillBrowser() {
  const allSkills = Object.keys(SKILL_RESOURCES).sort();
  return (
    <main className="flex-1 max-w-[1200px] mx-auto w-full px-4 md:px-10 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2">
          Learning Resources
        </h1>
        <p className="text-slate-500">
          Browse curated courses from Coursera, edX, Udemy, YouTube, and more
          for every skill in your roadmap.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Skills", value: allSkills.length, icon: "psychology" },
          {
            label: "Courses",
            value: Object.values(SKILL_RESOURCES).reduce(
              (s, r) => s + r.courses.length,
              0
            ),
            icon: "menu_book",
          },
          {
            label: "Free Courses",
            value: Object.values(SKILL_RESOURCES).reduce(
              (s, r) => s + r.courses.filter((c) => c.free).length,
              0
            ),
            icon: "redeem",
          },
          { label: "Platforms", value: PLATFORMS.length, icon: "devices" },
        ].map((stat) => (
          <div key={stat.label} className="card p-4 text-center">
            <span className="material-symbols-outlined text-primary text-[22px] mb-1 block">
              {stat.icon}
            </span>
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              {stat.value}
            </p>
            <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {allSkills.map((skill) => (
          <Link
            key={skill}
            href={`/resources?skill=${encodeURIComponent(skill)}`}
            className="card p-4 text-center hover:border-primary/40 hover:shadow-md transition-all group"
          >
            <span className="material-symbols-outlined text-primary text-[26px] mb-2 block">
              menu_book
            </span>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors leading-tight">
              {skill}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {SKILL_RESOURCES[skill].courses.length} courses
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}

// ── Skill detail page ───────────────────────────────────────────────────────
function SkillDetail({ skillKey }: { skillKey: string }) {
  const resource = SKILL_RESOURCES[skillKey];
  const allSkills = Object.keys(SKILL_RESOURCES).sort();

  const [platformFilter, setPlatformFilter] = useState<Platform | "All">("All");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("All");
  const [showFreeOnly, setShowFreeOnly] = useState(false);

  const platforms = [...new Set(resource.courses.map((c) => c.platform))];

  const filteredCourses = resource.courses.filter((c) => {
    if (platformFilter !== "All" && c.platform !== platformFilter) return false;
    if (levelFilter !== "All" && c.level !== levelFilter) return false;
    if (showFreeOnly && !c.free) return false;
    return true;
  });

  const freeCourses = resource.courses.filter((c) => c.free).length;

  const clearFilters = () => {
    setPlatformFilter("All");
    setLevelFilter("All");
    setShowFreeOnly(false);
  };

  const hasFilters =
    platformFilter !== "All" || levelFilter !== "All" || showFreeOnly;

  return (
    <main className="flex-1 max-w-[1200px] mx-auto w-full px-4 md:px-10 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-6 flex-wrap">
        <Link href="/roadmap" className="hover:text-primary transition-colors">
          Roadmap
        </Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <Link href="/resources" className="hover:text-primary transition-colors">
          Resources
        </Link>
        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
        <span className="text-slate-900 dark:text-white font-medium">{skillKey}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* ── LEFT SIDEBAR ────────────────────────────────────────────────── */}
        <aside className="lg:col-span-1 flex flex-col gap-5">
          {/* Skill info */}
          <div className="card p-5">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <span className="material-symbols-outlined text-primary text-[24px]">
                menu_book
              </span>
            </div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white mb-2">
              {skillKey}
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              {resource.description}
            </p>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-center">
                <p className="text-xl font-black text-primary">
                  {resource.courses.length}
                </p>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">
                  Courses
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-center">
                <p className="text-xl font-black text-green-600">{freeCourses}</p>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">
                  Free
                </p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-primary">
                  filter_list
                </span>
                Filters
              </h3>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Free only toggle */}
            <label className="flex items-center gap-3 cursor-pointer mb-4">
              <div
                onClick={() => setShowFreeOnly(!showFreeOnly)}
                className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer flex-shrink-0 ${
                  showFreeOnly
                    ? "bg-primary"
                    : "bg-slate-200 dark:bg-slate-600"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    showFreeOnly ? "translate-x-5" : ""
                  }`}
                />
              </div>
              <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                Free only
              </span>
            </label>

            {/* Level */}
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
              Level
            </p>
            <div className="flex flex-col gap-1 mb-4">
              {(["All", "Beginner", "Intermediate", "Advanced"] as const).map(
                (l) => (
                  <button
                    key={l}
                    onClick={() => setLevelFilter(l)}
                    className={`text-left text-sm px-3 py-1.5 rounded-lg transition-colors font-medium ${
                      levelFilter === l
                        ? "bg-primary/10 text-primary"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    {l}
                  </button>
                )
              )}
            </div>

            {/* Platform */}
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
              Platform
            </p>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setPlatformFilter("All")}
                className={`text-left text-sm px-3 py-1.5 rounded-lg transition-colors font-medium ${
                  platformFilter === "All"
                    ? "bg-primary/10 text-primary"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                All Platforms
              </button>
              {platforms.map((p) => {
                const pc = PLATFORM_CONFIG[p];
                return (
                  <button
                    key={p}
                    onClick={() => setPlatformFilter(p)}
                    className={`text-left text-sm px-3 py-1.5 rounded-lg transition-colors font-medium flex items-center gap-2 ${
                      platformFilter === p
                        ? "bg-primary/10 text-primary"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[14px] ${pc.color}`}
                    >
                      {pc.icon}
                    </span>
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Other skills */}
          <div className="card p-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-primary">
                explore
              </span>
              Other Skills
            </h3>
            <div className="flex flex-col gap-0.5">
              {allSkills
                .filter((s) => s !== skillKey)
                .slice(0, 9)
                .map((s) => (
                  <Link
                    key={s}
                    href={`/resources?skill=${encodeURIComponent(s)}`}
                    className="text-sm text-slate-600 dark:text-slate-300 hover:text-primary transition-colors py-1.5 border-b border-slate-50 dark:border-slate-700/60 last:border-0"
                  >
                    {s}
                  </Link>
                ))}
              <Link
                href="/resources"
                className="text-xs text-primary font-semibold mt-2 hover:underline"
              >
                View all {allSkills.length} skills →
              </Link>
            </div>
          </div>
        </aside>

        {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
        <div className="lg:col-span-3 flex flex-col gap-5">
          {/* Page header */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white">
                {skillKey} Courses
              </h1>
              <p className="text-slate-500 text-sm mt-0.5">
                {filteredCourses.length} course
                {filteredCourses.length !== 1 ? "s" : ""}
                {hasFilters ? " (filtered)" : ""}
              </p>
            </div>
            <Link
              href="/roadmap"
              className="btn-secondary flex items-center gap-2 text-sm py-2"
            >
              <span className="material-symbols-outlined text-[16px]">
                arrow_back
              </span>
              Back to Roadmap
            </Link>
          </div>

          {/* Platform quick-filter pills */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setPlatformFilter("All")}
              className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
                platformFilter === "All"
                  ? "bg-primary text-white border-primary"
                  : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary"
              }`}
            >
              All
            </button>
            {PLATFORMS.filter((p) => platforms.includes(p)).map((p) => {
              const pc = PLATFORM_CONFIG[p];
              return (
                <button
                  key={p}
                  onClick={() => setPlatformFilter(p)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1 ${
                    platformFilter === p
                      ? "bg-primary text-white border-primary"
                      : `border-slate-200 dark:border-slate-600 ${pc.color} hover:border-primary`
                  }`}
                >
                  <span className="material-symbols-outlined text-[12px]">
                    {pc.icon}
                  </span>
                  {p}
                </button>
              );
            })}
          </div>

          {/* Course grid */}
          {filteredCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCourses.map((course, i) => (
                <CourseCard key={i} course={course} />
              ))}
            </div>
          ) : (
            <div className="card p-12 text-center">
              <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-4xl mb-3 block">
                filter_alt_off
              </span>
              <p className="text-slate-500 font-medium">
                No courses match your filters.
              </p>
              <button
                onClick={clearFilters}
                className="mt-4 btn-secondary text-sm py-2"
              >
                Clear filters
              </button>
            </div>
          )}

          {/* Learning tips */}
          <div className="card p-5 bg-primary/5 border-primary/20">
            <h3 className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">lightbulb</span>
              Learning Tips
            </h3>
            <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[14px] text-primary mt-0.5">
                  check_circle
                </span>
                Start with a Beginner course before moving to Intermediate or Advanced.
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[14px] text-primary mt-0.5">
                  check_circle
                </span>
                Coursera and edX often offer free audit options — check each course page.
              </li>
              <li className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[14px] text-primary mt-0.5">
                  check_circle
                </span>
                Pair a structured Coursera/edX course with free YouTube tutorials for faster progress.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}

// ── Route resolver ──────────────────────────────────────────────────────────
function ResourcesContent() {
  const searchParams = useSearchParams();
  const skillParam = searchParams.get("skill") ?? "";

  if (!skillParam) return <SkillBrowser />;

  // Case-insensitive lookup
  const skillKey = Object.keys(SKILL_RESOURCES).find(
    (k) => k.toLowerCase() === skillParam.toLowerCase()
  );

  if (!skillKey) {
    return (
      <main className="flex-1 max-w-[1200px] mx-auto w-full px-4 md:px-10 py-8">
        <Link
          href="/resources"
          className="btn-secondary inline-flex items-center gap-2 mb-6 text-sm py-2"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          All Skills
        </Link>
        <div className="card p-12 text-center">
          <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-5xl mb-3 block">
            search_off
          </span>
          <p className="text-slate-500 text-lg font-medium mb-1">
            No resources found for &ldquo;{skillParam}&rdquo;
          </p>
          <p className="text-slate-400 text-sm mb-6">
            We may not have curated courses for this skill yet.
          </p>
          <Link
            href="/resources"
            className="btn-primary text-sm py-2 px-6 inline-block"
          >
            Browse All Skills
          </Link>
        </div>
      </main>
    );
  }

  return <SkillDetail skillKey={skillKey} />;
}

// ── Page export ─────────────────────────────────────────────────────────────
export default function ResourcesPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <Suspense
        fallback={
          <main className="flex-1 max-w-[1200px] mx-auto w-full px-4 md:px-10 py-8">
            <div className="card p-12 text-center">
              <span className="material-symbols-outlined text-slate-300 text-4xl mb-3 block animate-spin">
                refresh
              </span>
              <p className="text-slate-500">Loading resources…</p>
            </div>
          </main>
        }
      >
        <ResourcesContent />
      </Suspense>
    </div>
  );
}
