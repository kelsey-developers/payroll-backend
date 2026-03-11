import { Router } from 'express';
import multer from 'multer';
import { getDTR, timeIn, timeOut, getTasks, uploadTask } from '../controllers/dtrController';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', getDTR);
router.post('/time-in', timeIn);
router.post('/time-out', timeOut);
router.get('/tasks', getTasks);
router.post('/tasks', upload.single('file'), uploadTask);

export default router;
