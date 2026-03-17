import { Request, Response } from 'express';
import { pool } from '../lib/db';

// POST /api/employee-registrations — public, user submits their own request
export async function submitRegistration(req: Request, res: Response) {
  const { full_name, email, message } = req.body;
  if (!full_name || !email) {
    res.status(400).json({ error: 'full_name and email are required' });
    return;
  }
  try {
    // Don't allow duplicate pending requests for same email
    const [existing] = await pool.query(
      `SELECT id FROM employee_registrations WHERE email = ? AND status = 'pending'`,
      [email.toLowerCase()]
    );
    if ((existing as any[]).length > 0) {
      res.status(409).json({ error: 'A pending registration request already exists for this email.' });
      return;
    }
    const [result] = await pool.query(
      `INSERT INTO employee_registrations (full_name, email, message, status) VALUES (?, ?, ?, 'pending')`,
      [full_name, email.toLowerCase(), message ?? null]
    );
    res.status(201).json({ id: (result as any).insertId, status: 'pending' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

// GET /api/employee-registrations — admin only
export async function listRegistrations(req: Request, res: Response) {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM employee_registrations ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

// PATCH /api/employee-registrations/:id — admin approves or rejects
// Body for approval: { status: 'approved', hire_date, position, employment_type, current_rate, role? }
// Body for rejection: { status: 'rejected' }
export async function reviewRegistration(req: Request, res: Response) {
  const { status, hire_date, position, employment_type, current_rate, role } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    res.status(400).json({ error: 'status must be "approved" or "rejected"' });
    return;
  }
  try {
    const [rows] = await pool.query(
      `SELECT * FROM employee_registrations WHERE id = ?`,
      [req.params.id]
    );
    const reg = (rows as any[])[0];
    if (!reg) { res.status(404).json({ error: 'Registration not found' }); return; }

    await pool.query(
      `UPDATE employee_registrations SET status = ? WHERE id = ?`,
      [status, req.params.id]
    );

    if (status === 'approved') {
      if (!hire_date || !position || !employment_type || current_rate === undefined) {
        res.status(400).json({ error: 'hire_date, position, employment_type, and current_rate are required for approval' });
        return;
      }
      const [maxRows] = await pool.query(
        `SELECT MAX(CAST(SUBSTRING_INDEX(employee_code, '_', -1) AS UNSIGNED)) AS max_num FROM employees`
      );
      const maxNum = ((maxRows as any[])[0].max_num as number | null) ?? 0;
      const employee_code = `EMP_${maxNum + 1}`;
      const [result] = await pool.query(
        `INSERT INTO employees (employee_code, full_name, email, hire_date, position, employment_type, current_rate, role, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        [employee_code, reg.full_name, reg.email, hire_date, position, employment_type, Number(current_rate), role ?? 'employee']
      );
      const insertId = (result as any).insertId;
      const [empRows] = await pool.query(`SELECT * FROM employees WHERE employee_id = ?`, [insertId]);
      res.json({ registration: { ...reg, status: 'approved' }, employee: (empRows as any[])[0] });
    } else {
      res.json({ registration: { ...reg, status: 'rejected' } });
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
