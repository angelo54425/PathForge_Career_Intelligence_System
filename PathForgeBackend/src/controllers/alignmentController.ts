import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getCareerAlignment = async (req: Request, res: Response) => {
  const careerParam = req.params.career;
  // Ensure we have a single string
  const career = Array.isArray(careerParam) ? careerParam[0] : careerParam;
  if (!career) {
    return res.status(400).json({ error: 'Career parameter is required' });
  }

  const regionParam = req.query.region;
  const region = typeof regionParam === 'string' ? regionParam : undefined;
  const top_n_param = req.query.top_n;
  const top_n = typeof top_n_param === 'string' ? top_n_param : '5';
  const topN = parseInt(top_n, 10) || 5;

  try {
    const careerRecord = await prisma.career.findFirst({
  where: {
    name: {
      equals: career,
      mode: 'insensitive', // now works!
    },
  },
});

    if (!careerRecord) {
      return res.status(404).json({ error: 'Career not found' });
    }

    const whereCondition: any = {
      careerId: careerRecord.id,
    };
    if (region && region !== 'All Regions') {
      whereCondition.program = {
        university: {
          region: region,
        },
      };
    }

    const alignments = await prisma.careerProgramAlignment.findMany({
      where: whereCondition,
      include: {
        program: {
          include: { university: true },
        },
      },
      orderBy: { alignment: 'desc' },
      take: topN,
    });

    const result = alignments.map(a => ({
      university: a.program.university.name,
      program: a.program.name,
      alignment_score: a.alignment,
      region: a.program.university.region || undefined,
    }));

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to compute alignment' });
  }
};