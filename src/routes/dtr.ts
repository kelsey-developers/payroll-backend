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
} from '../controllers/dtrController';

const router  = express.Router();
const upload  = multer({ storage: multer.memoryStorage() });

// GET all DTR records for an employee
router.get('/employee/:employeeId', getDTRByEmployee);

// GET today's DTR record for an employee
router.get('/employee/:employeeId/today', getTodayDTR);

// GET task logs for an employee
router.get('/employee/:employeeId/tasks', getEmployeeTasks);

// POST clock in
router.post('/clock-in', clockIn);

// PATCH clock out
router.patch('/:dtrId/clock-out', clockOut);

// POST upload task proof photo
router.post('/:dtrId/employee/:employeeId/proof', upload.single('photo'), uploadTaskProof);

export default router;