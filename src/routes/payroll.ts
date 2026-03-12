import { Router } from 'express';
import {
  getPayroll,
  getPayrollById,
  markCommissionPaid,
  generatePayroll,
  previewPayroll,
  updatePayrollStatus,
} from '../controllers/payrollController';

const router = Router();

// Specific routes first — must come before /:id to avoid param capture
router.post('/generate', generatePayroll);
router.post('/preview', previewPayroll);
router.patch('/commission/mark-paid', markCommissionPaid);

// Parameterized routes last
router.get('/', getPayroll);
router.get('/:id', getPayrollById);
router.patch('/:id/status', updatePayrollStatus);

export default router;
