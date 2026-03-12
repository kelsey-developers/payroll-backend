// PATH: back-end/src/routes/employees.ts

import express from 'express';
import { getAllEmployees, getEmployeeById } from '../controllers/employeesController';

const router = express.Router();

router.get('/', getAllEmployees);
router.get('/:employeeId', getEmployeeById);

export default router;