// PATH: back-end/src/routes/payroll.ts

import express from 'express';
import multer from 'multer';
import {
  getPayrollByType,
  getPayrollById,
  getPayrollRecords,
  generatePayroll,
  updatePayroll,
  deletePayroll,
  markCommissionPaid,
  uploadGcashReceipt,
} from '../controllers/payrollController';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET all payroll records by employment type (DAILY | MONTHLY | COMMISSION)
router.get('/by-type/:type', getPayrollByType);

// GET payroll records for a specific employee
router.get('/employee/:employeeId', getPayrollRecords);

// GET single payroll record by ID
router.get('/:id', getPayrollById);

// POST generate a new payroll record
router.post('/generate', generatePayroll);

// PATCH update (edit) a payroll record
router.patch('/:id', updatePayroll);

// DELETE a payroll record
router.delete('/:id', deletePayroll);

// PATCH mark a commission booking as paid via GCash
router.patch('/commission/mark-paid', markCommissionPaid);

// POST upload GCash receipt image
router.post('/commission/:commissionId/receipt', upload.single('receipt'), uploadGcashReceipt);

export default router;