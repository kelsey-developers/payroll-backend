// PATH: back-end/src/controllers/payrollController.ts

import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { uploadFile } from '../lib/storage';
import {
  computeDailyPayroll,
  computeMonthlyPayroll,
  computeCommissionPayout,
} from '../lib/payrollCalculator';

// Helper — normalizes a raw payroll_records row
function mapPayrollRecord(record: Record<string, any>) {
  return record;
}

// GET all payroll records by employment type
export const getPayrollByType = async (req: Request, res: Response) => {
  const { type } = req.params;

  const { data, error } = await supabase
    .from('payroll_records')
    .select('*')
    .eq('employment_type', type)
    .order('created_at', { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const records = data ?? [];

  const employeeIds = [...new Set(records.map((r) => r.employee_id).filter(Boolean))];
  let employeeMap: Record<number, Record<string, unknown>> = {};

  if (employeeIds.length > 0) {
    const { data: employees } = await supabase
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
};

// GET single payroll record by ID
export async function getPayrollById(req: Request, res: Response) {
  const { id } = req.params;

  const { data: payroll, error } = await supabase
    .from('payroll_records')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  let employeeData = null;
  if (payroll.employee_id) {
    const { data: emp } = await supabase
      .from('employees')
      .select('*')
      .eq('employee_id', payroll.employee_id)
      .single();
    employeeData = emp ?? null;
  }

  res.json(mapPayrollRecord({ ...payroll, employees: employeeData }));
}

// GET payroll records for a specific employee
export const getPayrollRecords = async (req: Request, res: Response) => {
  const { employeeId } = req.params;

  const { data, error } = await supabase
    .from('payroll_records')
    .select('*')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
};

// POST generate payroll
export const generatePayroll = async (req: Request, res: Response) => {
  const { employee_id, pay_period_start, pay_period_end, commission_rate } = req.body;

  if (!employee_id || !pay_period_start || !pay_period_end) {
    return res.status(400).json({
      message: 'Missing required fields: employee_id, pay_period_start, pay_period_end',
    });
  }

  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('*')
    .eq('employee_id', employee_id)
    .single();

  if (empError || !employee) {
    return res.status(500).json({ message: empError?.message ?? 'Employee not found' });
  }

  const { data: dtrRecords, error: dtrError } = await supabase
    .from('dtr_records')
    .select('*')
    .eq('employee_id', employee_id)
    .gte('work_date', pay_period_start)
    .lte('work_date', pay_period_end)
    .eq('status', 'CLOSED');

  if (dtrError) return res.status(500).json({ message: dtrError.message });

  const timestamp       = Date.now();
  const payrollId       = `PR-${employee_id}-${timestamp}`;
  const referenceNumber = `REF-${employee.employment_type.charAt(0)}-${timestamp}`;

  let payrollData: Record<string, any> = {
    id:               payrollId,
    reference_number: referenceNumber,
    employee_id,
    agent_id:         employee.agent_id ?? null,
    employment_type:  employee.employment_type,
    pay_period_start,
    pay_period_end,
    status:           'pending',
  };

  if (employee.employment_type === 'DAILY') {
    const result = computeDailyPayroll(employee.current_rate, dtrRecords.length);
    payrollData = {
      ...payrollData,
      days_worked:      result.daysWorked,
      daily_rate:       result.dailyRate,
      base_pay:         result.totalPay,
      overtime_hours:   0,
      overtime_pay:     0,
      gross_income:     result.totalPay,
      total_deductions: 0,
      net_pay:          result.totalPay,
    };

  } else if (employee.employment_type === 'MONTHLY') {
    const result = computeMonthlyPayroll(employee.current_rate);
    payrollData = {
      ...payrollData,
      monthly_rate:     result.monthlyRate,
      base_pay:         result.totalPay,
      overtime_hours:   0,
      overtime_pay:     0,
      bonus_amount:     0,
      gross_income:     result.totalPay,
      total_deductions: 0,
      net_pay:          result.totalPay,
    };

  } else if (employee.employment_type === 'COMMISSION') {
    const commissionQuery = supabase
      .from('booking_commissions')
      .select('commission_amount')
      .eq('commission_status', 'unpaid')
      .gte('booking_date', pay_period_start)
      .lte('booking_date', pay_period_end);

    if (employee.agent_id) {
      commissionQuery.eq('agent_id', employee.agent_id);
    }

    const { data: commissions, error: commError } = await commissionQuery;
    if (commError) return res.status(500).json({ message: commError.message });

    const amounts = (commissions ?? []).map((c: any) => Number(c.commission_amount));
    const result  = computeCommissionPayout(amounts);

    payrollData = { ...payrollData, net_pay: result.netPayout };
  }

  const { data, error } = await supabase
    .from('payroll_records')
    .insert(payrollData)
    .select()
    .single();

  if (error) return res.status(500).json({ message: error.message });
  return res.status(201).json(data);
};

// PATCH mark commission as paid
export const markCommissionPaid = async (req: Request, res: Response) => {
  const { payroll_id, booking_id, gcash_reference, gcash_receipt_url } = req.body;

  const { data, error } = await supabase
    .from('booking_commissions')
    .update({
      commission_status: 'paid',
      gcash_reference,
      gcash_receipt_url,
      paid_date: new Date().toISOString().split('T')[0],
    })
    .eq('payroll_id', payroll_id)
    .eq('booking_id', booking_id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
};

// POST upload GCash receipt
export const uploadGcashReceipt = async (req: Request, res: Response) => {
  const { commissionId } = req.params;
  const file = req.file;

  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const path = `commissions/${commissionId}/${Date.now()}.jpg`;
    const url  = await uploadFile('gcash-receipts', path, file.buffer, file.mimetype);

    const { data, error } = await supabase
      .from('booking_commissions')
      .update({ gcash_receipt_url: url })
      .eq('id', commissionId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// PATCH /api/payroll/:id/status
// Workflow: pending → approved → processed → paid (or → declined)
export async function updatePayrollStatus(req: Request, res: Response) {
  const { id } = req.params;
  const { status, payment_date } = req.body;

  const allowed = ['pending', 'approved', 'processed', 'paid', 'declined'];
  if (!status || !allowed.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
    return;
  }

  const updates: Record<string, unknown> = { status };
  if (status === 'paid' && payment_date) updates.payment_date = payment_date;

  const { data, error } = await supabase
    .from('payroll_records')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
}

// PATCH update payroll record (full edit)
export const updatePayroll = async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    status, pay_period_start, pay_period_end, daily_rate, monthly_rate,
    overtime_hours, overtime_pay, bonus_amount, total_deductions,
    base_pay, gross_income, net_pay,
  } = req.body;

  const updates: Record<string, any> = {};
  if (status           !== undefined) updates.status           = status;
  if (pay_period_start !== undefined) updates.pay_period_start = pay_period_start;
  if (pay_period_end   !== undefined) updates.pay_period_end   = pay_period_end;
  if (daily_rate       !== undefined) updates.daily_rate       = daily_rate;
  if (monthly_rate     !== undefined) updates.monthly_rate     = monthly_rate;
  if (overtime_hours   !== undefined) updates.overtime_hours   = overtime_hours;
  if (overtime_pay     !== undefined) updates.overtime_pay     = overtime_pay;
  if (bonus_amount     !== undefined) updates.bonus_amount     = bonus_amount;
  if (total_deductions !== undefined) updates.total_deductions = total_deductions;
  if (base_pay         !== undefined) updates.base_pay         = base_pay;
  if (gross_income     !== undefined) updates.gross_income     = gross_income;
  if (net_pay          !== undefined) updates.net_pay          = net_pay;

  const { data, error } = await supabase
    .from('payroll_records')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ message: error.message });
  return res.json(data);
};

// DELETE payroll record
export const deletePayroll = async (req: Request, res: Response) => {
  const { id } = req.params;

  const { error } = await supabase
    .from('payroll_records')
    .delete()
    .eq('id', id);

  if (error) return res.status(500).json({ message: error.message });
  return res.status(204).send();
};