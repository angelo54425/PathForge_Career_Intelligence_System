import { Router } from 'express';
import { getAllCareers, getCareersBySector } from '../controllers/careerController';

const router = Router();

router.get('/', getAllCareers);
router.get('/sector/:sector', getCareersBySector);

export default router;