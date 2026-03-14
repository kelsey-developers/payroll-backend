import { Router } from 'express';
import {
  listPeriods,
  getPeriod,
  generatePeriod,
  updatePeriodStatus,
  deletePeriod,
} from '../controllers/payrollPeriodController';

const router = Router();

router.get('/',           listPeriods);
router.post('/generate',  generatePeriod);
router.get('/:id',        getPeriod);
router.patch('/:id',      updatePeriodStatus);
router.delete('/:id',     deletePeriod);

export default router;
