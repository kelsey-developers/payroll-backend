import { Router } from 'express';
import {
  listPeriods,
  getPeriod,
  generatePeriod,
  updatePeriodStatus,
  deletePeriod,
} from '../controllers/payrollPeriodController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/',           requireAuth, listPeriods);
router.post('/generate',  requireAuth, generatePeriod);
router.get('/:id',        requireAuth, getPeriod);
router.patch('/:id',      requireAuth, updatePeriodStatus);
router.delete('/:id',     requireAuth, deletePeriod);

export default router;
