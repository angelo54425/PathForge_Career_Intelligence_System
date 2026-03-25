"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/skill-gap", label: "Skill Gaps", icon: "troubleshoot" },
  { href: "/universities", label: "Universities", icon: "school" },
  { href: "/market-intel", label: "Market Intel", icon: "trending_up" },
  { href: "/roadmap", label: "Learning", icon: "route" },
  { href: "/progress", label: "Progress", icon: "insights" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between whitespace-nowrap border-b border-slate-200 dark:border-slate-700 px-4 md:px-10 py-3 bg-white dark:bg-slate-900 shadow-sm">
      {/* Brand */}
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
          <span className="material-symbols-outlined text-primary text-2xl">
            explore
          </span>
          <span className="text-slate-900 dark:text-white text-lg font-black tracking-tight">
            PathForge
          </span>
        </Link>

        {/* Search (hidden on mobile) */}
        <div className="hidden md:flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 min-w-[220px]">
          <span className="material-symbols-outlined text-slate-400 text-[20px]">
            search
          </span>
          <input
            className="bg-transparent text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none w-full"
            placeholder="Search careers, skills…"
          />
        </div>
      </div>

      {/* Nav links (hidden on small mobile) */}
      <nav className="hidden lg:flex items-center gap-6">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={
              pathname.startsWith(link.href) ? "nav-link-active" : "nav-link"
            }
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <Link
          href="/assessment"
          className="hidden sm:flex btn-primary text-sm py-2 px-4"
        >
          Take Assessment
        </Link>
        <button
          aria-label="Notifications"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">
            notifications
          </span>
        </button>
        {session?.user ? (
          <div className="flex items-center gap-2">
            <Link
              href="/profile"
              aria-label="Profile"
              className="flex items-center gap-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors px-3 py-1.5"
            >
              {session.user.image ? (
                <img src={session.user.image} alt="" className="w-7 h-7 rounded-full" />
              ) : (
                <span className="material-symbols-outlined text-[20px]">account_circle</span>
              )}
              <span className="hidden sm:inline text-sm font-medium">
                {session.user.name?.split(" ")[0] || "Profile"}
              </span>
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-xs text-slate-500 hover:text-red-500 transition-colors"
            >
              Sign out
            </button>
          </div>
        ) : (
          <Link
            href="/"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">account_circle</span>
          </Link>
        )}
      </div>
    </header>
  );
}
