// PATH: back-end/src/controllers/dtrController.ts

import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { uploadFile } from '../lib/storage';

// GET all DTR records for an employee
export const getDTRByEmployee = async (req: Request, res: Response) => {
  const { employeeId } = req.params;

  const { data, error } = await supabase
    .from('dtr_records')
    .select('*')
    .eq('employee_id', employeeId)
    .order('work_date', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
};

// GET today's DTR record for an employee
export const getTodayDTR = async (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('dtr_records')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('work_date', today)
    .single();

  if (error && error.code !== 'PGRST116') {
    return res.status(500).json({ error: error.message });
  }
  return res.json(data ?? null);
};

// GET task logs for an employee
export const getEmployeeTasks = async (req: Request, res: Response) => {
  const { employeeId } = req.params;

  const { data, error } = await supabase
    .from('task_logs')
    .select('*')
    .eq('employee_id', employeeId)
    .order('completed_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
};

// POST clock in
export const clockIn = async (req: Request, res: Response) => {
  const { employeeId, siteId, latitude, longitude } = req.body;

  const { data, error } = await supabase
    .from('dtr_records')
    .insert({
      employee_id: employeeId,
      work_date: new Date().toISOString().split('T')[0],
      time_in: new Date().toISOString(),
      status: 'OPEN',
      site_id: siteId ?? null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
};

// PATCH clock out
export const clockOut = async (req: Request, res: Response) => {
  const { dtrId } = req.params;
  const { hoursWorked } = req.body;

  const { data, error } = await supabase
    .from('dtr_records')
    .update({
      time_out: new Date().toISOString(),
      hours_worked: hoursWorked,
      status: 'CLOSED',
    })
    .eq('dtr_id', dtrId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
};

// POST upload task proof photo
export const uploadTaskProof = async (req: Request, res: Response) => {
  const { dtrId, employeeId } = req.params;
  const file = req.file;

  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const path = `${employeeId}/${dtrId}/${Date.now()}.jpg`;
    const url = await uploadFile('task-proof-photos', path, file.buffer, file.mimetype);

    const { data, error } = await supabase
      .from('task_logs')
      .update({ proof_photo_url: url })
      .eq('dtr_id', dtrId)
      .eq('employee_id', employeeId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};