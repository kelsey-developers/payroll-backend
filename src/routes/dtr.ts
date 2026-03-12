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

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/employee/:employeeId', getDTRByEmployee);
router.get('/employee/:employeeId/today', getTodayDTR);
router.get('/employee/:employeeId/tasks', getEmployeeTasks);
router.post('/clock-in', clockIn);
router.patch('/:dtrId/clock-out', clockOut);
router.post('/:dtrId/employee/:employeeId/proof', upload.single('photo'), uploadTaskProof);

export default router;