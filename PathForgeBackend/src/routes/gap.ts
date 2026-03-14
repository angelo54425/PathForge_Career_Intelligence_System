import { Router } from 'express';
import { getSkillGap } from '../controllers/gapController';

console.log('🔄 Loading gap router...');

const router = Router();
console.log('✅ Gap router created');

router.get('/test', (req, res) => {
  res.json({ message: 'Gap router is alive!' });
});

router.post('/', getSkillGap);
console.log('✅ POST / route registered');

export default router;
console.log('✅ Gap router exported');