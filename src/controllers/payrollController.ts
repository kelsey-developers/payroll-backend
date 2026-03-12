// PATH: back-end/src/controllers/payrollController.ts

import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { uploadFile } from '../lib/storage';
import {
  computeDailyPayroll,
  computeMonthlyPayroll,
  computeCommissionPayout,
} from '../lib/payrollCalculator';

// GET all payroll records by employment type
export const getPayrollByType = async (req: Request, res: Response) => {
  const { type } = req.params;

  const { data, error } = await supabase
    .from('payroll_records')
    .select('*, employees(*)')
    .eq('employment_type', type)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
};

// GET single payroll record by ID
export const getPayrollById = async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('payroll_records')
    .select('*, employees(*)')
    .eq('id', id)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
};

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
  const { employeeId, payPeriodStart, payPeriodEnd } = req.body;

  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('*')
    .eq('employee_id', employeeId)
    .single();

  if (empError) return res.status(500).json({ error: empError.message });

  const { data: dtrRecords, error: dtrError } = await supabase
    .from('dtr_records')
    .select('*')
    .eq('employee_id', employeeId)
    .gte('work_date', payPeriodStart)
    .lte('work_date', payPeriodEnd)
    .eq('status', 'CLOSED');

  if (dtrError) return res.status(500).json({ error: dtrError.message });

  let payrollData: Record<string, any> = {
    id: `PR-${employeeId}-${Date.now()}`,
    employee_id: employeeId,
    employment_type: employee.employment_type,
    pay_period_start: payPeriodStart,
    pay_period_end: payPeriodEnd,
    status: 'pending',
  };

  if (employee.employment_type === 'DAILY') {
    const result = computeDailyPayroll(employee.current_rate, dtrRecords.length);
    payrollData = {
      ...payrollData,
      days_worked: result.daysWorked,
      daily_rate: result.dailyRate,
      base_pay: result.totalPay,
      gross_income: result.totalPay,
      total_deductions: 0,
      net_pay: result.totalPay,
    };
  } else if (employee.employment_type === 'MONTHLY') {
    const result = computeMonthlyPayroll(employee.current_rate);
    payrollData = {
      ...payrollData,
      monthly_rate: result.monthlyRate,
      base_pay: result.totalPay,
      gross_income: result.totalPay,
      total_deductions: 0,
      net_pay: result.totalPay,
    };
  } else if (employee.employment_type === 'COMMISSION') {
    const { data: commissions, error: commError } = await supabase
      .from('booking_commissions')
      .select('commission_amount')
      .eq('commission_status', 'unpaid')
      .gte('booking_date', payPeriodStart)
      .lte('booking_date', payPeriodEnd);

    if (commError) return res.status(500).json({ error: commError.message });

    const amounts = commissions.map((c: any) => Number(c.commission_amount));
    const result = computeCommissionPayout(amounts);
    payrollData = {
      ...payrollData,
      total_bookings: result.totalBookings,
      gross_income: result.totalCommission,
      total_deductions: 0,
      net_pay: result.netPayout,
    };
  }

  const { data, error } = await supabase
    .from('payroll_records')
    .insert(payrollData)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
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
    const url = await uploadFile('gcash-receipts', path, file.buffer, file.mimetype);

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