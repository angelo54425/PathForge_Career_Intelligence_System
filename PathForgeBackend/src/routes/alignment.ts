import { Router } from 'express';
import { getCareerAlignment } from '../controllers/alignmentController';

const router = Router();

router.get('/:career', getCareerAlignment);

export default router;