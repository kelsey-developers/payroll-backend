"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeDailyPayroll = computeDailyPayroll;
exports.computeMonthlyPayroll = computeMonthlyPayroll;
exports.computeCommissionPayout = computeCommissionPayout;
function computeDailyPayroll(dailyRate, daysWorked) {
    const totalPay = parseFloat((dailyRate * daysWorked).toFixed(2));
    return { daysWorked, dailyRate, totalPay };
}
function computeMonthlyPayroll(monthlyRate) {
    return {
        monthlyRate,
        totalPay: parseFloat(monthlyRate.toFixed(2)),
    };
}
function computeCommissionPayout(bookingCommissions) {
    const totalBookings = bookingCommissions.length;
    const totalCommission = parseFloat(bookingCommissions.reduce((sum, c) => sum + c, 0).toFixed(2));
    return { totalBookings, totalCommission, netPayout: totalCommission };
}
