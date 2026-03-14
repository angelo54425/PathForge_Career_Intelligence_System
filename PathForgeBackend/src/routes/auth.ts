import { Router } from 'express';
import { register, login, me, updatePreferences } from '../controllers/authController';
import { verifyToken } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', verifyToken, me);
router.patch('/preferences', verifyToken, updatePreferences);

export default router;
