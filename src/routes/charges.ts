import { Router } from 'express';
import { listCharges, createCharge, updateCharge, deleteCharge } from '../controllers/chargesController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/',       requireAuth, listCharges);
router.post('/',      requireAuth, createCharge);
router.put('/:id',    requireAuth, updateCharge);
router.delete('/:id', requireAuth, deleteCharge);

export default router;
