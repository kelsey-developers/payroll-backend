import { Router } from 'express';
import {
  listEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from '../controllers/employeesController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/',    requireAuth, listEmployees);
router.get('/:id', getEmployee);
router.post('/',   createEmployee);
router.put('/:id', updateEmployee);
router.delete('/:id', deleteEmployee);

export default router;
