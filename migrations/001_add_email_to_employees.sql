-- Migration: Add email column to employees table
-- Run once against kelsey_payroll database

ALTER TABLE employees
  ADD COLUMN email VARCHAR(255) NULL AFTER full_name,
  ADD UNIQUE INDEX uq_employee_email (email);
