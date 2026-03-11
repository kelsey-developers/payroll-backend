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

export default router;
