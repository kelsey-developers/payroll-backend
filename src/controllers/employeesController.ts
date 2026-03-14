import { Request, Response } from 'express';
import { pool } from '../lib/db';

// GET /api/employees
export async function listEmployees(_req: Request, res: Response) {
  try {
    const [rows] = await pool.query(
      `SELECT employee_id, employee_code, full_name, hire_date, position,
              employment_type, current_rate, role, status, created_at
       FROM employees
       WHERE status = 'active'
       ORDER BY full_name ASC`
    );
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

// GET /api/employees/:id
export async function getEmployee(req: Request, res: Response) {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM employees WHERE employee_id = ?`,
      [req.params.id]
    );
    const data = (rows as any[])[0];
    if (!data) { res.status(404).json({ error: 'Employee not found' }); return; }
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

// POST /api/employees
export async function createEmployee(req: Request, res: Response) {
  const { full_name, hire_date, position, employment_type, current_rate, role } = req.body;
  if (!full_name || !hire_date || !position || !employment_type || current_rate === undefined) {
    res.status(400).json({ error: 'full_name, hire_date, position, employment_type, and current_rate are required' });
    return;
  }
  try {
    const employee_code = `EMP-${Date.now()}`;
    const [result] = await pool.query(
      `INSERT INTO employees (employee_code, full_name, hire_date, position, employment_type, current_rate, role, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
      [employee_code, full_name, hire_date, position, employment_type, Number(current_rate), role ?? 'employee']
    );
    const insertId = (result as any).insertId;
    const [rows] = await pool.query(`SELECT * FROM employees WHERE employee_id = ?`, [insertId]);
    res.status(201).json((rows as any[])[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

// PUT /api/employees/:id
export async function updateEmployee(req: Request, res: Response) {
  const { full_name, hire_date, position, employment_type, current_rate, role, status } = req.body;
  try {
    await pool.query(
      `UPDATE employees SET
        full_name       = COALESCE(?, full_name),
        hire_date       = COALESCE(?, hire_date),
        position        = COALESCE(?, position),
        employment_type = COALESCE(?, employment_type),
        current_rate    = COALESCE(?, current_rate),
        role            = COALESCE(?, role),
        status          = COALESCE(?, status)
       WHERE employee_id = ?`,
      [
        full_name   ?? null, hire_date ?? null, position ?? null, employment_type ?? null,
        current_rate !== undefined ? Number(current_rate) : null,
        role ?? null, status ?? null,
        req.params.id,
      ]
    );
    const [rows] = await pool.query(`SELECT * FROM employees WHERE employee_id = ?`, [req.params.id]);
    const data = (rows as any[])[0];
    if (!data) { res.status(404).json({ error: 'Employee not found' }); return; }
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

// DELETE /api/employees/:id
export async function deleteEmployee(req: Request, res: Response) {
  try {
    await pool.query(`DELETE FROM employees WHERE employee_id = ?`, [req.params.id]);
    res.json({ message: 'Employee deleted' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
