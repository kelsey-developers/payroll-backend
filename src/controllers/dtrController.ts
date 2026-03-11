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
  const { employee_id, work_date, shift_start, shift_end } = req.body;

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
