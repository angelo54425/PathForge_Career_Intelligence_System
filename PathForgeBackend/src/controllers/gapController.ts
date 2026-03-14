import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { StudentProfile, SkillGap, GapAnalysisResult } from '../types';
import { computeOverallReadiness, estimateTimeToReady } from '../utils/readiness';

const prisma = new PrismaClient();

const normalizeSkill = (skillName: string): string => {
  return skillName.toLowerCase().replace(/ /g, '_');
};

export const getSkillGap = async (req: Request, res: Response) => {
  const { career, student_profile } = req.body as {
    career: string;
    student_profile: StudentProfile;
  };

  if (typeof career !== 'string' || !career) {
    return res.status(400).json({ error: 'Invalid career' });
  }

  try {
    const careerRecord = await prisma.career.findFirst({
      where: { name: { equals: career, mode: 'insensitive' } },
    });

    if (!careerRecord) {
      return res.status(404).json({ error: 'Career not found' });
    }

    const requiredSkills = careerRecord.requiredSkills as Array<{ skill: string; requiredLevel: number }>;

    const skillGaps: SkillGap[] = requiredSkills.map(req => {
      const current = student_profile[normalizeSkill(req.skill)] || 0;
      const gap = Math.max(0, req.requiredLevel - current);
      let severity: SkillGap['severity'] = 'none';
      if (gap > 0.4) severity = 'critical';
      else if (gap > 0.2) severity = 'moderate';
      else if (gap > 0.05) severity = 'minor';
      return {
        skill: req.skill,
        required: req.requiredLevel,
        current,
        gap,
        severity,
      };
    });

    const overall_readiness = computeOverallReadiness(skillGaps);
    const time_to_ready_months = estimateTimeToReady(skillGaps, 10);

    const top_skills_to_learn = skillGaps
      .filter(s => s.gap > 0.05)
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 3)
      .map(s => s.skill);

    const result: GapAnalysisResult = {
      career,
      overall_readiness,
      time_to_ready_months,
      skill_gaps: skillGaps,
      top_skills_to_learn,
    };

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to compute skill gap' });
  }
};