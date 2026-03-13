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

// POST clock in — saves shift_start and shift_end sent by the frontend
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
      shift_start: shift_start ?? null,
      shift_end:   shift_end   ?? null,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
};

// PATCH clock out — auto-calculates hours_worked from time_in
export const clockOut = async (req: Request, res: Response) => {
  const { dtrId } = req.params;

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

    const { data, error } = await supabase
      .from('task_logs')
      .insert({
        employee_id:     Number(employeeId),
        dtr_id:          Number(dtrId),
        unit_name:       location  ?? '',
        task_type:       task_type ?? 'Other',
        completed_at:    new Date().toISOString(),
        proof_photo_url: url,
        status:          'COMPLETED',
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// GET /api/dtr/range?employee_id=1&start=2024-01-01&end=2024-01-15
export async function getDTRRange(req: Request, res: Response) {
  const { employee_id, start, end } = req.query;

  if (!employee_id || !start || !end) {
    res.status(400).json({ error: 'employee_id, start, and end are required' });
    return;
  }

  const { data, error } = await supabase
    .from('dtr_records')
    .select('*')
    .eq('employee_id', employee_id)
    .gte('work_date', start)
    .lte('work_date', end)
    .order('work_date', { ascending: true });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data ?? []);
}

// GET /api/dtr/all?start=2024-01-01&end=2024-01-15
// Admin view — all employees' attendance for a date range
export async function getAllDTR(req: Request, res: Response) {
  const { start, end } = req.query;

  if (!start || !end) {
    res.status(400).json({ error: 'start and end are required' });
    return;
  }

  const { data: records, error } = await supabase
    .from('dtr_records')
    .select('*')
    .gte('work_date', start)
    .lte('work_date', end)
    .order('work_date', { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const rows = records ?? [];
  const employeeIds = [...new Set(rows.map((r) => r.employee_id).filter(Boolean))];
  let employeeMap: Record<number, Record<string, unknown>> = {};

  if (employeeIds.length > 0) {
    const { data: employees } = await supabase
      .from('employees')
      .select('employee_id, full_name, position, employment_type')
      .in('employee_id', employeeIds);

    if (employees) {
      employeeMap = Object.fromEntries(employees.map((e) => [e.employee_id, e]));
    }
  }

  res.json(rows.map((r) => ({ ...r, employee: employeeMap[r.employee_id] ?? null })));
}

// PATCH /api/dtr/:id/verify
// Manager verifies or disputes a DTR record
export async function verifyDTR(req: Request, res: Response) {
  const { id } = req.params;
  const { verified, notes } = req.body;

  if (verified === undefined) {
    res.status(400).json({ error: 'verified (true/false) is required' });
    return;
  }

  const { data, error } = await supabase
    .from('dtr_records')
    .update({
      is_verified:        verified,
      verification_notes: notes ?? null,
      verified_at:        new Date().toISOString(),
    })
    .eq('dtr_id', id)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data);
}

// GET /api/dtr/summary?start=2024-01-01&end=2024-01-15
// Returns days worked per employee — used to auto-fill payroll generation
export async function getDTRSummary(req: Request, res: Response) {
  const { start, end } = req.query;

  if (!start || !end) {
    res.status(400).json({ error: 'start and end are required' });
    return;
  }

  const { data: records, error } = await supabase
    .from('dtr_records')
    .select('employee_id, work_date, status, hours_worked')
    .gte('work_date', start)
    .lte('work_date', end)
    .eq('status', 'CLOSED');

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const rows = records ?? [];
  const employeeIds = [...new Set(rows.map((r) => r.employee_id).filter(Boolean))];
  let employeeMap: Record<number, Record<string, unknown>> = {};

  if (employeeIds.length > 0) {
    const { data: employees } = await supabase
      .from('employees')
      .select('employee_id, full_name, position, employment_type, current_rate')
      .in('employee_id', employeeIds);

    if (employees) {
      employeeMap = Object.fromEntries(employees.map((e) => [e.employee_id, e]));
    }
  }

  const summaryMap: Record<number, { days_worked: number; total_hours: number }> = {};
  for (const r of rows) {
    if (!summaryMap[r.employee_id]) {
      summaryMap[r.employee_id] = { days_worked: 0, total_hours: 0 };
    }
    summaryMap[r.employee_id].days_worked += 1;
    summaryMap[r.employee_id].total_hours += r.hours_worked ?? 0;
  }

  const summary = Object.entries(summaryMap).map(([empId, stats]) => ({
    employee_id:  Number(empId),
    employee:     employeeMap[Number(empId)] ?? null,
    days_worked:  stats.days_worked,
    total_hours:  parseFloat(stats.total_hours.toFixed(2)),
  }));

  res.json(summary);
}