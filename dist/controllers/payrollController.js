"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPayroll = getPayroll;
exports.getPayrollById = getPayrollById;
exports.markCommissionPaid = markCommissionPaid;
exports.generatePayroll = generatePayroll;
exports.updatePayrollStatus = updatePayrollStatus;
exports.previewPayroll = previewPayroll;
const supabase_1 = require("../lib/supabase");
const payrollCalculator_1 = require("../lib/payrollCalculator");
// ---------------------------------------------------------------------------
// Maps Supabase snake_case response → camelCase expected by the frontend
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPayrollRecord(r) {
    const base = {
        id: r.id,
        employee_id: r.employee_id,
        agent_id: r.agent_id,
        agent_name: r.employees?.full_name ?? r.agent_name ?? null,
        employee: r.employees ?? null,
        employment_type: r.employment_type,
        payPeriodStart: r.pay_period_start,
        payPeriodEnd: r.pay_period_end,
        status: r.status,
        overtimeHours: r.overtime_hours ?? 0,
        overtimePay: r.overtime_pay ?? 0,
        grossIncome: r.gross_income ?? 0,
        totalDeductions: r.total_deductions ?? 0,
        netPay: r.net_pay ?? 0,
        reference_number: r.reference_number,
        paymentDate: r.payment_date ?? null,
        // DAILY specific
        daysWorked: r.days_worked ?? 0,
        dailyRate: r.daily_rate ?? 0,
        basePay: r.base_pay ?? 0,
        // MONTHLY specific
        monthlyRate: r.monthly_rate ?? 0,
        bonusAmount: r.bonus_amount ?? 0,
        // COMMISSION specific
        totalBookings: r.total_bookings ?? 0,
        totalCommissionAmount: r.gross_income ?? 0,
        taxes: r.total_deductions ?? 0,
        netPayout: r.net_pay ?? 0,
    };
    return base;
}
// GET /api/payroll?type=DAILY|MONTHLY|COMMISSION
async function getPayroll(req, res) {
    const { type } = req.query;
    let query = supabase_1.supabase
        .from('payroll_records')
        .select('*')
        .order('created_at', { ascending: false });
    if (type && type !== 'all') {
        query = query.eq('employment_type', type);
    }
    const { data, error } = await query;
    if (error) {
        res.status(500).json({ error: error.message });
        return;
    }
    const records = data ?? [];
    // Fetch employee data separately to avoid FK join dependency
    const employeeIds = [...new Set(records.map((r) => r.employee_id).filter(Boolean))];
    let employeeMap = {};
    if (employeeIds.length > 0) {
        const { data: employees } = await supabase_1.supabase
            .from('employees')
            .select('*')
            .in('employee_id', employeeIds);
        if (employees) {
            employeeMap = Object.fromEntries(employees.map((e) => [e.employee_id, e]));
        }
    }
    const merged = records.map((r) => ({
        ...r,
        employees: r.employee_id ? (employeeMap[r.employee_id] ?? null) : null,
    }));
    res.json(merged.map(mapPayrollRecord));
}
// GET /api/payroll/:id
async function getPayrollById(req, res) {
    const { id } = req.params;
    const { data: payroll, error: payrollError } = await supabase_1.supabase
        .from('payroll_records')
        .select('*')
        .eq('id', id)
        .single();
    if (payrollError || !payroll) {
        res.status(404).json({ error: 'Payroll record not found' });
        return;
    }
    // Fetch employee data separately
    let employeeData = null;
    if (payroll.employee_id) {
        const { data: emp } = await supabase_1.supabase
            .from('employees')
            .select('*')
            .eq('employee_id', payroll.employee_id)
            .single();
        employeeData = emp ?? null;
    }
    const normalized = mapPayrollRecord({ ...payroll, employees: employeeData });
    if (payroll.employment_type === 'COMMISSION') {
        const { data: commissions, error: commError } = await supabase_1.supabase
            .from('booking_commissions')
            .select('*')
            .eq('payroll_id', id)
            .order('booking_date', { ascending: true });
        if (commError) {
            res.status(500).json({ error: commError.message });
            return;
        }
        res.json({ ...normalized, bookingDetails: commissions ?? [] });
        return;
    }
    res.json(normalized);
}
// PATCH /api/payroll/commission/mark-paid
async function markCommissionPaid(req, res) {
    const { payroll_id, booking_id, gcash_reference, gcash_receipt_url } = req.body;
    if (!payroll_id || !booking_id) {
        res.status(400).json({ error: 'payroll_id and booking_id are required' });
        return;
    }
    const { data, error } = await supabase_1.supabase
        .from('booking_commissions')
        .update({
        commission_status: 'paid',
        paid_date: new Date().toISOString().split('T')[0],
        approved_by: 'Admin',
        gcash_reference: gcash_reference ?? null,
        gcash_receipt_url: gcash_receipt_url ?? null,
    })
        .eq('payroll_id', payroll_id)
        .eq('booking_id', booking_id)
        .select()
        .single();
    if (error) {
        res.status(500).json({ error: error.message });
        return;
    }
    res.json(data);
}
// POST /api/payroll/generate
// Body for DAILY      : { employee_id, pay_period_start, pay_period_end, days_worked, daily_rate }
// Body for MONTHLY    : { employee_id, pay_period_start, pay_period_end, monthly_rate }
// Body for COMMISSION : { agent_id, pay_period_start, pay_period_end, booking_commissions: number[] }
async function generatePayroll(req, res) {
    const { employment_type, employee_id, agent_id, pay_period_start, pay_period_end, days_worked, daily_rate, monthly_rate, booking_commissions, } = req.body;
    if (!employment_type || !pay_period_start || !pay_period_end) {
        res.status(400).json({ error: 'employment_type, pay_period_start, and pay_period_end are required' });
        return;
    }
    const timestamp = Date.now();
    let record = {};
    if (employment_type === 'DAILY') {
        if (!employee_id || !days_worked || !daily_rate) {
            res.status(400).json({ error: 'employee_id, days_worked, and daily_rate are required' });
            return;
        }
        const result = (0, payrollCalculator_1.computeDailyPayroll)(Number(daily_rate), Number(days_worked));
        record = {
            id: `PAY-D-${timestamp}`,
            employee_id: Number(employee_id),
            employment_type: 'DAILY',
            pay_period_start,
            pay_period_end,
            status: 'pending',
            days_worked: Number(days_worked),
            daily_rate: Number(daily_rate),
            base_pay: result.totalPay,
            overtime_hours: 0,
            overtime_pay: 0,
            gross_income: result.totalPay,
            total_deductions: 0,
            net_pay: result.totalPay,
            reference_number: `PAY-D-${timestamp}`,
        };
    }
    else if (employment_type === 'MONTHLY') {
        if (!employee_id || !monthly_rate) {
            res.status(400).json({ error: 'employee_id and monthly_rate are required' });
            return;
        }
        const result = (0, payrollCalculator_1.computeMonthlyPayroll)(Number(monthly_rate));
        record = {
            id: `PAY-M-${timestamp}`,
            employee_id: Number(employee_id),
            employment_type: 'MONTHLY',
            pay_period_start,
            pay_period_end,
            status: 'pending',
            monthly_rate: Number(monthly_rate),
            bonus_amount: 0,
            overtime_hours: 0,
            overtime_pay: 0,
            gross_income: result.totalPay,
            total_deductions: 0,
            net_pay: result.totalPay,
            reference_number: `PAY-M-${timestamp}`,
        };
    }
    else if (employment_type === 'COMMISSION') {
        if (!agent_id || !Array.isArray(booking_commissions)) {
            res.status(400).json({ error: 'agent_id and booking_commissions[] are required' });
            return;
        }
        const result = (0, payrollCalculator_1.computeCommissionPayout)(booking_commissions.map(Number));
        record = {
            id: `COMM-${timestamp}`,
            agent_id: Number(agent_id),
            employment_type: 'COMMISSION',
            pay_period_start,
            pay_period_end,
            status: 'pending',
            overtime_hours: 0,
            overtime_pay: 0,
            gross_income: result.totalCommission,
            total_deductions: 0,
            net_pay: result.netPayout,
            reference_number: `COMM-${timestamp}`,
        };
    }
    else {
        res.status(400).json({ error: `Unknown employment_type: ${employment_type}` });
        return;
    }
    const { data, error } = await supabase_1.supabase
        .from('payroll_records')
        .insert(record)
        .select()
        .single();
    if (error) {
        res.status(500).json({ error: error.message });
        return;
    }
    res.status(201).json(data);
}
// PATCH /api/payroll/:id/status
// Workflow: pending → approved → processed → paid  (or → declined)
async function updatePayrollStatus(req, res) {
    const { id } = req.params;
    const { status, payment_date } = req.body;
    const allowed = ['pending', 'approved', 'processed', 'paid', 'declined'];
    if (!status || !allowed.includes(status)) {
        res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
        return;
    }
    const updates = { status };
    if (status === 'paid' && payment_date) {
        updates.payment_date = payment_date;
    }
    const { data, error } = await supabase_1.supabase
        .from('payroll_records')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    if (error) {
        res.status(500).json({ error: error.message });
        return;
    }
    res.json(data);
}
// GET /api/payroll/preview
// Compute deductions without saving — useful for showing the employee a preview.
// Same body as /generate.
async function previewPayroll(req, res) {
    const { employment_type, days_worked, daily_rate, monthly_rate, booking_commissions, } = req.body;
    if (!employment_type) {
        res.status(400).json({ error: 'employment_type is required' });
        return;
    }
    if (employment_type === 'DAILY') {
        if (!days_worked || !daily_rate) {
            res.status(400).json({ error: 'days_worked and daily_rate are required' });
            return;
        }
        const result = (0, payrollCalculator_1.computeDailyPayroll)(Number(daily_rate), Number(days_worked));
        res.json(result);
        return;
    }
    if (employment_type === 'MONTHLY') {
        if (!monthly_rate) {
            res.status(400).json({ error: 'monthly_rate is required' });
            return;
        }
        const result = (0, payrollCalculator_1.computeMonthlyPayroll)(Number(monthly_rate));
        res.json(result);
        return;
    }
    if (employment_type === 'COMMISSION') {
        if (!Array.isArray(booking_commissions)) {
            res.status(400).json({ error: 'booking_commissions[] is required' });
            return;
        }
        const result = (0, payrollCalculator_1.computeCommissionPayout)(booking_commissions.map(Number));
        res.json(result);
        return;
    }
    res.status(400).json({ error: `Unknown employment_type: ${employment_type}` });
}
