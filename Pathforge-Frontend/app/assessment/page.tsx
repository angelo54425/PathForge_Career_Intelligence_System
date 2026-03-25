"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import ProgressBar from "@/components/ui/ProgressBar";
import { getSkillGap, getCareersBySector, SECTORS, MOCK, apiFetch, saveStudentProfile, submitAssessment } from "@/lib/api";
import type { Career, StudentProfile } from "@/lib/types";
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

  // Get the selected career object to access its skills
  const selectedCareer = sectorCareers.find((c) => c.career === career);
  const careerSkills = selectedCareer?.skills ?? [];
  const allSkills = careerSkills.map((s) => s.skill);
  const answered = Object.keys(levels).length;
  const pct = allSkills.length > 0 ? (answered / allSkills.length) * 100 : 0;

  // Fetch careers when sector changes
  useEffect(() => {
    if (!sector) return;
    setLoadingCareers(true);
    getCareersBySector(sector)
      .then((careers) => {
        setSectorCareers(careers);
      })
      .catch(() => {
        setSectorCareers(
          MOCK.careers.filter(
            (c) => c.sector.toLowerCase() === sector.toLowerCase()
          )
        );
      })
      .finally(() => setLoadingCareers(false));
  }, [sector]);

  function handleSectorSelect(s: string) {
    setSector(s);
    setCareer("");
    setLevels({});
    setStep("career");
  }

  function setLevel(skill: string, level: Level) {
    setLevels((prev) => ({ ...prev, [skill]: level }));
  }

  async function handleSubmit() {
    setLoading(true);

    const profile: StudentProfile = {};
    for (const skill of allSkills) {
      profile[slugify(skill)] = (levels[skill] ?? 0) / 4;
    }

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
      // Save to Express backend
      await apiFetch("/api/assessment", {
        method: "POST",
        body: JSON.stringify({ deviceId, career, profile }),
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

        {/* ── Step 3: Skill Rating (career-specific skills) ── */}
        {step === "skills" && (
          <>
            {/* Progress indicator */}
            <div className="card p-4 mb-6 flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Assessment Progress
                  </span>
                  <span className="text-slate-500">
                    {answered} / {allSkills.length} rated
                  </span>
                </div>
                <ProgressBar value={pct} showLabel={false} />
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-slate-500">Target Career</p>
                <p className="font-bold text-sm text-primary">{career}</p>
              </div>
            </div>

            {/* Career-specific skills */}
            <div className="card p-6">
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
                    Rate your proficiency in each skill below
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-5">
                {careerSkills.map((skillObj) => {
                  const current = levels[skillObj.skill] ?? undefined;
                  return (
                    <div key={skillObj.skill}>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {skillObj.skill}
                          </span>
                          <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            Required: {Math.round(skillObj.requiredLevel * 100)}%
                          </span>
                        </div>
                        {current !== undefined && (
                          <span className="text-xs font-semibold text-primary">
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
            </div>

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
                  {answered}/{allSkills.length} rated
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
