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
 * Fetch the user's target career from /api/profile (Next.js route → Prisma)
 * and sync it to localStorage. Returns the career name or "".
 */
export async function syncTargetCareerFromBackend(): Promise<string> {
  try {
    const res = await fetch("/api/profile");
    if (!res.ok) return getTargetCareer();
    const data = await res.json();
    const career = data?.user?.targetCareer;
    if (career) {
      setTargetCareer(career);
      return career;
    }
    return getTargetCareer();
  } catch {
    return getTargetCareer();
  }
}

/**
 * Save the user's target career via /api/profile PATCH and update localStorage.
 */
export async function saveTargetCareerToBackend(career: string): Promise<void> {
  setTargetCareer(career);
  try {
    await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetCareer: career }),
    });
  } catch {
    // localStorage already updated as fallback
  }
}
