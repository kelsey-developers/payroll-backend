"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPeriods = listPeriods;
exports.getPeriod = getPeriod;
exports.generatePeriod = generatePeriod;
exports.updatePeriodStatus = updatePeriodStatus;
exports.deletePeriod = deletePeriod;
const db_1 = require("../lib/db");
function genPayrollId(start) {
    const d = start.replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `PAY-${d}${rand}`;
}
// GET /api/payroll-periods
async function listPeriods(req, res) {
    const { payroll_id, start, end } = req.query;
    try {
        let sql = `SELECT * FROM payroll_periods WHERE 1=1`;
        const params = [];
        if (payroll_id) {
            sql += ' AND payroll_id LIKE ?';
            params.push(`%${payroll_id}%`);
        }
        if (start) {
            sql += ' AND period_end >= ?';
            params.push(start);
        }
        if (end) {
            sql += ' AND period_start <= ?';
            params.push(end);
        }
        sql += ' ORDER BY created_at DESC';
        const [rows] = await db_1.pool.query(sql, params);
        res.json(rows);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
// GET /api/payroll-periods/:id
async function getPeriod(req, res) {
    try {
        const [rows] = await db_1.pool.query(`SELECT * FROM payroll_periods WHERE payroll_id = ?`, [req.params.id]);
        const period = rows[0];
        if (!period) {
            res.status(404).json({ error: 'Payroll period not found' });
            return;
        }
        const [empRows] = await db_1.pool.query(`SELECT ppe.*, e.full_name, e.position, e.employment_type
       FROM payroll_period_employees ppe
       JOIN employees e ON e.employee_id = ppe.employee_id
       WHERE ppe.payroll_id = ?
       ORDER BY e.full_name ASC`, [req.params.id]);
        const employees = empRows;
        for (const emp of employees) {
            const [chargeRows] = await db_1.pool.query(`SELECT charge_id, charge_date, description, amount
         FROM charges
         WHERE employee_id = ? AND charge_date BETWEEN ? AND ?`, [emp.employee_id, period.period_start, period.period_end]);
            emp.charges = chargeRows;
        }
        res.json({ ...period, employees });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
// POST /api/payroll-periods/generate
async function generatePeriod(req, res) {
    const { period_start, period_end, notes } = req.body;
    if (!period_start || !period_end) {
        res.status(400).json({ error: 'period_start and period_end are required' });
        return;
    }
    const conn = await db_1.pool.getConnection();
    try {
        await conn.beginTransaction();
        const payroll_id = genPayrollId(period_start);
        const periodDays = Math.max(1, (new Date(period_end).getTime() - new Date(period_start).getTime()) / 86400000 + 1);
        const [employees] = await conn.query(`SELECT employee_id, employment_type, current_rate, hire_date
       FROM employees WHERE status = 'active'`);
        // Insert the payroll period row FIRST so that payroll_period_employees FK is satisfied
        await conn.query(`INSERT INTO payroll_periods
         (payroll_id, period_start, period_end, status,
          total_gross, total_deductions, total_net_pay, employee_count, notes)
       VALUES (?, ?, ?, 'pending', 0, 0, 0, 0, ?)`, [payroll_id, period_start, period_end, notes ?? null]);
        let totalGross = 0, totalDeductions = 0, totalNetPay = 0, employeeCount = 0;
        for (const emp of employees) {
            // Effective start = max(period_start, hire_date)
            const hireDate = new Date(emp.hire_date);
            const pStart = new Date(period_start);
            const pEnd = new Date(period_end);
            const effStart = hireDate > pStart ? hireDate : pStart;
            if (effStart > pEnd)
                continue;
            const effStartStr = effStart.toISOString().slice(0, 10);
            const effDays = Math.max(1, (pEnd.getTime() - effStart.getTime()) / 86400000 + 1);
            // CLOSED DTR records within effective window
            const [dtrRows] = await conn.query(`SELECT hours_worked, overtime_hours
         FROM dtr_records
         WHERE employee_id = ? AND status = 'CLOSED'
           AND work_date BETWEEN ? AND ?`, [emp.employee_id, effStartStr, period_end]);
            const daysWorked = dtrRows.length;
            const totalHours = dtrRows.reduce((s, r) => s + parseFloat(r.hours_worked || 0), 0);
            const overtimeHours = dtrRows.reduce((s, r) => s + parseFloat(r.overtime_hours || 0), 0);
            const rate = parseFloat(emp.current_rate);
            let basePay = 0, overtimePay = 0;
            if (emp.employment_type === 'DAILY') {
                basePay = rate * daysWorked;
                overtimePay = (rate / 8) * 1.25 * overtimeHours;
            }
            else if (emp.employment_type === 'MONTHLY') {
                basePay = rate * (effDays / periodDays);
                overtimePay = (rate / 30 / 8) * 1.25 * overtimeHours;
            }
            basePay = parseFloat(basePay.toFixed(2));
            overtimePay = parseFloat(overtimePay.toFixed(2));
            const grossIncome = parseFloat((basePay + overtimePay).toFixed(2));
            // Charges within effective window
            const [chargeRows] = await conn.query(`SELECT COALESCE(SUM(amount), 0) AS total
         FROM charges
         WHERE employee_id = ? AND charge_date BETWEEN ? AND ?`, [emp.employee_id, effStartStr, period_end]);
            const totalCharges = parseFloat(parseFloat(chargeRows[0]?.total || 0).toFixed(2));
            const netPay = parseFloat(Math.max(0, grossIncome - totalCharges).toFixed(2));
            await conn.query(`INSERT INTO payroll_period_employees
           (payroll_id, employee_id, effective_start, effective_end,
            days_worked, total_hours, overtime_hours,
            daily_rate, monthly_rate,
            base_pay, overtime_pay, gross_income, total_charges, net_pay)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                payroll_id, emp.employee_id, effStartStr, period_end,
                daysWorked,
                parseFloat(totalHours.toFixed(2)),
                parseFloat(overtimeHours.toFixed(2)),
                emp.employment_type === 'DAILY' ? rate : null,
                emp.employment_type === 'MONTHLY' ? rate : null,
                basePay, overtimePay, grossIncome, totalCharges, netPay,
            ]);
            totalGross += grossIncome;
            totalDeductions += totalCharges;
            totalNetPay += netPay;
            employeeCount += 1;
        }
        // Update the totals now that we've processed all employees
        await conn.query(`UPDATE payroll_periods
       SET total_gross = ?, total_deductions = ?, total_net_pay = ?, employee_count = ?
       WHERE payroll_id = ?`, [
            parseFloat(totalGross.toFixed(2)),
            parseFloat(totalDeductions.toFixed(2)),
            parseFloat(totalNetPay.toFixed(2)),
            employeeCount,
            payroll_id,
        ]);
        await conn.commit();
        const [rows] = await conn.query(`SELECT * FROM payroll_periods WHERE payroll_id = ?`, [payroll_id]);
        res.status(201).json(rows[0]);
    }
    catch (e) {
        await conn.rollback();
        res.status(500).json({ error: e.message });
    }
    finally {
        conn.release();
    }
}
// PATCH /api/payroll-periods/:id
async function updatePeriodStatus(req, res) {
    const { status } = req.body;
    const allowed = ['pending', 'approved', 'processed', 'paid'];
    if (!status || !allowed.includes(status)) {
        res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
        return;
    }
    try {
        await db_1.pool.query(`UPDATE payroll_periods SET status = ? WHERE payroll_id = ?`, [status, req.params.id]);
        const [rows] = await db_1.pool.query(`SELECT * FROM payroll_periods WHERE payroll_id = ?`, [req.params.id]);
        res.json(rows[0]);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
// DELETE /api/payroll-periods/:id
async function deletePeriod(req, res) {
    try {
        await db_1.pool.query(`DELETE FROM payroll_periods WHERE payroll_id = ?`, [req.params.id]);
        res.json({ message: 'Payroll period deleted' });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
