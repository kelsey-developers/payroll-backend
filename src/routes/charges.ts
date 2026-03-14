import { Router } from 'express';
import { listCharges, createCharge, updateCharge, deleteCharge } from '../controllers/chargesController';

const router = Router();

router.get('/',       listCharges);
router.post('/',      createCharge);
router.put('/:id',    updateCharge);
router.delete('/:id', deleteCharge);

export default router;
