"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listDTR = listDTR;
exports.createDTR = createDTR;
exports.updateDTR = updateDTR;
exports.deleteDTR = deleteDTR;
const db_1 = require("../lib/db");
// GET /api/dtr?start=&end=&employee_id=
async function listDTR(req, res) {
    const { start, end, employee_id } = req.query;
    try {
        let sql = `
      SELECT d.*, e.full_name, e.position
      FROM dtr_records d
      JOIN employees e ON e.employee_id = d.employee_id
      WHERE 1=1
    `;
        const params = [];
        if (start) {
            sql += ' AND d.work_date >= ?';
            params.push(start);
        }
        if (end) {
            sql += ' AND d.work_date <= ?';
            params.push(end);
        }
        if (employee_id) {
            sql += ' AND d.employee_id = ?';
            params.push(employee_id);
        }
        sql += ' ORDER BY d.work_date DESC, e.full_name ASC';
        const [rows] = await db_1.pool.query(sql, params);
        res.json(rows);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
function calcHours(timeIn, timeOut) {
    const diff = (new Date(timeOut).getTime() - new Date(timeIn).getTime()) / 1000 / 3600;
    const hours_worked = parseFloat(Math.max(0, diff).toFixed(2));
    const overtime_hours = parseFloat(Math.max(0, hours_worked - 8).toFixed(2));
    return { hours_worked, overtime_hours };
}
// POST /api/dtr
async function createDTR(req, res) {
    const { employee_id, work_date, time_in, time_out, notes } = req.body;
    if (!employee_id || !work_date) {
        res.status(400).json({ error: 'employee_id and work_date are required' });
        return;
    }
    try {
        let hours_worked = 0, overtime_hours = 0;
        let status = time_in ? 'OPEN' : 'OPEN';
        if (time_in && time_out) {
            ({ hours_worked, overtime_hours } = calcHours(time_in, time_out));
            status = 'CLOSED';
        }
        const [result] = await db_1.pool.query(`INSERT INTO dtr_records
         (employee_id, work_date, time_in, time_out, hours_worked, overtime_hours, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [employee_id, work_date, time_in ?? null, time_out ?? null,
            hours_worked, overtime_hours, status, notes ?? null]);
        const id = result.insertId;
        const [rows] = await db_1.pool.query(`SELECT d.*, e.full_name, e.position
       FROM dtr_records d
       JOIN employees e ON e.employee_id = d.employee_id
       WHERE d.dtr_id = ?`, [id]);
        res.status(201).json(rows[0]);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
// PUT /api/dtr/:id
async function updateDTR(req, res) {
    const { work_date, time_in, time_out, notes, status } = req.body;
    try {
        let hours_worked = null;
        let overtime_hours = null;
        let computedStatus = status ?? null;
        if (time_in && time_out) {
            const calc = calcHours(time_in, time_out);
            hours_worked = calc.hours_worked;
            overtime_hours = calc.overtime_hours;
            if (!status)
                computedStatus = 'CLOSED';
        }
        await db_1.pool.query(`UPDATE dtr_records SET
        work_date      = COALESCE(?, work_date),
        time_in        = COALESCE(?, time_in),
        time_out       = COALESCE(?, time_out),
        hours_worked   = COALESCE(?, hours_worked),
        overtime_hours = COALESCE(?, overtime_hours),
        status         = COALESCE(?, status),
        notes          = COALESCE(?, notes)
       WHERE dtr_id = ?`, [work_date ?? null, time_in ?? null, time_out ?? null,
            hours_worked, overtime_hours, computedStatus, notes ?? null,
            req.params.id]);
        const [rows] = await db_1.pool.query(`SELECT d.*, e.full_name, e.position
       FROM dtr_records d
       JOIN employees e ON e.employee_id = d.employee_id
       WHERE d.dtr_id = ?`, [req.params.id]);
        const data = rows[0];
        if (!data) {
            res.status(404).json({ error: 'DTR record not found' });
            return;
        }
        res.json(data);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
// DELETE /api/dtr/:id
async function deleteDTR(req, res) {
    try {
        await db_1.pool.query(`DELETE FROM dtr_records WHERE dtr_id = ?`, [req.params.id]);
        res.json({ message: 'DTR record deleted' });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
