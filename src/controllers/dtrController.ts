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

// POST clock in — now saves shift_start and shift_end sent by the frontend
export const clockIn = async (req: Request, res: Response) => {
  const { employeeId, siteId, latitude, longitude, work_date, shift_start, shift_end } = req.body;

  const { data, error } = await supabase
    .from('dtr_records')
    .insert({
      employee_id: employeeId,
      work_date:   work_date ?? new Date().toISOString().split('T')[0],
      time_in:     new Date().toISOString(),
      status:      'OPEN',
      site_id:     siteId      ?? null,
      latitude:    latitude    ?? null,
      longitude:   longitude   ?? null,
      shift_start: shift_start ?? null,   // ← FIX: persist shift selection
      shift_end:   shift_end   ?? null,   // ← FIX: persist shift selection
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
};

// PATCH clock out — auto-calculates hours_worked from time_in
export const clockOut = async (req: Request, res: Response) => {
  const { dtrId } = req.params;

  // Fetch the open record to compute hours_worked
  const { data: existing, error: fetchError } = await supabase
    .from('dtr_records')
    .select('time_in')
    .eq('dtr_id', dtrId)
    .single();

  if (fetchError) return res.status(500).json({ error: fetchError.message });

  const timeOut = new Date();
  const timeIn  = existing?.time_in ? new Date(existing.time_in) : timeOut;
  const hoursWorked = parseFloat(
    ((timeOut.getTime() - timeIn.getTime()) / 1000 / 3600).toFixed(2)
  );

  const { data, error } = await supabase
    .from('dtr_records')
    .update({
      time_out:     timeOut.toISOString(),
      hours_worked: hoursWorked,
      status:       'CLOSED',
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
  const { task_type, location } = req.body;
  const file = req.file;

  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const path = `${employeeId}/${dtrId}/${Date.now()}.jpg`;
    const url  = await uploadFile('task-proof-photos', path, file.buffer, file.mimetype);

    // Insert a new task_log row with the uploaded photo URL
    const { data, error } = await supabase
      .from('task_logs')
      .insert({
        employee_id:    Number(employeeId),
        dtr_id:         Number(dtrId),
        unit_name:      location  ?? '',
        task_type:      task_type ?? 'Other',
        completed_at:   new Date().toISOString(),
        proof_photo_url: url,
        status:         'COMPLETED',
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};