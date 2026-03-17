import { Router } from 'express';
import {
  listEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeRoles,
  patchEmployeeRole,
} from '../controllers/employeesController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Public — returns { email: 'employee' } map so the frontend can resolve role without market backend
router.get('/roles', getEmployeeRoles);

// Public — used by manage-users to assign the Employee role without going through the auth service
router.patch('/roles', patchEmployeeRole);

router.get('/',    requireAuth, listEmployees);
router.get('/:id', requireAuth, getEmployee);
router.post('/',   requireAuth, createEmployee);
router.put('/:id',   requireAuth, updateEmployee);
router.patch('/:id', requireAuth, updateEmployee);
router.delete('/:id', requireAuth, deleteEmployee);

export default router;
