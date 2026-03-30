"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import ProgressBar from "@/components/ui/ProgressBar";
import {
  getSkillGap, getCareersBySector, SECTORS, MOCK, apiFetch,
  saveStudentProfile, submitAssessment,
  getCareerSkills, searchSkills, getSimilarCareerSkills, getSkillAffinityDelta,
} from "@/lib/api";
import type { Career, StudentProfile, WeightedSkill, SkillEntry, SkillAffinityDelta } from "@/lib/types";
import { getDeviceId } from "@/lib/deviceId";
import { setStudentProfile, saveTargetCareerToBackend } from "@/lib/careerStore";
import { useSession } from "next-auth/react";

type Level = 0 | 1 | 2 | 3 | 4;
const LEVEL_LABELS: Record<Level, string> = {
  0: "No Experience",
  1: "Beginner",
  2: "Intermediate",
  3: "Advanced",
  4: "Expert",
};
const LEVEL_COLORS: Record<Level, string> = {
  0: "bg-slate-300",
  1: "bg-red-400",
  2: "bg-amber-400",
  3: "bg-green-400",
  4: "bg-emerald-500",
};

const SECTOR_META: Record<string, { icon: string; description: string }> = {
  IT: {
    icon: "computer",
    description: "Software, data, AI, cybersecurity, and cloud roles",
  },
  "Business & Finance": {
    icon: "account_balance",
    description: "Finance, accounting, economics, and business analysis roles",
  },
  Engineering: {
    icon: "engineering",
    description: "Civil, mechanical, electrical, and other engineering disciplines",
  },
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

export default function AssessmentPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [step, setStep] = useState<"sector" | "career" | "skills">("sector");
  const [sector, setSector] = useState("");
  const [career, setCareer] = useState("");
  const [sectorCareers, setSectorCareers] = useState<Career[]>([]);
  const [loadingCareers, setLoadingCareers] = useState(false);
  const [levels, setLevels] = useState<Record<string, Level>>({});
  const [loading, setLoading] = useState(false);

  // ── Expanded skills state ──────────────────────────────────────────────────
  const [mandatorySkills, setMandatorySkills] = useState<WeightedSkill[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [extraSkills, setExtraSkills] = useState<WeightedSkill[]>([]);
  const [customSkills, setCustomSkills] = useState<string[]>([]);
  const [showAddMore, setShowAddMore] = useState(false);
  const [skillSearch, setSkillSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SkillEntry[]>([]);
  const [similarSkills, setSimilarSkills] = useState<WeightedSkill[]>([]);
  const [affinityDeltas, setAffinityDeltas] = useState<Record<string, SkillAffinityDelta[]>>({});
  const [customInput, setCustomInput] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [softCapWarning, setSoftCapWarning] = useState(false);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [dropdownIndex, setDropdownIndex] = useState(-1);
  const [highlightedSkill, setHighlightedSkill] = useState<string | null>(null);
  const affinityTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const skillCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Derived progress values ────────────────────────────────────────────────
  const selectedCareer = sectorCareers.find((c) => c.career === career);
  const mandatoryAnswered = mandatorySkills.filter((s) => levels[s.skill] !== undefined).length;
  const pct = mandatorySkills.length > 0 ? (mandatoryAnswered / mandatorySkills.length) * 100 : 0;
  const totalSkillCount = mandatorySkills.length + extraSkills.length + customSkills.length;

  // Fetch careers when sector changes
  useEffect(() => {
    if (!sector) return;
    setLoadingCareers(true);
    getCareersBySector(sector)
      .then((careers) => setSectorCareers(careers))
      .catch(() =>
        setSectorCareers(
          MOCK.careers.filter((c) => c.sector.toLowerCase() === sector.toLowerCase())
        )
      )
      .finally(() => setLoadingCareers(false));
  }, [sector]);

  // Fetch ALL weighted mandatory skills + similar-career skills when entering Step 3
  useEffect(() => {
    if (step !== "skills" || !career) return;
    setLoadingSkills(true);
    setMandatorySkills([]);
    setExtraSkills([]);
    setCustomSkills([]);
    setAffinityDeltas({});
    setSoftCapWarning(false);

    Promise.all([getCareerSkills(career), getSimilarCareerSkills(career)])
      .then(([skillsRes, simSkills]) => {
        setMandatorySkills(skillsRes.mandatory_skills ?? []);
        setSimilarSkills(simSkills);
      })
      .catch(() => {
        // Fallback: use skills from the sector-fetch career object
        const fallback: WeightedSkill[] = (selectedCareer?.skills ?? []).map((s) => ({
          skill: s.skill,
          label: s.skill.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          weight: s.requiredLevel,
        }));
        setMandatorySkills(fallback);
      })
      .finally(() => setLoadingSkills(false));
  }, [step, career]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced skill search
  useEffect(() => {
    if (!skillSearch.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      searchSkills(skillSearch).then(setSearchResults).catch(() => {});
    }, 400);
    return () => clearTimeout(timer);
  }, [skillSearch]);

  function handleSectorSelect(s: string) {
    setSector(s);
    setCareer("");
    setLevels({});
    setStep("career");
  }

  function setLevel(skill: string, level: Level) {
    setLevels((prev) => ({ ...prev, [skill]: level }));
  }

  // Build the current scored profile from all rated skills
  const buildProfile = useCallback((): StudentProfile => {
    const profile: StudentProfile = {};
    for (const s of mandatorySkills) {
      if (levels[s.skill] !== undefined)
        profile[slugify(s.skill)] = (levels[s.skill] as Level) / 4;
    }
    for (const s of extraSkills) {
      if (levels[s.skill] !== undefined)
        profile[slugify(s.skill)] = (levels[s.skill] as Level) / 4;
    }
    return profile;
  }, [mandatorySkills, extraSkills, levels]);

  // Rate an extra skill and trigger debounced affinity delta fetch
  function handleExtraSkillRate(skill: string, level: Level) {
    setLevel(skill, level);
    if (affinityTimers.current[skill]) clearTimeout(affinityTimers.current[skill]);
    affinityTimers.current[skill] = setTimeout(() => {
      const profileWithoutSkill = buildProfile();
      delete profileWithoutSkill[slugify(skill)];
      getSkillAffinityDelta(slugify(skill), level / 4, profileWithoutSkill)
        .then((deltas) =>
          setAffinityDeltas((prev) => ({ ...prev, [skill]: deltas.slice(0, 3) }))
        )
        .catch(() => {});
    }, 500);
  }

  function addExtraSkill(entry: WeightedSkill | SkillEntry) {
    const skillName =
      "skill_name_normalized" in entry
        ? (entry as SkillEntry).skill_name_normalized
        : (entry as WeightedSkill).skill;
    const existing = [
      ...mandatorySkills.map((s) => s.skill),
      ...extraSkills.map((s) => s.skill),
      ...customSkills,
    ];
    if (existing.includes(skillName)) return;
    if (totalSkillCount >= 30) setSoftCapWarning(true);
    const newSkill: WeightedSkill = {
      skill: skillName,
      label: skillName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      weight: "weight" in entry ? (entry as WeightedSkill).weight : 0,
      source_career: "source_career" in entry ? (entry as WeightedSkill).source_career : undefined,
    };
    setExtraSkills((prev) => [...prev, newSkill]);
    setSkillSearch("");
    setSearchResults([]);
    setSearchDropdownOpen(false);
    setDropdownIndex(-1);
    // Scroll to the newly added skill's rating card and highlight it
    setHighlightedSkill(skillName);
    setTimeout(() => {
      skillCardRefs.current[skillName]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
    setTimeout(() => setHighlightedSkill(null), 3500);
  }

  function addCustomSkill() {
    const name = customInput.trim();
    if (!name) return;
    const existing = [
      ...mandatorySkills.map((s) => s.skill),
      ...extraSkills.map((s) => s.skill),
      ...customSkills,
    ];
    if (existing.includes(name)) { setCustomInput(""); return; }
    if (totalSkillCount >= 30) setSoftCapWarning(true);
    setCustomSkills((prev) => [...prev, name]);
    setCustomInput("");
  }

  function removeExtraSkill(skill: string) {
    setExtraSkills((prev) => prev.filter((s) => s.skill !== skill));
    setLevels((prev) => { const n = { ...prev }; delete n[skill]; return n; });
    setAffinityDeltas((prev) => { const n = { ...prev }; delete n[skill]; return n; });
  }

  function removeCustomSkill(skill: string) {
    setCustomSkills((prev) => prev.filter((s) => s !== skill));
    setLevels((prev) => { const n = { ...prev }; delete n[skill]; return n; });
  }

  async function handleSubmit() {
    // Block if any mandatory skill is unrated
    const unrated = mandatorySkills.filter((s) => levels[s.skill] === undefined);
    if (unrated.length > 0) {
      setSubmitError(
        `Please rate all ${unrated.length} required skill${unrated.length > 1 ? "s" : ""} before submitting.`
      );
      return;
    }
    setSubmitError(null);
    setLoading(true);

    const profile = buildProfile();

    // Persist career + profile for other pages
    await saveTargetCareerToBackend(career);
    setStudentProfile(profile);

    const deviceId = getDeviceId();
    const studentId = session?.user?.id || deviceId;

    try {
      // Save student profile to Flask ML API
      await saveStudentProfile(studentId, {
        name: session?.user?.name ?? undefined,
        email: session?.user?.email ?? undefined,
        skills: profile,
        target_careers: [career],
      });
    } catch {
      // Flask API unavailable, continue with local data
    }

    try {
      // Submit assessment to Flask ML API for gap analysis + progress tracking
      await submitAssessment(deviceId, {
        student_id: studentId,
        career,
        skill_scores: profile,
      });
    } catch {
      // Fallback: try basic gap analysis
      try { await getSkillGap(career, profile); } catch { /* continue */ }
    }

    try {
      // Save to Express backend (include customSkills in payload)
      await apiFetch("/api/assessment", {
        method: "POST",
        body: JSON.stringify({ deviceId, career, profile, customSkills }),
      });
    } catch {
      // Express API unavailable, continue
    }

    router.push("/skill-gap");
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-[860px] mx-auto w-full px-4 md:px-8 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
            <span className="material-symbols-outlined text-[16px]">home</span>
            <span>/</span>
            <span className="text-slate-900 dark:text-white font-medium">
              Skills Assessment
            </span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
            Skills Assessment
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Rate your proficiency in each area so PathForge can calculate your
            precise skill gap.
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-8">
          {[
            { key: "sector", label: "Sector" },
            { key: "career", label: "Career" },
            { key: "skills", label: "Skills" },
          ].map((s, i) => {
            const stepOrder = ["sector", "career", "skills"];
            const currentIdx = stepOrder.indexOf(step);
            const thisIdx = i;
            const isActive = step === s.key;
            const isDone = thisIdx < currentIdx;
            return (
              <div key={s.key} className="flex items-center gap-2">
                {i > 0 && (
                  <div
                    className={`w-8 h-0.5 ${
                      isDone ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"
                    }`}
                  />
                )}
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-primary text-white"
                      : isDone
                      ? "bg-primary/10 text-primary"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {isDone
                      ? "check_circle"
                      : isActive
                      ? "radio_button_checked"
                      : "circle"}
                  </span>
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Step 1: Sector Selection ── */}
        {step === "sector" && (
          <div className="card p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-primary/10 p-3 rounded-xl">
                <span className="material-symbols-outlined text-primary text-2xl">
                  category
                </span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Choose your sector
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Select the industry that best matches your career interests.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {SECTORS.map((s) => {
                const meta = SECTOR_META[s];
                return (
                  <button
                    key={s}
                    onClick={() => handleSectorSelect(s)}
                    className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-center transition-all hover:border-primary hover:bg-primary/5 hover:shadow-md group"
                  >
                    <div className="bg-slate-100 dark:bg-slate-800 group-hover:bg-primary/10 p-4 rounded-2xl transition-colors">
                      <span className="material-symbols-outlined text-3xl text-slate-600 dark:text-slate-300 group-hover:text-primary transition-colors">
                        {meta.icon}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {s}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {meta.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Step 2: Career Selection ── */}
        {step === "career" && (
          <div className="card p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-primary/10 p-3 rounded-xl">
                <span className="material-symbols-outlined text-primary text-2xl">
                  work
                </span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  What&apos;s your target career?
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Showing roles in{" "}
                  <span className="font-semibold text-primary">{sector}</span>.
                  We&apos;ll tailor the assessment to this role.
                </p>
              </div>
            </div>

            {loadingCareers ? (
              <div className="flex items-center justify-center py-12">
                <span className="material-symbols-outlined text-2xl text-primary animate-spin">
                  autorenew
                </span>
                <span className="ml-2 text-slate-500">Loading careers...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                {sectorCareers.map((c) => (
                  <button
                    key={c.career}
                    onClick={() => {
                      setCareer(c.career);
                      setLevels({});
                    }}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                      career === c.career
                        ? "border-primary bg-primary/5 text-slate-900 dark:text-white"
                        : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[20px] ${
                        career === c.career ? "text-primary" : "text-slate-400"
                      }`}
                    >
                      {career === c.career
                        ? "radio_button_checked"
                        : "radio_button_unchecked"}
                    </span>
                    <span className="font-semibold text-sm">{c.career}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStep("sector");
                  setSector("");
                  setCareer("");
                  setLevels({});
                }}
                className="btn-secondary py-3 px-6"
              >
                <span className="material-symbols-outlined text-[18px] align-middle mr-1">
                  arrow_back
                </span>
                Back
              </button>
              <button
                onClick={() => setStep("skills")}
                disabled={!career}
                className="btn-primary py-3 px-8 text-base disabled:opacity-50"
              >
                Continue to Skill Rating
                <span className="material-symbols-outlined text-[18px] align-middle ml-1">
                  arrow_forward
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Skill Rating ── */}
        {step === "skills" && (
          <>
            {/* Progress indicator */}
            <div className="card p-4 mb-6 flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Mandatory Skills Rated
                  </span>
                  <span className="text-slate-500">
                    {mandatoryAnswered} / {mandatorySkills.length}
                  </span>
                </div>
                <ProgressBar value={pct} showLabel={false} />
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-slate-500">Target Career</p>
                <p className="font-bold text-sm text-primary">{career}</p>
              </div>
            </div>

            {/* Soft cap warning */}
            {softCapWarning && (
              <div className="mb-4 flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300 text-sm">
                <span className="material-symbols-outlined text-[18px]">warning</span>
                You've added {totalSkillCount} skills. Adding more may dilute the focus of your assessment.
                <button onClick={() => setSoftCapWarning(false)} className="ml-auto text-amber-600 hover:text-amber-800">
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            )}

            {/* ── Mandatory Career Skills ── */}
            <div className="card p-6 mb-4">
              <div className="flex items-center gap-3 mb-5">
                <div className="bg-navy/10 dark:bg-navy/30 p-2 rounded-lg">
                  <span className="material-symbols-outlined text-navy dark:text-blue-300 text-[22px]">
                    checklist
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Required Skills for {career}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    All skills below are required — rate your proficiency in each before submitting.
                  </p>
                </div>
              </div>

              {loadingSkills ? (
                <div className="flex items-center justify-center py-10 gap-2 text-slate-500">
                  <span className="material-symbols-outlined text-xl animate-spin">autorenew</span>
                  Loading skills…
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {mandatorySkills.map((skillObj, idx) => {
                    const current = levels[skillObj.skill] ?? undefined;
                    const isUnrated = current === undefined;
                    return (
                      <div
                        key={skillObj.skill}
                        className={`rounded-xl p-3 transition-all ${
                          isUnrated && submitError
                            ? "border-2 border-amber-400 bg-amber-50/40 dark:bg-amber-900/10"
                            : "border border-transparent"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-slate-400 w-5 text-right shrink-0">
                              {idx + 1}.
                            </span>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              {skillObj.label}
                            </span>
                            <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-semibold">
                              Required {Math.round(skillObj.weight * 100)}%
                            </span>
                            {isUnrated && (
                              <span className="text-[10px] text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded font-semibold">
                                Not rated
                              </span>
                            )}
                          </div>
                          {current !== undefined && (
                            <span className="text-xs font-semibold text-primary shrink-0">
                              {LEVEL_LABELS[current]}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {([0, 1, 2, 3, 4] as Level[]).map((lvl) => (
                            <button
                              key={lvl}
                              onClick={() => setLevel(skillObj.skill, lvl)}
                              className={`flex-1 py-2.5 rounded-lg border-2 text-xs font-semibold transition-all ${
                                current === lvl
                                  ? `${LEVEL_COLORS[lvl]} border-transparent text-white shadow-sm scale-105`
                                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                              }`}
                            >
                              {lvl}
                            </button>
                          ))}
                        </div>
                        <div className="flex justify-between mt-1 text-[10px] text-slate-400 px-0.5">
                          <span>None</span>
                          <span>Expert</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Extra Skills (Optional) ── */}
            <div className="card p-6 mb-4">
              <button
                onClick={() => setShowAddMore((v) => !v)}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-50 dark:bg-emerald-900/30 p-2 rounded-lg">
                    <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-[22px]">
                      add_circle
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Add More Skills{" "}
                      {(extraSkills.length + customSkills.length) > 0 && (
                        <span className="text-emerald-600 font-normal text-sm">
                          ({extraSkills.length + customSkills.length} added)
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Optional — skills you have beyond this role improve your career match accuracy.
                    </p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-slate-400 text-[20px]">
                  {showAddMore ? "expand_less" : "expand_more"}
                </span>
              </button>

              {showAddMore && (() => {
                // Dropdown items: search results if query present, else top similar skills
                const dropdownItems: Array<WeightedSkill | SkillEntry> =
                  skillSearch.trim()
                    ? searchResults
                    : similarSkills
                        .filter(
                          (s) =>
                            !mandatorySkills.some((m) => m.skill === s.skill) &&
                            !extraSkills.some((e) => e.skill === s.skill)
                        )
                        .slice(0, 12);

                return (
                <div className="mt-5 space-y-5">

                  {/* ── Skill search with dropdown ── */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                      Search &amp; add skills
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none">
                        search
                      </span>
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={skillSearch}
                        onChange={(e) => {
                          setSkillSearch(e.target.value);
                          setDropdownIndex(-1);
                          setSearchDropdownOpen(true);
                        }}
                        onFocus={() => setSearchDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setSearchDropdownOpen(false), 180)}
                        onKeyDown={(e) => {
                          if (!searchDropdownOpen || dropdownItems.length === 0) return;
                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setDropdownIndex((i) => Math.min(i + 1, dropdownItems.length - 1));
                          } else if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setDropdownIndex((i) => Math.max(i - 1, 0));
                          } else if (e.key === "Enter" && dropdownIndex >= 0) {
                            e.preventDefault();
                            addExtraSkill(dropdownItems[dropdownIndex]);
                          } else if (e.key === "Escape") {
                            setSearchDropdownOpen(false);
                          }
                        }}
                        placeholder="Type to search or click to browse…"
                        autoComplete="off"
                        className="w-full pl-9 pr-10 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                      {skillSearch && (
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => { setSkillSearch(""); setSearchResults([]); searchInputRef.current?.focus(); }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      )}

                      {/* Dropdown */}
                      {searchDropdownOpen && (
                        <div
                          ref={dropdownRef}
                          className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto"
                        >
                          {dropdownItems.length === 0 && skillSearch.trim() ? (
                            <div className="px-4 py-3 text-sm text-slate-400 text-center">
                              No skills found for &ldquo;{skillSearch}&rdquo;
                            </div>
                          ) : (
                            <>
                              {!skillSearch.trim() && (
                                <div className="px-4 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wide bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                                  Suggested — from similar careers
                                </div>
                              )}
                              {dropdownItems.map((item, idx) => {
                                const isWeighted = "skill" in item && !("skill_name_normalized" in item);
                                const label = isWeighted
                                  ? (item as WeightedSkill).label
                                  : (item as SkillEntry).skill_name_normalized
                                      .replace(/_/g, " ")
                                      .replace(/\b\w/g, (c) => c.toUpperCase());
                                const sub = isWeighted
                                  ? (item as WeightedSkill).source_career
                                  : `${(item as SkillEntry).career_frequency} career${(item as SkillEntry).career_frequency !== 1 ? "s" : ""}`;
                                const isHighlighted = idx === dropdownIndex;
                                return (
                                  <button
                                    key={isWeighted ? (item as WeightedSkill).skill : (item as SkillEntry).skill_id}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => addExtraSkill(item)}
                                    className={`flex items-center justify-between w-full px-4 py-2.5 text-sm text-left border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors ${
                                      isHighlighted
                                        ? "bg-primary/10 text-primary"
                                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                                    }`}
                                  >
                                    <span className="font-medium">{label}</span>
                                    {sub && (
                                      <span className="text-[10px] text-slate-400 shrink-0 ml-2">{sub}</span>
                                    )}
                                  </button>
                                );
                              })}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5">
                      ↑↓ to navigate · Enter to add · Esc to close · Or click any suggestion
                    </p>
                  </div>

                  {/* ── Custom free-text skill ── */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                      Add a custom skill{" "}
                      <span className="font-normal text-slate-400">(not in our database)</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addCustomSkill()}
                        placeholder="e.g. Welding, Negotiation, Adobe XD…"
                        className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                      <button onClick={addCustomSkill} className="btn-secondary px-4 py-2.5 text-sm">
                        <span className="material-symbols-outlined text-[18px]">add</span>
                      </button>
                    </div>
                    {customSkills.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {customSkills.map((s) => (
                          <span
                            key={s}
                            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                          >
                            {s}
                            <button onClick={() => removeCustomSkill(s)} className="hover:text-red-500">
                              <span className="material-symbols-outlined text-[12px]">close</span>
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── Extra skill rating cards ── */}
                  {extraSkills.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-3">
                        Rate yourself on added skills
                      </label>
                      <div className="flex flex-col gap-5">
                        {extraSkills.map((skillObj) => {
                          const current = levels[skillObj.skill] ?? undefined;
                          const deltas = affinityDeltas[skillObj.skill] ?? [];
                          const isNew = highlightedSkill === skillObj.skill;
                          return (
                            <div
                              key={skillObj.skill}
                              ref={(el) => { skillCardRefs.current[skillObj.skill] = el; }}
                              className={`relative rounded-xl p-3 transition-all duration-500 ${
                                isNew
                                  ? "border-2 border-primary bg-primary/5 shadow-md"
                                  : "border border-transparent"
                              }`}
                            >
                              {/* Scroll-to-rate prompt banner */}
                              {isNew && current === undefined && (
                                <div className="flex items-center gap-2 mb-3 text-primary text-xs font-semibold animate-pulse">
                                  <span className="material-symbols-outlined text-[16px]">touch_app</span>
                                  Rate yourself on this skill below
                                </div>
                              )}
                              <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {skillObj.label}
                                  </span>
                                  {skillObj.source_career && (
                                    <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                      via {skillObj.source_career}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded font-semibold">
                                    Optional
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {current !== undefined && (
                                    <span className="text-xs font-semibold text-primary">
                                      {LEVEL_LABELS[current]}
                                    </span>
                                  )}
                                  <button
                                    onClick={() => removeExtraSkill(skillObj.skill)}
                                    className="text-slate-400 hover:text-red-500 transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">close</span>
                                  </button>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {([0, 1, 2, 3, 4] as Level[]).map((lvl) => (
                                  <button
                                    key={lvl}
                                    onClick={() => handleExtraSkillRate(skillObj.skill, lvl)}
                                    className={`flex-1 py-2.5 rounded-lg border-2 text-xs font-semibold transition-all ${
                                      current === lvl
                                        ? `${LEVEL_COLORS[lvl]} border-transparent text-white shadow-sm scale-105`
                                        : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                                    }`}
                                  >
                                    {lvl}
                                  </button>
                                ))}
                              </div>
                              <div className="flex justify-between mt-1 text-[10px] text-slate-400 px-0.5">
                                <span>None</span>
                                <span>Expert</span>
                              </div>
                              {/* Affinity delta chips */}
                              {deltas.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {deltas.map((d) => (
                                    <span
                                      key={d.career}
                                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                        d.delta > 0
                                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                                          : "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                                      }`}
                                    >
                                      {d.delta > 0 ? "+" : ""}
                                      {Math.round(d.delta * 100)}% {d.career}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                );
              })()}
            </div>

            {/* Submit error message */}
            {submitError && (
              <div className="mb-4 flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 text-sm">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {submitError}
              </div>
            )}

            {/* Footer actions */}
            <div className="sticky bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 py-4 mt-6 -mx-4 md:-mx-8 flex justify-between items-center shadow-lg">
              <button
                onClick={() => setStep("career")}
                className="btn-secondary py-2.5 px-6"
              >
                ← Back
              </button>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">
                  {mandatoryAnswered}/{mandatorySkills.length} required rated
                </span>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="btn-primary py-2.5 px-8 disabled:opacity-60"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] animate-spin">
                        autorenew
                      </span>
                      Analysing…
                    </span>
                  ) : (
                    <>
                      Analyse My Gap
                      <span className="material-symbols-outlined text-[18px] align-middle ml-1">
                        arrow_forward
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
