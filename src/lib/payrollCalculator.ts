/**
 * Kelsey's Homestay — Payroll Calculator
 *
 * Based on business interview transcript:
 *
 * HOUSEKEEPERS (DAILY):
 *   - Paid ₱500/day entry-level (rate increases with tenure)
 *   - Pay = days_worked × daily_rate
 *   - No deductions, no overtime pay, no late penalty
 *   - Absences = simply not counted (no penalty, just unpaid)
 *   - Payroll period: semi-monthly (twice a month)
 *
 * ADMIN (MONTHLY):
 *   - Fixed monthly salary
 *   - Online only — handles queries, gatepasses, booking confirmations
 *   - No overtime, no deductions
 *
 * AGENTS (COMMISSION):
 *   - 100+ agents, ~50–70 active
 *   - Paid per booking via GCash after guest check-in
 *   - No DTR — commission only
 *   - No deductions
 */

// ---------------------------------------------------------------------------
// DAILY (Housekeeper) — Pay = days_worked × daily_rate
// No deductions, no overtime
// ---------------------------------------------------------------------------
export interface DailyPayrollResult {
  daysWorked: number;
  dailyRate: number;
  totalPay: number;
}

export function computeDailyPayroll(
  dailyRate: number,
  daysWorked: number
): DailyPayrollResult {
  const totalPay = parseFloat((dailyRate * daysWorked).toFixed(2));
  return { daysWorked, dailyRate, totalPay };
}

// ---------------------------------------------------------------------------
// MONTHLY (Admin) — Fixed monthly salary, no deductions
// ---------------------------------------------------------------------------
export interface MonthlyPayrollResult {
  monthlyRate: number;
  totalPay: number;
}

export function computeMonthlyPayroll(monthlyRate: number): MonthlyPayrollResult {
  return {
    monthlyRate,
    totalPay: parseFloat(monthlyRate.toFixed(2)),
  };
}

// ---------------------------------------------------------------------------
// COMMISSION (Agent) — Per booking, paid via GCash after check-in
// commission_amount is set per booking — no deductions
// ---------------------------------------------------------------------------
export interface CommissionPayrollResult {
  totalBookings: number;
  totalCommission: number;
  netPayout: number;
}

export function computeCommissionPayout(
  bookingCommissions: number[]
): CommissionPayrollResult {
  const totalBookings  = bookingCommissions.length;
  const totalCommission = parseFloat(
    bookingCommissions.reduce((sum, c) => sum + c, 0).toFixed(2)
  );
  return { totalBookings, totalCommission, netPayout: totalCommission };
}
