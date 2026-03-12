import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';

// GET /api/dtr?employee_id=1&date=2024-02-01
export async function getDTR(req: Request, res: Response) {
  const { employee_id, date } = req.query;

  if (!employee_id || !date) {
    res.status(400).json({ error: 'employee_id and date are required' });
    return;
  }

  const { data, error } = await supabase
    .from('dtr_records')
    .select('*')
    .eq('employee_id', employee_id)
    .eq('work_date', date)
    .single();

  if (error && error.code !== 'PGRST116') {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data ?? null);
}

// POST /api/dtr/time-in
export async function timeIn(req: Request, res: Response) {
  const { employee_id, work_date, shift_start, shift_end, latitude, longitude } = req.body;

  if (!employee_id || !work_date) {
    res.status(400).json({ error: 'employee_id and work_date are required' });
    return;
  }

  // Prevent duplicate time-in for same day
  const { data: existing } = await supabase
    .from('dtr_records')
    .select('dtr_id')
    .eq('employee_id', employee_id)
    .eq('work_date', work_date)
    .single();

  if (existing) {
    res.status(409).json({ error: 'Already timed in for today' });
    return;
  }

  const { data, error } = await supabase
    .from('dtr_records')
    .insert({
      employee_id,
      work_date,
      time_in: new Date().toISOString(),
      status: 'OPEN',
      shift_start: shift_start ?? null,
      shift_end: shift_end ?? null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
    })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(201).json(data);
}

// POST /api/dtr/time-out
export async function timeOut(req: Request, res: Response) {
  const { employee_id, dtr_id } = req.body;

  if (!employee_id || !dtr_id) {
    res.status(400).json({ error: 'employee_id and dtr_id are required' });
    return;
  }

  const timeOutNow = new Date();

  // Fetch time_in to compute hours_worked
  const { data: record, error: fetchError } = await supabase
    .from('dtr_records')
    .select('time_in')
    .eq('dtr_id', dtr_id)
    .eq('employee_id', employee_id)
    .single();

  if (fetchError || !record) {
    res.status(404).json({ error: 'DTR record not found' });
    return;
  }

  const hoursWorked =
    (timeOutNow.getTime() - new Date(record.time_in).getTime()) / 1000 / 3600;

  const { data, error } = await supabase
    .from('dtr_records')
    .update({
      time_out: timeOutNow.toISOString(),
      hours_worked: parseFloat(hoursWorked.toFixed(2)),
      status: 'CLOSED',
    })
    .eq('dtr_id', dtr_id)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data);
}

// GET /api/tasks?employee_id=1&date=2024-02-01
export async function getTasks(req: Request, res: Response) {
  const { employee_id, date } = req.query;

  if (!employee_id || !date) {
    res.status(400).json({ error: 'employee_id and date are required' });
    return;
  }

  const start = `${date}T00:00:00.000Z`;
  const end = `${date}T23:59:59.999Z`;

  const { data, error } = await supabase
    .from('task_logs')
    .select('*')
    .eq('employee_id', employee_id)
    .gte('completed_at', start)
    .lte('completed_at', end)
    .order('completed_at', { ascending: true });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data ?? []);
}

// POST /api/tasks  (multipart/form-data)
export async function uploadTask(req: Request, res: Response) {
  const { employee_id, dtr_id, task_type, location, completed_at } = req.body;
  const file = req.file;

  if (!employee_id || !dtr_id || !task_type || !location) {
    res.status(400).json({ error: 'employee_id, dtr_id, task_type, and location are required' });
    return;
  }

  let proof_photo_url = '';

  if (file) {
    const fileName = `task-photos/${employee_id}/${Date.now()}-${file.originalname}`;
    const { error: uploadError } = await supabase.storage
      .from('task-photos')
      .upload(fileName, file.buffer, { contentType: file.mimetype });

    if (uploadError) {
      res.status(500).json({ error: 'Failed to upload photo: ' + uploadError.message });
      return;
    }

    const { data: urlData } = supabase.storage
      .from('task-photos')
      .getPublicUrl(fileName);

    proof_photo_url = urlData.publicUrl;
  }

  const { data, error } = await supabase
    .from('task_logs')
    .insert({
      dtr_id: Number(dtr_id),
      employee_id: Number(employee_id),
      unit_name: location,
      task_type,
      proof_photo_url,
      completed_at: completed_at ?? new Date().toISOString(),
      status: 'COMPLETED',
    })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(201).json(data);
}

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
      is_verified: verified,
      verification_notes: notes ?? null,
      verified_at: new Date().toISOString(),
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
    employee_id: Number(empId),
    employee: employeeMap[Number(empId)] ?? null,
    days_worked: stats.days_worked,
    total_hours: parseFloat(stats.total_hours.toFixed(2)),
  }));

  res.json(summary);
}
