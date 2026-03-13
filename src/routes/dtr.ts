// PATH: back-end/src/routes/dtr.ts

import express from 'express';
import multer from 'multer';
import {
  getDTRByEmployee,
  getTodayDTR,
  getEmployeeTasks,
  clockIn,
  clockOut,
  uploadTaskProof,
  getDTRRange,
  getAllDTR,
  verifyDTR,
  getDTRSummary,
} from '../controllers/dtrController';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Specific/static routes first (must come before param routes)
router.get('/range',   getDTRRange);
router.get('/all',     getAllDTR);
router.get('/summary', getDTRSummary);

// Employee-scoped routes
router.get('/employee/:employeeId',        getDTRByEmployee);
router.get('/employee/:employeeId/today',  getTodayDTR);
router.get('/employee/:employeeId/tasks',  getEmployeeTasks);

// Clock in / out
router.post('/clock-in',          clockIn);
router.patch('/:dtrId/clock-out', clockOut);

// Task proof upload
router.post('/:dtrId/employee/:employeeId/proof', upload.single('photo'), uploadTaskProof);

// Verify DTR (manager)
router.patch('/:id/verify', verifyDTR);

export default router;