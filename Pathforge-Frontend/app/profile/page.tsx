"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Navbar from "@/components/layout/Navbar";
import ProgressBar from "@/components/ui/ProgressBar";
import DonutChart from "@/components/charts/DonutChart";
import { useTheme } from "@/components/providers/ThemeProvider";
import { saveTargetCareerToBackend } from "@/lib/careerStore";
import { getCareers, MOCK, SECTORS } from "@/lib/api";
import type { Career } from "@/lib/types";

const FALLBACK_ACTIVITY = [
  { date: "—", action: "No assessments yet — take one to see activity", icon: "assignment", color: "text-slate-400" },
];

interface ProfileData {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    targetCareer: string | null;
    createdAt: string;
  };
  latestSkills: Record<string, number>;
  recentActivity: { career: string; createdAt: string }[];
}

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const { theme, setTheme } = useTheme();
  const [editing, setEditing] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [targetCareer, setTargetCareer] = useState("");
  const [editName, setEditName] = useState("");
  const [studyHours, setStudyHours] = useState("10");
  const [careers, setCareers] = useState<Career[]>(MOCK.careers);
  const [readiness, setReadiness] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCareers().then(setCareers).catch(() => {});
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data: ProfileData) => {
        setProfileData(data);
        setTargetCareer(data.user.targetCareer ?? "");
        setEditName(data.user.name ?? "");
        const vals = Object.values(data.latestSkills);
        if (vals.length > 0) {
          setReadiness(Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100));
        }
      })
      .catch(() => {});
  }, []);

  async function handleSave() {
    if (editing) {
      setSaving(true);
      try {
        await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: editName, targetCareer }),
        });
        saveTargetCareerToBackend(targetCareer);
        await updateSession({ name: editName });
        setProfileData((prev) =>
          prev ? { ...prev, user: { ...prev.user, name: editName, targetCareer } } : prev
        );
      } finally {
        setSaving(false);
      }
    }
    setEditing((v) => !v);
  }

  const skillEntries = Object.entries(profileData?.latestSkills ?? {}).map(([key, value]) => ({
    name: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    value: Math.round(value * 100),
  }));

  const skillsAssessed = skillEntries.length;
  const strongSkills = skillEntries.filter((s) => s.value >= 70).length;
  const gapSkills = skillEntries.filter((s) => s.value < 40).length;
  const hasAssessment = skillsAssessed > 0;

  const statCards = [
    { label: "Skills Assessed", value: String(skillsAssessed), icon: "assignment", color: "text-primary bg-primary/10" },
    { label: "Strong Skills", value: String(strongSkills), icon: "check_circle", color: "text-green-600 bg-green-50 dark:bg-green-900/20" },
    { label: "Readiness", value: hasAssessment ? `${readiness}%` : "—", icon: "local_fire_department", color: "text-orange-600 bg-orange-50 dark:bg-orange-900/20" },
    { label: "Skills to Improve", value: String(gapSkills), icon: "trending_up", color: "text-amber-500 bg-amber-50 dark:bg-amber-900/20" },
  ];

  const activityFeed =
    profileData && profileData.recentActivity.length > 0
      ? profileData.recentActivity.map((a) => ({
          date: new Date(a.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
          action: `Completed ${a.career} assessment`,
          icon: "assignment",
          color: "text-primary",
        }))
      : FALLBACK_ACTIVITY;

  const displayName = profileData?.user.name ?? session?.user?.name ?? "Student";
  const displayEmail = profileData?.user.email ?? session?.user?.email ?? "";
  const displayImage = profileData?.user.image ?? session?.user?.image ?? null;
  const memberSince = profileData?.user.createdAt
    ? new Date(profileData.user.createdAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
    : null;

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 max-w-[1200px] mx-auto w-full px-4 md:px-10 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Profile card */}
          <div className="flex flex-col gap-5">
            <div className="card p-6 text-center">
              <div className="relative w-20 h-20 mx-auto mb-4">
                {displayImage ? (
                  <img src={displayImage} alt="" className="w-20 h-20 rounded-full object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center text-white text-2xl font-black">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">{displayName}</h2>
              <p className="text-slate-500 text-sm">{displayEmail}</p>
              {memberSince && (
                <p className="text-xs text-slate-400 mt-0.5">Member since {memberSince}</p>
              )}
              {targetCareer ? (
                <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold mt-2">
                  <span className="material-symbols-outlined text-[14px]">work</span>
                  Target: {targetCareer}
                </div>
              ) : (
                <Link href="/assessment" className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-3 py-1 rounded-full text-xs font-semibold mt-2 hover:bg-amber-200 transition-colors">
                  <span className="material-symbols-outlined text-[14px]">assignment</span>
                  Take Assessment to Set Target
                </Link>
              )}
              <div className="flex justify-center mt-5">
                <DonutChart value={readiness} size={110} strokeWidth={10} label="Ready" />
              </div>
              <p className="text-xs text-slate-500 mt-3">Career readiness score</p>
              <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-700">
                <button onClick={handleSave} disabled={saving} className="btn-primary w-full py-2.5 text-sm disabled:opacity-60">
                  {saving ? "Saving…" : editing ? "Save Profile" : "Edit Profile"}
                </button>
              </div>
            </div>

            {/* Preferences */}
            <div className="card p-5">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Preferences</h3>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Full Name</label>
                  <input
                    type="text"
                    disabled={!editing}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoComplete="name"
                    aria-label="Full Name"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Target Career</label>
                  <select
                    disabled={!editing}
                    value={targetCareer}
                    onChange={(e) => setTargetCareer(e.target.value)}
                    aria-label="Target Career"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
                  >
                    {SECTORS.map((s) => (
                      <optgroup key={s} label={s}>
                        {careers
                          .filter((c) => c.sector.toLowerCase() === s.toLowerCase())
                          .map((c) => (
                            <option key={c.career} value={c.career}>{c.career}</option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Study Hours / Week</label>
                  <input
                    type="number"
                    disabled={!editing}
                    value={studyHours}
                    onChange={(e) => setStudyHours(e.target.value)}
                    min={1}
                    max={40}
                    autoComplete="off"
                    aria-label="Study Hours per Week"
                    placeholder="10"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Location</label>
                  <select disabled={!editing} aria-label="Location" className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60">
                    <option>Kenya — Nairobi</option>
                    <option>Kenya — Mombasa</option>
                    <option>Rwanda — Kigali</option>
                    <option>Uganda — Kampala</option>
                    <option>Tanzania — Dar es Salaam</option>
                    <option>Ethiopia — Addis Ababa</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Colour Theme</label>
                  <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                    {(["light", "dark"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTheme(t)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                          theme === t
                            ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">{t === "light" ? "light_mode" : "dark_mode"}</span>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div>
              <h1 className="text-3xl font-black text-slate-900 dark:text-white">My Profile</h1>
              <p className="text-slate-500 text-sm mt-1">Manage your skills, preferences, and account settings.</p>
            </div>

            {/* Skill profile */}
            <div className="card p-6">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Skill Profile</h3>
                <Link href="/assessment" className="text-primary text-xs font-semibold hover:underline flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">refresh</span>
                  Retake Assessment
                </Link>
              </div>
              {skillEntries.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {skillEntries.map((sk) => (
                    <div key={sk.name}>
                      <ProgressBar label={sk.name} value={sk.value} showLabel size="sm" color={sk.value >= 70 ? "green" : sk.value >= 40 ? "yellow" : "red"} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-5xl mb-3 block">assignment</span>
                  <p className="text-slate-500 mb-3">No assessment data yet.</p>
                  <Link href="/assessment" className="btn-primary text-sm py-2 px-6 inline-block">Take Assessment</Link>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {statCards.map((stat) => (
                <div key={stat.label} className="card p-4 text-center">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 ${stat.color}`}>
                    <span className="material-symbols-outlined text-[22px]">{stat.icon}</span>
                  </div>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">{stat.value}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Activity */}
            <div className="card p-6">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-5">Recent Activity</h3>
              <div className="flex flex-col gap-0">
                {activityFeed.map((a, i) => (
                  <div key={i} className="flex gap-4 relative">
                    {i < activityFeed.length - 1 && (
                      <div className="absolute left-4 top-10 bottom-0 w-0.5 bg-slate-100 dark:bg-slate-700" />
                    )}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 ${a.color}`}>
                      <span className="material-symbols-outlined text-[16px]">{a.icon}</span>
                    </div>
                    <div className="flex-1 pb-5">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{a.action}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{a.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Account */}
            <div className="card p-5 border-red-100 dark:border-red-900/30">
              <h3 className="text-base font-bold text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">warning</span>
                Account
              </h3>
              <div className="flex flex-wrap gap-2">
                <button className="border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 text-sm font-medium px-4 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">Reset Progress</button>
                <button className="border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 text-sm font-medium px-4 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">Delete Account</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
