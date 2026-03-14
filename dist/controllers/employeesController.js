"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listEmployees = listEmployees;
exports.getEmployee = getEmployee;
exports.createEmployee = createEmployee;
exports.updateEmployee = updateEmployee;
exports.deleteEmployee = deleteEmployee;
const db_1 = require("../lib/db");
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL ?? 'http://localhost:3000';
const ALLOWED_ROLES = ['Finance', 'Inventory', 'Housekeeping'];
// GET /api/employees - fetches from auth-service /api/users, filtered by finance/inventory/housekeeping
async function listEmployees(req, res) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Authorization token required' });
            return;
        }
        const token = authHeader.substring(7);
        const headers = { Authorization: `Bearer ${token}` };
        // Fetch users for each allowed role and merge (auth /api/users supports role filter)
        const allUsers = {};
        for (const role of ALLOWED_ROLES) {
            const resp = await fetch(`${AUTH_SERVICE_URL}/api/users?role=${encodeURIComponent(role)}&limit=100`, { headers });
            if (!resp.ok) {
                const err = await resp.json().catch(() => ({}));
                res.status(resp.status).json(err.error ? { error: err.error } : { error: 'Failed to fetch users' });
                return;
            }
            const data = await resp.json();
            for (const u of data.users ?? []) {
                if (!allUsers[u.id])
                    allUsers[u.id] = u;
            }
        }
        const users = Object.values(allUsers)
            .filter((u) => {
            const roles = (u.roles ?? []).map((r) => String(r));
            return roles.some((r) => ALLOWED_ROLES.includes(r));
        })
            .sort((a, b) => (a.fullname || '').localeCompare(b.fullname || ''));
        const employees = users.map((u) => ({
            employee_id: u.id,
            employee_code: null,
            full_name: u.fullname ?? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
            hire_date: null,
            position: null,
            employment_type: null,
            current_rate: null,
            role: (u.roles ?? []).find((r) => ALLOWED_ROLES.includes(String(r))) ?? null,
            status: u.status ?? 'active',
            created_at: u.createdAt,
        }));
        res.json(employees);
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
    const { full_name, hire_date, position, employment_type, current_rate, role } = req.body;
    if (!full_name || !hire_date || !position || !employment_type || current_rate === undefined) {
        res.status(400).json({ error: 'full_name, hire_date, position, employment_type, and current_rate are required' });
        return;
    }
    try {
        const employee_code = `EMP-${Date.now()}`;
        const [result] = await db_1.pool.query(`INSERT INTO employees (employee_code, full_name, hire_date, position, employment_type, current_rate, role, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`, [employee_code, full_name, hire_date, position, employment_type, Number(current_rate), role ?? 'employee']);
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
    const { full_name, hire_date, position, employment_type, current_rate, role, status } = req.body;
    try {
        await db_1.pool.query(`UPDATE employees SET
        full_name       = COALESCE(?, full_name),
        hire_date       = COALESCE(?, hire_date),
        position        = COALESCE(?, position),
        employment_type = COALESCE(?, employment_type),
        current_rate    = COALESCE(?, current_rate),
        role            = COALESCE(?, role),
        status          = COALESCE(?, status)
       WHERE employee_id = ?`, [
            full_name ?? null, hire_date ?? null, position ?? null, employment_type ?? null,
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
