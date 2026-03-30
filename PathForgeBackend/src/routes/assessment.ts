import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { optionalAuth, verifyToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.post('/', optionalAuth, async (req, res) => {
  const { deviceId, career, profile, customSkills } = req.body;
  if (!deviceId || !career || !profile) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  // Merge customSkills into the JSON profile under a reserved key so no schema change is needed
  const storedProfile = Array.isArray(customSkills) && customSkills.length > 0
    ? { ...profile, _customSkills: customSkills }
    : profile;
  try {
    const assessment = await prisma.assessment.create({
      data: {
        deviceId,
        userId: req.user?.userId || null,
        career,
        profile: storedProfile,
      },
    });
    res.json(assessment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save assessment' });
  }
});

// Get assessments by deviceId (also returns user-linked if authenticated)
router.get('/:deviceId', optionalAuth, async (req, res) => {
  const deviceId = req.params.deviceId as string;
  try {
    const where = req.user?.userId
      ? { OR: [{ deviceId: deviceId }, { userId: req.user.userId }] }
      : { deviceId: deviceId };

    const assessments = await prisma.assessment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json(assessments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch assessments' });
  }
});

// Claim anonymous assessments after sign-in
router.post('/claim', verifyToken, async (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) {
    return res.status(400).json({ error: 'deviceId required' });
  }
  try {
    const result = await prisma.assessment.updateMany({
      where: { deviceId, userId: null },
      data: { userId: req.user!.userId },
    });
    res.json({ claimed: result.count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to claim assessments' });
  }
});

export default router;
