import { Router } from 'express';
import {
  listDTR, createDTR, updateDTR, deleteDTR,
  getMyProfile, getMyDTR, clockIn, clockOut, scanClock,
  publicGetEmployees, publicGetToday, publicClockIn, publicClockOut,
} from '../controllers/adminDtrController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Public — no auth, used by /dtr/scan/[token] QR page
router.get('/public/employees',              publicGetEmployees);
router.get('/public/today/:employee_id',     publicGetToday);
router.post('/public/clock-in',              publicClockIn);
router.post('/public/clock-out',             publicClockOut);

// Employee self-service — must be before /:id
router.get('/my-profile', requireAuth, getMyProfile);
router.get('/my',         requireAuth, getMyDTR);
router.post('/clock-in',  requireAuth, clockIn);
router.post('/clock-out', requireAuth, clockOut);

// Admin QR scanner clock — requires admin/HR auth
router.post('/scan-clock', requireAuth, scanClock);

router.get('/',       requireAuth, listDTR);
router.post('/',      requireAuth, createDTR);
router.put('/:id',    requireAuth, updateDTR);
router.delete('/:id', requireAuth, deleteDTR);

export default router;
