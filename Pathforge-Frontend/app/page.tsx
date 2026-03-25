"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { getCareers, MOCK, SECTORS } from "@/lib/api";
import type { Career } from "@/lib/types";

const FEATURES = [
  {
    icon: "troubleshoot",
    title: "AI Skill Gap Analysis",
    desc: "Instantly see what skills you're missing for your dream role and how to close the gap.",
  },
  {
    icon: "school",
    title: "University Matching",
    desc: "Find the best East African university programs aligned to your target career.",
  },
  {
    icon: "trending_up",
    title: "Market Intelligence",
    desc: "Real salary data, demand scores, and top employers — all in one place.",
  },
  {
    icon: "route",
    title: "Personalised Roadmaps",
    desc: "Get a step-by-step learning plan built around your current skill level.",
  },
];

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";

export default function LandingPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [careers, setCareers] = useState<Career[]>(MOCK.careers);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCareers().then(setCareers).catch(() => {});
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (tab === "signup") {
        const res = await fetch(`${BASE}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: form.email,
            password: form.password,
            name: form.name,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Registration failed");
        }
      }

      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    await signIn("google", { callbackUrl: "/dashboard" });
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg-light dark:bg-bg-dark">
      {/* Top nav */}
      <header className="flex items-center justify-between px-6 md:px-16 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-2xl">explore</span>
          <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">PathForge</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="nav-link hidden md:block">Demo Dashboard</Link>
          <Link href="/dashboard" className="btn-primary text-sm py-2 px-4">
            Get Started
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col lg:flex-row">
        {/* ── Left hero panel ──────────────────────────────────────────────── */}
        <section className="flex-1 flex flex-col justify-center px-8 md:px-20 py-16 bg-gradient-to-br from-navy via-blue-800 to-blue-900 text-white">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-8">
              <span className="material-symbols-outlined text-[16px] text-primary">bolt</span>
              Powered by AI · Built for East Africa
            </div>
            <h1 className="text-4xl md:text-5xl font-black leading-tight mb-6">
              Forge Your{" "}
              <span className="text-primary">Career Path</span>{" "}
              with Intelligence
            </h1>
            <p className="text-white/80 text-lg leading-relaxed mb-10">
              PathForge analyses your current skills, maps them against real
              market demand, and builds a personalised roadmap to your dream
              career — all powered by East African labour market data.
            </p>

            {/* Feature pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="flex items-start gap-3 bg-white/10 backdrop-blur border border-white/15 rounded-xl p-4"
                >
                  <div className="bg-primary/20 rounded-lg p-2 shrink-0">
                    <span className="material-symbols-outlined text-primary text-[22px]">
                      {f.icon}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{f.title}</p>
                    <p className="text-white/65 text-xs mt-0.5 leading-snug">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-4 mt-10 pt-8 border-t border-white/15">
              <div className="flex -space-x-2">
                {["#6366f1", "#10b981", "#f97415", "#3b82f6"].map((c, i) => (
                  <div
                    key={i}
                    className="w-9 h-9 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: c }}
                  >
                    {["AM", "BK", "CM", "DM"][i]}
                  </div>
                ))}
              </div>
              <p className="text-white/70 text-sm">
                <span className="text-white font-bold">2,400+</span> students
                already on their path
              </p>
            </div>
          </div>
        </section>

        {/* ── Right auth panel ─────────────────────────────────────────────── */}
        <section className="flex items-center justify-center px-6 py-16 lg:w-[480px] bg-white dark:bg-slate-900">
          <div className="w-full max-w-sm">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1">
              {tab === "login" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
              {tab === "login"
                ? "Sign in to continue your career journey."
                : "Join thousands of students building their future."}
            </p>

            {/* Tab switcher */}
            <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 mb-8">
              {(["login", "signup"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setError(""); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
                    tab === t
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  {t === "login" ? "Sign In" : "Sign Up"}
                </button>
              ))}
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-3 mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {tab === "signup" && (
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
                    Full Name
                  </label>
                  <input
                    name="name"
                    type="text"
                    required
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Amara Kamau"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  />
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
                  Email Address
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
                  Password
                </label>
                <input
                  name="password"
                  type="password"
                  required
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </div>

              {tab === "signup" && (
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5">
                    Target Career
                  </label>
                  <select
                    aria-label="Target Career"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  >
                    <option value="">Select a career…</option>
                    {SECTORS.map((s) => (
                      <optgroup key={s} label={s}>
                        {careers
                          .filter((c) => c.sector.toLowerCase() === s.toLowerCase())
                          .map((c) => (
                            <option key={c.career} value={c.career}>
                              {c.career}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 text-base mt-2 disabled:opacity-60"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {tab === "login" ? "Signing in…" : "Creating account…"}
                  </span>
                ) : (
                  <>
                    {tab === "login" ? "Sign In" : "Create Account"}
                    <span className="material-symbols-outlined text-[18px] align-middle ml-1">
                      arrow_forward
                    </span>
                  </>
                )}
              </button>
            </form>

            {tab === "login" && (
              <p className="text-center text-xs text-slate-500 mt-4">
                <a href="#" className="text-primary hover:underline">
                  Forgot your password?
                </a>
              </p>
            )}

            <div className="flex items-center gap-3 my-6">
              <hr className="flex-1 border-slate-200 dark:border-slate-700" />
              <span className="text-xs text-slate-400">or continue with</span>
              <hr className="flex-1 border-slate-200 dark:border-slate-700" />
            </div>

            {/* Google OAuth */}
            <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 border border-slate-200 dark:border-slate-700 rounded-lg py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Continue with Google
            </button>

            <p className="text-center text-xs text-slate-400 mt-8">
              By continuing, you agree to PathForge&apos;s{" "}
              <a href="#" className="underline">Terms</a> &amp;{" "}
              <a href="#" className="underline">Privacy Policy</a>.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
