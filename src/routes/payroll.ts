// PATH: back-end/src/routes/payroll.ts

import express from 'express';
import multer from 'multer';
import {
  getPayrollByType,
  getPayrollById,
  getPayrollRecords,
  generatePayroll,
  updatePayroll,
  updatePayrollStatus,
  deletePayroll,
  markCommissionPaid,
  uploadGcashReceipt,
} from '../controllers/payrollController';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Static/specific routes first
router.get('/by-type/:type',          getPayrollByType);
router.get('/employee/:employeeId',   getPayrollRecords);
router.post('/generate',              generatePayroll);

// Commission routes (must be before /:id to avoid param capture)
router.patch('/commission/mark-paid', markCommissionPaid);
router.post('/commission/:commissionId/receipt', upload.single('receipt'), uploadGcashReceipt);

// Parameterized routes last
router.get('/:id',          getPayrollById);
router.patch('/:id/status', updatePayrollStatus);
router.patch('/:id',        updatePayroll);
router.delete('/:id',       deletePayroll);

export default router;