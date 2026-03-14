import { Request, Response } from 'express';
import { pool } from '../lib/db';

// GET /api/charges?employee_id=&start=&end=
export async function listCharges(req: Request, res: Response) {
  const { employee_id, start, end } = req.query;
  try {
    let sql = `
      SELECT c.*, e.full_name, e.position
      FROM charges c
      JOIN employees e ON e.employee_id = c.employee_id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (employee_id) { sql += ' AND c.employee_id = ?'; params.push(employee_id); }
    if (start)       { sql += ' AND c.charge_date >= ?'; params.push(start); }
    if (end)         { sql += ' AND c.charge_date <= ?'; params.push(end); }
    sql += ' ORDER BY c.charge_date DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

// POST /api/charges
export async function createCharge(req: Request, res: Response) {
  const { employee_id, charge_date, description, amount } = req.body;
  if (!employee_id || !charge_date || !description || amount === undefined) {
    res.status(400).json({ error: 'employee_id, charge_date, description, and amount are required' });
    return;
  }
  try {
    const [result] = await pool.query(
      `INSERT INTO charges (employee_id, charge_date, description, amount) VALUES (?, ?, ?, ?)`,
      [employee_id, charge_date, description, Number(amount)]
    );
    const id = (result as any).insertId;
    const [rows] = await pool.query(
      `SELECT c.*, e.full_name, e.position
       FROM charges c
       JOIN employees e ON e.employee_id = c.employee_id
       WHERE c.charge_id = ?`,
      [id]
    );
    res.status(201).json((rows as any[])[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

// PUT /api/charges/:id
export async function updateCharge(req: Request, res: Response) {
  const { charge_date, description, amount } = req.body;
  try {
    await pool.query(
      `UPDATE charges SET
        charge_date = COALESCE(?, charge_date),
        description = COALESCE(?, description),
        amount      = COALESCE(?, amount)
       WHERE charge_id = ?`,
      [charge_date ?? null, description ?? null, amount !== undefined ? Number(amount) : null, req.params.id]
    );
    const [rows] = await pool.query(
      `SELECT c.*, e.full_name, e.position
       FROM charges c
       JOIN employees e ON e.employee_id = c.employee_id
       WHERE c.charge_id = ?`,
      [req.params.id]
    );
    const data = (rows as any[])[0];
    if (!data) { res.status(404).json({ error: 'Charge not found' }); return; }
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}

// DELETE /api/charges/:id
export async function deleteCharge(req: Request, res: Response) {
  try {
    await pool.query(`DELETE FROM charges WHERE charge_id = ?`, [req.params.id]);
    res.json({ message: 'Charge deleted' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
