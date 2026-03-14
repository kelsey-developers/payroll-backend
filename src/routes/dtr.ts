import { Router } from 'express';
import { listDTR, createDTR, updateDTR, deleteDTR } from '../controllers/adminDtrController';

const router = Router();

router.get('/',       listDTR);
router.post('/',      createDTR);
router.put('/:id',    updateDTR);
router.delete('/:id', deleteDTR);

export default router;
