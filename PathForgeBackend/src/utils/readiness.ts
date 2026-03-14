import { SkillGap } from '../types';

export function computeOverallReadiness(skillGaps: SkillGap[]): number {
  if (skillGaps.length === 0) return 0;
  const sum = skillGaps.reduce((acc, s) => acc + s.current / s.required, 0);
  return Math.min(sum / skillGaps.length, 1);
}

export function estimateTimeToReady(skillGaps: SkillGap[], hoursPerWeek = 10): number {
  const totalGap = skillGaps.reduce((acc, s) => acc + s.gap, 0);
  const hoursNeeded = totalGap * 200; // heuristic
  const weeks = hoursNeeded / hoursPerWeek;
  return Math.round(weeks / 4.33);
}