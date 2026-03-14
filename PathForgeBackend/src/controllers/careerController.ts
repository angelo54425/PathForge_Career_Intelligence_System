import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllCareers = async (req: Request, res: Response) => {
  try {
    const careers = await prisma.career.findMany({
      select: { name: true, sector: true, requiredSkills: true },
    });
    const result = careers.map(c => ({ career: c.name, sector: c.sector, skills: c.requiredSkills }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch careers' });
  }
};

export const getCareersBySector = async (req: Request, res: Response) => {
  const sectorParam = req.params.sector;
  const sector = Array.isArray(sectorParam) ? sectorParam[0] : sectorParam;
  if (!sector) {
    return res.status(400).json({ error: 'Sector parameter is required' });
  }

  try {
    const careers = await prisma.career.findMany({
      where: { sector: { equals: sector, mode: 'insensitive' } },
      select: { name: true, sector: true, requiredSkills: true },
    });
    const result = careers.map(c => ({ career: c.name, sector: c.sector, skills: c.requiredSkills }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch careers' });
  }
};