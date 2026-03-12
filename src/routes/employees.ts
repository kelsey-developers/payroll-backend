import { Router } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

// GET /api/employees
router.get('/', async (_req, res) => {
  const { data, error } = await supabase
    .from('employees')
    .select('employee_id, full_name, position, employee_code, role, employment_type, status')
    .eq('status', 'active')
    .order('full_name', { ascending: true });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data ?? []);
});

// POST /api/employees
// Body: { full_name, position, employment_type, current_rate, role?, unit_id? }
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

  const timestamp = Date.now();
  const employee_code = `EMP-${timestamp}`;

  const newEmployee: Record<string, unknown> = {
    full_name,
    position,
    employment_type,
    current_rate: Number(current_rate),
    role: role ?? 'employee',
    status: 'active',
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

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(201).json(data);
});

// PATCH /api/employees/:id
// Body: { position?, current_rate?, role?, unit_id?, status? }
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { position, current_rate, role, unit_id, status } = req.body;

  const updates: Record<string, unknown> = {};
  if (position !== undefined)     updates.position = position;
  if (current_rate !== undefined) updates.current_rate = Number(current_rate);
  if (role !== undefined)         updates.role = role;
  if (unit_id !== undefined)      updates.unit_id = unit_id === '' ? null : Number(unit_id);
  if (status !== undefined)       updates.status = status;

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

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data);
});

export default router;
