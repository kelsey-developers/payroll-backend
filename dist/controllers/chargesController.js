"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCharges = listCharges;
exports.createCharge = createCharge;
exports.updateCharge = updateCharge;
exports.deleteCharge = deleteCharge;
const db_1 = require("../lib/db");
// GET /api/charges?employee_id=&start=&end=
async function listCharges(req, res) {
    const { employee_id, start, end } = req.query;
    try {
        let sql = `
      SELECT c.*, e.full_name, e.position
      FROM charges c
      JOIN employees e ON e.employee_id = c.employee_id
      WHERE 1=1
    `;
        const params = [];
        if (employee_id) {
            sql += ' AND c.employee_id = ?';
            params.push(employee_id);
        }
        if (start) {
            sql += ' AND c.charge_date >= ?';
            params.push(start);
        }
        if (end) {
            sql += ' AND c.charge_date <= ?';
            params.push(end);
        }
        sql += ' ORDER BY c.charge_date DESC';
        const [rows] = await db_1.pool.query(sql, params);
        res.json(rows);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
// POST /api/charges
async function createCharge(req, res) {
    const { employee_id, charge_date, description, amount } = req.body;
    if (!employee_id || !charge_date || !description || amount === undefined) {
        res.status(400).json({ error: 'employee_id, charge_date, description, and amount are required' });
        return;
    }
    try {
        const [result] = await db_1.pool.query(`INSERT INTO charges (employee_id, charge_date, description, amount) VALUES (?, ?, ?, ?)`, [employee_id, charge_date, description, Number(amount)]);
        const id = result.insertId;
        const [rows] = await db_1.pool.query(`SELECT c.*, e.full_name, e.position
       FROM charges c
       JOIN employees e ON e.employee_id = c.employee_id
       WHERE c.charge_id = ?`, [id]);
        res.status(201).json(rows[0]);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
// PUT /api/charges/:id
async function updateCharge(req, res) {
    const { charge_date, description, amount } = req.body;
    try {
        await db_1.pool.query(`UPDATE charges SET
        charge_date = COALESCE(?, charge_date),
        description = COALESCE(?, description),
        amount      = COALESCE(?, amount)
       WHERE charge_id = ?`, [charge_date ?? null, description ?? null, amount !== undefined ? Number(amount) : null, req.params.id]);
        const [rows] = await db_1.pool.query(`SELECT c.*, e.full_name, e.position
       FROM charges c
       JOIN employees e ON e.employee_id = c.employee_id
       WHERE c.charge_id = ?`, [req.params.id]);
        const data = rows[0];
        if (!data) {
            res.status(404).json({ error: 'Charge not found' });
            return;
        }
        res.json(data);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
// DELETE /api/charges/:id
async function deleteCharge(req, res) {
    try {
        await db_1.pool.query(`DELETE FROM charges WHERE charge_id = ?`, [req.params.id]);
        res.json({ message: 'Charge deleted' });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
