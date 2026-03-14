import { Router } from 'express';
import { getSimilarCareers } from '../controllers/similarityController';

const router = Router();

router.get('/:career', getSimilarCareers);

export default router;