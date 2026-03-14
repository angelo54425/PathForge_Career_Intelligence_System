import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { cosineSimilarity } from '../utils/similarity';

const prisma = new PrismaClient();

export const getSimilarCareers = async (req: Request, res: Response) => {
  const careerParam = req.params.career;
  const career = Array.isArray(careerParam) ? careerParam[0] : careerParam;
  if (!career) {
    return res.status(400).json({ error: 'Career parameter is required' });
  }

  const top_n_param = req.query.top_n;
  const top_n = typeof top_n_param === 'string' ? top_n_param : '5';
  const topN = parseInt(top_n, 10) || 5;

  try {
    const targetCareer = await prisma.career.findFirst({
      where: { name: { equals: career, mode: 'insensitive' } },
    });

    if (!targetCareer) {
      return res.status(404).json({ error: 'Career not found' });
    }

    const allCareers = await prisma.career.findMany({
      where: { NOT: { id: targetCareer.id } },
    });

    const allSkillsSet = new Set<string>();
    const careersWithSkills = [targetCareer, ...allCareers].map(c => ({
      id: c.id,
      name: c.name,
      sector: c.sector,
      skills: (c.requiredSkills as Array<{ skill: string; requiredLevel: number }>).reduce((acc, s) => {
        allSkillsSet.add(s.skill);
        acc[s.skill] = s.requiredLevel;
        return acc;
      }, {} as Record<string, number>),
    }));

    const skillList = Array.from(allSkillsSet);
    const targetVector = skillList.map(skill => careersWithSkills[0].skills[skill] || 0);
    const similarities = careersWithSkills.slice(1).map(c => {
      const vector = skillList.map(skill => c.skills[skill] || 0);
      const similarity = cosineSimilarity(targetVector, vector);
      return {
        career: c.name,
        similarity,
        sector: c.sector,
      };
    });

    similarities.sort((a, b) => b.similarity - a.similarity);
    const top = similarities.slice(0, topN);

    res.json(top);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to compute similar careers' });
  }
};