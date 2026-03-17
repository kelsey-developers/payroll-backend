import { Router } from 'express';
import { submitRegistration, listRegistrations, reviewRegistration } from '../controllers/registrationsController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Public — employees submit their own registration request
router.post('/', submitRegistration);

// Admin only
router.get('/',    requireAuth, listRegistrations);
router.patch('/:id', requireAuth, reviewRegistration);

export default router;
