"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listDTR = listDTR;
exports.createDTR = createDTR;
exports.updateDTR = updateDTR;
exports.deleteDTR = deleteDTR;
exports.getMyProfile = getMyProfile;
exports.getMyDTR = getMyDTR;
exports.clockIn = clockIn;
exports.clockOut = clockOut;
exports.publicGetEmployees = publicGetEmployees;
exports.publicGetToday = publicGetToday;
exports.publicClockIn = publicClockIn;
exports.publicClockOut = publicClockOut;
exports.scanClock = scanClock;
const db_1 = require("../lib/db");
// Resolve IP from proxy headers or direct connection
function getClientIp(req) {
    return (req.headers['x-forwarded-for']?.split(',')[0]?.trim() ??
        req.socket?.remoteAddress ??
        'unknown');
}
// GET /api/dtr?start=&end=&employee_id=
async function listDTR(req, res) {
    const { start, end, employee_id } = req.query;
    try {
        let sql = `
      SELECT d.*, e.full_name, e.position, e.employee_code
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
        let status = 'OPEN';
        if (time_in && time_out) {
            ({ hours_worked, overtime_hours } = calcHours(time_in, time_out));
            status = 'CLOSED';
        }
        const [result] = await db_1.pool.query(`INSERT INTO dtr_records
         (employee_id, work_date, time_in, time_out, hours_worked, overtime_hours, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [employee_id, work_date, time_in ?? null, time_out ?? null,
            hours_worked, overtime_hours, status, notes ?? null]);
        const id = result.insertId;
        const [rows] = await db_1.pool.query(`SELECT d.*, e.full_name, e.position, e.employee_code
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
        const [rows] = await db_1.pool.query(`SELECT d.*, e.full_name, e.position, e.employee_code
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
// ─── Employee self-service DTR ────────────────────────────────────────────────
async function findEmployeeIdByEmail(email) {
    const [rows] = await db_1.pool.query(`SELECT employee_id FROM employees WHERE LOWER(email) = LOWER(?) AND status = 'active' LIMIT 1`, [email]);
    return rows.length > 0 ? rows[0].employee_id : null;
}
// GET /api/dtr/my-profile — returns the employee record for the logged-in user (for QR display)
async function getMyProfile(req, res) {
    const email = req.user?.email;
    if (!email) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    try {
        const [rows] = await db_1.pool.query(`SELECT employee_id, employee_code, full_name, position, employment_type, current_rate
       FROM employees WHERE LOWER(email) = LOWER(?) AND status = 'active' LIMIT 1`, [email]);
        const emp = rows[0];
        if (!emp) {
            res.status(404).json({ error: 'No active employee record linked to your account.' });
            return;
        }
        res.json(emp);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
// GET /api/dtr/my?start=&end=  — returns own DTR records
async function getMyDTR(req, res) {
    const email = req.user?.email;
    if (!email) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    try {
        const employeeId = await findEmployeeIdByEmail(email);
        if (!employeeId) {
            res.status(404).json({ error: 'No active employee record linked to your account. Contact your admin.' });
            return;
        }
        const { start, end } = req.query;
        let sql = `
      SELECT d.*, e.full_name, e.position, e.employee_code
      FROM dtr_records d
      JOIN employees e ON e.employee_id = d.employee_id
      WHERE d.employee_id = ?
    `;
        const params = [employeeId];
        if (start) {
            sql += ' AND d.work_date >= ?';
            params.push(start);
        }
        if (end) {
            sql += ' AND d.work_date <= ?';
            params.push(end);
        }
        sql += ' ORDER BY d.work_date DESC LIMIT 60';
        const [rows] = await db_1.pool.query(sql, params);
        res.json(rows);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
// POST /api/dtr/clock-in  — employee clocks in for today (accepts optional selfie photo)
async function clockIn(req, res) {
    const email = req.user?.email;
    if (!email) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const { photo } = req.body; // base64 data URL from selfie capture (optional)
    const ip = getClientIp(req);
    try {
        const employeeId = await findEmployeeIdByEmail(email);
        if (!employeeId) {
            res.status(404).json({ error: 'No active employee record linked to your account. Contact your admin.' });
            return;
        }
        const [existing] = await db_1.pool.query(`SELECT dtr_id, time_in FROM dtr_records WHERE employee_id = ? AND work_date = CURDATE()`, [employeeId]);
        if (existing.length > 0 && existing[0].time_in) {
            res.status(409).json({ error: 'You have already clocked in today.' });
            return;
        }
        await db_1.pool.query(`INSERT INTO dtr_records (employee_id, work_date, time_in, hours_worked, overtime_hours, status, photo_in, ip_in)
       VALUES (?, CURDATE(), NOW(), 0, 0, 'OPEN', ?, ?)
       ON DUPLICATE KEY UPDATE time_in = NOW(), status = 'OPEN', photo_in = ?, ip_in = ?`, [employeeId, photo ?? null, ip, photo ?? null, ip]);
        const [rows] = await db_1.pool.query(`SELECT d.*, e.full_name, e.position, e.employee_code
       FROM dtr_records d JOIN employees e ON e.employee_id = d.employee_id
       WHERE d.employee_id = ? AND d.work_date = CURDATE()`, [employeeId]);
        res.status(201).json(rows[0]);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
// POST /api/dtr/clock-out  — employee clocks out for today (accepts optional selfie photo)
async function clockOut(req, res) {
    const email = req.user?.email;
    if (!email) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const { photo } = req.body; // base64 data URL from selfie capture (optional)
    const ip = getClientIp(req);
    try {
        const employeeId = await findEmployeeIdByEmail(email);
        if (!employeeId) {
            res.status(404).json({ error: 'No active employee record linked to your account. Contact your admin.' });
            return;
        }
        const [existing] = await db_1.pool.query(`SELECT dtr_id, time_in, time_out FROM dtr_records WHERE employee_id = ? AND work_date = CURDATE()`, [employeeId]);
        const record = existing[0];
        if (!record || !record.time_in) {
            res.status(409).json({ error: 'You have not clocked in yet today.' });
            return;
        }
        if (record.time_out) {
            res.status(409).json({ error: 'You have already clocked out today.' });
            return;
        }
        await db_1.pool.query(`UPDATE dtr_records
       SET time_out       = NOW(),
           hours_worked   = ROUND(TIMESTAMPDIFF(SECOND, time_in, NOW()) / 3600, 2),
           overtime_hours = ROUND(GREATEST(0, TIMESTAMPDIFF(SECOND, time_in, NOW()) / 3600 - 8), 2),
           status         = 'CLOSED',
           photo_out      = ?,
           ip_out         = ?
       WHERE employee_id = ? AND work_date = CURDATE()`, [photo ?? null, ip, employeeId]);
        const [rows] = await db_1.pool.query(`SELECT d.*, e.full_name, e.position, e.employee_code
       FROM dtr_records d JOIN employees e ON e.employee_id = d.employee_id
       WHERE d.employee_id = ? AND d.work_date = CURDATE()`, [employeeId]);
        res.json(rows[0]);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
// ─── Public QR-scan endpoints (no auth — used by /dtr/scan/[token] page) ─────
// GET /api/dtr/public/employees — active employee list for the scan-page picker
async function publicGetEmployees(_req, res) {
    try {
        const [rows] = await db_1.pool.query(`SELECT employee_id, employee_code, full_name, position, role
       FROM employees WHERE status = 'active' ORDER BY full_name ASC`);
        res.json(rows);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
// GET /api/dtr/public/today/:employee_id — today's DTR record (or null) for an employee
async function publicGetToday(req, res) {
    try {
        const [rows] = await db_1.pool.query(`SELECT dtr_id, employee_id, work_date, time_in, time_out, hours_worked, overtime_hours, status, shift_start, shift_end
       FROM dtr_records WHERE employee_id = ? AND work_date = CURDATE()`, [req.params.employee_id]);
        const record = rows[0];
        res.json(record ?? null);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
// POST /api/dtr/public/clock-in — clock in by employee_id (no auth, used by QR scan)
async function publicClockIn(req, res) {
    const { employee_id, shift_start, shift_end } = req.body;
    if (!employee_id) {
        res.status(400).json({ error: 'employee_id is required' });
        return;
    }
    const ip = getClientIp(req);
    try {
        const [existing] = await db_1.pool.query(`SELECT dtr_id, time_in FROM dtr_records WHERE employee_id = ? AND work_date = CURDATE()`, [employee_id]);
        if (existing.length > 0 && existing[0].time_in) {
            res.status(409).json({ error: 'Already clocked in today.' });
            return;
        }
        await db_1.pool.query(`INSERT INTO dtr_records (employee_id, work_date, time_in, hours_worked, overtime_hours, status, shift_start, shift_end, ip_in)
       VALUES (?, CURDATE(), NOW(), 0, 0, 'OPEN', ?, ?, ?)
       ON DUPLICATE KEY UPDATE time_in = NOW(), status = 'OPEN', shift_start = ?, shift_end = ?, ip_in = ?`, [employee_id, shift_start ?? null, shift_end ?? null, ip,
            shift_start ?? null, shift_end ?? null, ip]);
        const [rows] = await db_1.pool.query(`SELECT d.*, e.full_name, e.position, e.employee_code
       FROM dtr_records d JOIN employees e ON e.employee_id = d.employee_id
       WHERE d.employee_id = ? AND d.work_date = CURDATE()`, [employee_id]);
        res.status(201).json(rows[0]);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
// POST /api/dtr/public/clock-out — clock out by employee_id (no auth, used by QR scan)
async function publicClockOut(req, res) {
    const { employee_id } = req.body;
    if (!employee_id) {
        res.status(400).json({ error: 'employee_id is required' });
        return;
    }
    const ip = getClientIp(req);
    try {
        const [existing] = await db_1.pool.query(`SELECT dtr_id, time_in, time_out FROM dtr_records WHERE employee_id = ? AND work_date = CURDATE()`, [employee_id]);
        const record = existing[0];
        if (!record?.time_in) {
            res.status(409).json({ error: 'Not clocked in today.' });
            return;
        }
        if (record.time_out) {
            res.status(409).json({ error: 'Already clocked out today.' });
            return;
        }
        await db_1.pool.query(`UPDATE dtr_records
       SET time_out       = NOW(),
           hours_worked   = ROUND(TIMESTAMPDIFF(SECOND, time_in, NOW()) / 3600, 2),
           overtime_hours = ROUND(GREATEST(0, TIMESTAMPDIFF(SECOND, time_in, NOW()) / 3600 - 8), 2),
           status         = 'CLOSED',
           ip_out         = ?
       WHERE employee_id = ? AND work_date = CURDATE()`, [ip, employee_id]);
        const [rows] = await db_1.pool.query(`SELECT d.*, e.full_name, e.position, e.employee_code
       FROM dtr_records d JOIN employees e ON e.employee_id = d.employee_id
       WHERE d.employee_id = ? AND d.work_date = CURDATE()`, [employee_id]);
        res.json(rows[0]);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
// POST /api/dtr/scan-clock — admin scans employee QR code to clock in or out
// Body: { employee_code: 'EMP_1', action: 'in' | 'out', photo?: base64 }
async function scanClock(req, res) {
    const { employee_code, action, photo } = req.body;
    if (!employee_code || !['in', 'out'].includes(action)) {
        res.status(400).json({ error: 'employee_code and action ("in" or "out") are required' });
        return;
    }
    const ip = getClientIp(req);
    try {
        const [empRows] = await db_1.pool.query(`SELECT employee_id, full_name, position FROM employees WHERE employee_code = ? AND status = 'active'`, [employee_code]);
        const emp = empRows[0];
        if (!emp) {
            res.status(404).json({ error: 'Employee not found or inactive.' });
            return;
        }
        if (action === 'in') {
            const [existing] = await db_1.pool.query(`SELECT dtr_id, time_in FROM dtr_records WHERE employee_id = ? AND work_date = CURDATE()`, [emp.employee_id]);
            if (existing.length > 0 && existing[0].time_in) {
                res.status(409).json({ error: `${emp.full_name} has already clocked in today.` });
                return;
            }
            await db_1.pool.query(`INSERT INTO dtr_records (employee_id, work_date, time_in, hours_worked, overtime_hours, status, photo_in, ip_in)
         VALUES (?, CURDATE(), NOW(), 0, 0, 'OPEN', ?, ?)
         ON DUPLICATE KEY UPDATE time_in = NOW(), status = 'OPEN', photo_in = ?, ip_in = ?`, [emp.employee_id, photo ?? null, ip, photo ?? null, ip]);
        }
        else {
            const [existing] = await db_1.pool.query(`SELECT dtr_id, time_in, time_out FROM dtr_records WHERE employee_id = ? AND work_date = CURDATE()`, [emp.employee_id]);
            const record = existing[0];
            if (!record?.time_in) {
                res.status(409).json({ error: `${emp.full_name} has not clocked in yet today.` });
                return;
            }
            if (record.time_out) {
                res.status(409).json({ error: `${emp.full_name} has already clocked out today.` });
                return;
            }
            await db_1.pool.query(`UPDATE dtr_records
         SET time_out       = NOW(),
             hours_worked   = ROUND(TIMESTAMPDIFF(SECOND, time_in, NOW()) / 3600, 2),
             overtime_hours = ROUND(GREATEST(0, TIMESTAMPDIFF(SECOND, time_in, NOW()) / 3600 - 8), 2),
             status         = 'CLOSED',
             photo_out      = ?,
             ip_out         = ?
         WHERE employee_id = ? AND work_date = CURDATE()`, [photo ?? null, ip, emp.employee_id]);
        }
        const [rows] = await db_1.pool.query(`SELECT d.*, e.full_name, e.position, e.employee_code
       FROM dtr_records d JOIN employees e ON e.employee_id = d.employee_id
       WHERE d.employee_id = ? AND d.work_date = CURDATE()`, [emp.employee_id]);
        res.json(rows[0]);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
