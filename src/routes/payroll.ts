// PATH: back-end/src/routes/payroll.ts

import express from 'express';
import multer from 'multer';
import {
  getPayrollByType,
  getPayrollById,
  getPayrollRecords,
  generatePayroll,
  markCommissionPaid,
  uploadGcashReceipt,
} from '../controllers/payrollController';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/by-type/:type', getPayrollByType);
router.get('/employee/:employeeId', getPayrollRecords);
router.get('/:id', getPayrollById);
router.post('/generate', generatePayroll);
router.patch('/commission/mark-paid', markCommissionPaid);
router.post('/commissions/:commissionId/receipt', upload.single('receipt'), uploadGcashReceipt);

export default router;