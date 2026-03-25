import type { StudentProfile } from "./types";

const CAREER_KEY = "pathforge_target_career";
const PROFILE_KEY = "pathforge_student_profile";

export function getTargetCareer(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(CAREER_KEY) || "";
}

export function setTargetCareer(career: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(CAREER_KEY, career);
  }
}

export function getStudentProfile(): StudentProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(PROFILE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setStudentProfile(profile: StudentProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

/**
 * Fetch the user's target career from the backend (/api/auth/me)
 * and sync it to localStorage. Returns the career name or "".
 */
export async function syncTargetCareerFromBackend(): Promise<string> {
  try {
    const tokenRes = await fetch("/api/auth/token");
    if (!tokenRes.ok) return getTargetCareer();
    const { token } = await tokenRes.json();
    if (!token) return getTargetCareer();

    const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";
    const res = await fetch(`${base}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return getTargetCareer();
    const { user } = await res.json();
    if (user?.targetCareer) {
      setTargetCareer(user.targetCareer);
      return user.targetCareer;
    }
    return getTargetCareer();
  } catch {
    return getTargetCareer();
  }
}

/**
 * Save the user's target career to the backend (PATCH /api/auth/preferences)
 * and update localStorage.
 */
export async function saveTargetCareerToBackend(career: string): Promise<void> {
  setTargetCareer(career);
  try {
    const tokenRes = await fetch("/api/auth/token");
    if (!tokenRes.ok) return;
    const { token } = await tokenRes.json();
    if (!token) return;

    const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";
    await fetch(`${base}/api/auth/preferences`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ targetCareer: career }),
    });
  } catch {
    // localStorage is already updated as fallback
  }
}
