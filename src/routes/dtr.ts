import { Router } from 'express';
import multer from 'multer';
import {
  getDTR,
  timeIn,
  timeOut,
  getTasks,
  uploadTask,
  getDTRRange,
  getAllDTR,
  verifyDTR,
  getDTRSummary,
} from '../controllers/dtrController';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Specific routes first (avoid param capture by /:id)
router.get('/range', getDTRRange);
router.get('/all', getAllDTR);
router.get('/summary', getDTRSummary);
router.get('/tasks', getTasks);
router.post('/time-in', timeIn);
router.post('/time-out', timeOut);
router.post('/tasks', upload.single('file'), uploadTask);
router.patch('/:id/verify', verifyDTR);

// Single-day lookup last
router.get('/', getDTR);

export default router;
