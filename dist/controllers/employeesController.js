"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listEmployees = listEmployees;
exports.getEmployee = getEmployee;
exports.createEmployee = createEmployee;
exports.updateEmployee = updateEmployee;
exports.deleteEmployee = deleteEmployee;
exports.getEmployeeRoles = getEmployeeRoles;
exports.patchEmployeeRole = patchEmployeeRole;
const db_1 = require("../lib/db");
// GET /api/employees - fetches from local employees table
async function listEmployees(req, res) {
    try {
        const [rows] = await db_1.pool.query(`SELECT * FROM employees ORDER BY full_name ASC`);
        res.json(rows);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
// GET /api/employees/:id
async function getEmployee(req, res) {
    try {
        const [rows] = await db_1.pool.query(`SELECT * FROM employees WHERE employee_id = ?`, [req.params.id]);
        const data = rows[0];
        if (!data) {
            res.status(404).json({ error: 'Employee not found' });
            return;
        }
        res.json(data);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
// POST /api/employees
async function createEmployee(req, res) {
    const { full_name, email, hire_date, position, employment_type, current_rate, role } = req.body;
    if (!full_name || !hire_date || !position || !employment_type || current_rate === undefined) {
        res.status(400).json({ error: 'full_name, hire_date, position, employment_type, and current_rate are required' });
        return;
    }
    try {
        const [countRows] = await db_1.pool.query(`SELECT COUNT(*) AS total FROM employees`);
        const nextNum = countRows[0].total + 1;
        const employee_code = `EMP_${nextNum}`;
        const [result] = await db_1.pool.query(`INSERT INTO employees (employee_code, full_name, email, hire_date, position, employment_type, current_rate, role, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`, [employee_code, full_name, email ?? null, hire_date, position, employment_type, Number(current_rate), role ?? 'employee']);
        const insertId = result.insertId;
        const [rows] = await db_1.pool.query(`SELECT * FROM employees WHERE employee_id = ?`, [insertId]);
        res.status(201).json(rows[0]);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
// PUT /api/employees/:id
async function updateEmployee(req, res) {
    const { full_name, email, hire_date, position, employment_type, current_rate, role, status } = req.body;
    try {
        await db_1.pool.query(`UPDATE employees SET
        full_name       = COALESCE(?, full_name),
        email           = COALESCE(?, email),
        hire_date       = COALESCE(?, hire_date),
        position        = COALESCE(?, position),
        employment_type = COALESCE(?, employment_type),
        current_rate    = COALESCE(?, current_rate),
        role            = COALESCE(?, role),
        status          = COALESCE(?, status)
       WHERE employee_id = ?`, [
            full_name ?? null, email ?? null, hire_date ?? null, position ?? null, employment_type ?? null,
            current_rate !== undefined ? Number(current_rate) : null,
            role ?? null, status ?? null,
            req.params.id,
        ]);
        const [rows] = await db_1.pool.query(`SELECT * FROM employees WHERE employee_id = ?`, [req.params.id]);
        const data = rows[0];
        if (!data) {
            res.status(404).json({ error: 'Employee not found' });
            return;
        }
        res.json(data);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
// DELETE /api/employees/:id
async function deleteEmployee(req, res) {
    try {
        await db_1.pool.query(`DELETE FROM employees WHERE employee_id = ?`, [req.params.id]);
        res.json({ message: 'Employee deleted' });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
// GET /api/employees/roles — no auth required, used by frontend to resolve employee role from email
// Returns { "email@example.com": "employee", ... } for all active employees with an email on file
async function getEmployeeRoles(req, res) {
    try {
        const [rows] = await db_1.pool.query(`SELECT email FROM employees WHERE status = 'active' AND email IS NOT NULL`);
        const map = {};
        for (const row of rows) {
            map[row.email.toLowerCase()] = 'employee';
        }
        res.json(map);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
// PATCH /api/employees/roles — no auth required
// Body: { email, name?, role }
// Used by manage-users to assign the "Employee" role without hitting the auth service.
// If an employee record with this email exists, we confirm it. Otherwise we acknowledge silently.
async function patchEmployeeRole(req, res) {
    const { email, role } = req.body;
    if (!email) {
        res.status(400).json({ error: 'email is required' });
        return;
    }
    try {
        const [rows] = await db_1.pool.query(`SELECT employee_id FROM employees WHERE LOWER(email) = LOWER(?) LIMIT 1`, [email]);
        const found = rows.length > 0;
        res.json({
            message: found ? 'Employee role confirmed' : 'Role noted (no payroll record found for this email)',
            email,
            role: role ?? 'Employee',
            roles: [role ?? 'Employee'],
        });
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}
