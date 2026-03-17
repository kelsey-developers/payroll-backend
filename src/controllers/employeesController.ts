import { Request, Response } from 'express';
import { pool } from '../lib/db';

// GET /api/employees - fetches from local employees table
export async function listEmployees(req: Request, res: Response) {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM employees ORDER BY full_name ASC`
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
  const { full_name, email, hire_date, position, employment_type, current_rate, role } = req.body;
  if (!full_name || !hire_date || !position || !employment_type || current_rate === undefined) {
    res.status(400).json({ error: 'full_name, hire_date, position, employment_type, and current_rate are required' });
    return;
  }
  try {
    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM employees`);
    const nextNum = ((countRows as any[])[0].total as number) + 1;
    const employee_code = `EMP_${nextNum}`;
    const [result] = await pool.query(
      `INSERT INTO employees (employee_code, full_name, email, hire_date, position, employment_type, current_rate, role, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [employee_code, full_name, email ?? null, hire_date, position, employment_type, Number(current_rate), role ?? 'employee']
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
  const { full_name, email, hire_date, position, employment_type, current_rate, role, status } = req.body;
  try {
    await pool.query(
      `UPDATE employees SET
        full_name       = COALESCE(?, full_name),
        email           = COALESCE(?, email),
        hire_date       = COALESCE(?, hire_date),
        position        = COALESCE(?, position),
        employment_type = COALESCE(?, employment_type),
        current_rate    = COALESCE(?, current_rate),
        role            = COALESCE(?, role),
        status          = COALESCE(?, status)
       WHERE employee_id = ?`,
      [
        full_name   ?? null, email ?? null, hire_date ?? null, position ?? null, employment_type ?? null,
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

// GET /api/employees/roles — no auth required, used by frontend to resolve employee role from email
// Returns { "email@example.com": "employee", ... } for all active employees with an email on file
export async function getEmployeeRoles(req: Request, res: Response) {
  try {
    const [rows] = await pool.query(
      `SELECT email FROM employees WHERE status = 'active' AND email IS NOT NULL`
    );
    const map: Record<string, string> = {};
    for (const row of rows as { email: string }[]) {
      map[row.email.toLowerCase()] = 'employee';
    }
    res.json(map);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

// PATCH /api/employees/roles — no auth required
// Body: { email, name?, role }
// Used by manage-users to assign the "Employee" role without hitting the auth service.
// If an employee record with this email exists, we confirm it. Otherwise we acknowledge silently.
export async function patchEmployeeRole(req: Request, res: Response) {
  const { email, role } = req.body as { email?: string; role?: string };
  if (!email) {
    res.status(400).json({ error: 'email is required' });
    return;
  }
  try {
    const [rows] = await pool.query(
      `SELECT employee_id FROM employees WHERE LOWER(email) = LOWER(?) LIMIT 1`,
      [email]
    );
    const found = (rows as any[]).length > 0;
    res.json({
      message: found ? 'Employee role confirmed' : 'Role noted (no payroll record found for this email)',
      email,
      role: role ?? 'Employee',
      roles: [role ?? 'Employee'],
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
