// PATH: back-end/src/routes/employees.ts

import express from 'express';
import { supabase } from '../lib/supabase';
import { getAllEmployees, getEmployeeById } from '../controllers/employeesController';

const router = express.Router();

router.get('/', getAllEmployees);
router.get('/:employeeId', getEmployeeById);

// POST /api/employees
router.post('/', async (req, res) => {
  const { full_name, position, employment_type, current_rate, role, unit_id } = req.body;

  if (!full_name || !position || !employment_type || current_rate === undefined) {
    res.status(400).json({ error: 'full_name, position, employment_type, and current_rate are required' });
    return;
  }

  const allowed_types = ['DAILY', 'MONTHLY', 'COMMISSION'];
  if (!allowed_types.includes(employment_type)) {
    res.status(400).json({ error: `employment_type must be one of: ${allowed_types.join(', ')}` });
    return;
  }

  const employee_code = `EMP-${Date.now()}`;
  const newEmployee: Record<string, unknown> = {
    full_name,
    position,
    employment_type,
    current_rate: Number(current_rate),
    role:         role ?? 'employee',
    status:       'active',
    employee_code,
  };

  if (unit_id !== undefined && unit_id !== null && unit_id !== '') {
    newEmployee.unit_id = Number(unit_id);
  }

  const { data, error } = await supabase
    .from('employees')
    .insert(newEmployee)
    .select()
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.status(201).json(data);
});

// PATCH /api/employees/:id
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { position, current_rate, role, unit_id, status } = req.body;

  const updates: Record<string, unknown> = {};
  if (position     !== undefined) updates.position     = position;
  if (current_rate !== undefined) updates.current_rate = Number(current_rate);
  if (role         !== undefined) updates.role         = role;
  if (unit_id      !== undefined) updates.unit_id      = unit_id === '' ? null : Number(unit_id);
  if (status       !== undefined) updates.status       = status;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  const { data, error } = await supabase
    .from('employees')
    .update(updates)
    .eq('employee_id', id)
    .select()
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

export default router;