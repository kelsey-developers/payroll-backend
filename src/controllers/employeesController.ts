// PATH: back-end/src/controllers/employeesController.ts

import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';

// GET all employees
export const getAllEmployees = async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('status', 'active')
    .order('full_name', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
};

// GET single employee
export const getEmployeeById = async (req: Request, res: Response) => {
  const { employeeId } = req.params;

  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('employee_id', employeeId)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
};