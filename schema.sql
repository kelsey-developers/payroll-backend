-- =========================
-- PAYROLL SERVICE SCHEMA
-- MySQL 8
-- =========================

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS payroll_period_employees;
DROP TABLE IF EXISTS payroll_periods;
DROP TABLE IF EXISTS charges;
DROP TABLE IF EXISTS dtr_records;
DROP TABLE IF EXISTS employees;
SET FOREIGN_KEY_CHECKS = 1;

-- =========================
-- EMPLOYEES
-- =========================
CREATE TABLE employees (
    employee_id     BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    employee_code   VARCHAR(50) NOT NULL UNIQUE,
    full_name       VARCHAR(200) NOT NULL,
    email           VARCHAR(255) NULL UNIQUE,
    hire_date       DATE NOT NULL,
    position        VARCHAR(100) NOT NULL,
    employment_type ENUM('DAILY','MONTHLY','COMMISSION') NOT NULL DEFAULT 'DAILY',
    current_rate    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    role            VARCHAR(50) NOT NULL DEFAULT 'employee',
    status          ENUM('active','inactive') NOT NULL DEFAULT 'active',
    agent_id        BIGINT NULL,
    unit_id         BIGINT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- DTR RECORDS
-- =========================
CREATE TABLE dtr_records (
    dtr_id          BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    employee_id     BIGINT NOT NULL,
    work_date       DATE NOT NULL,
    time_in         DATETIME NULL,
    time_out        DATETIME NULL,
    hours_worked    DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    overtime_hours  DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    status          ENUM('OPEN','CLOSED') NOT NULL DEFAULT 'OPEN',
    shift_start     TIME NULL,
    shift_end       TIME NULL,
    notes           TEXT NULL,
    photo_in        MEDIUMTEXT NULL,
    photo_out       MEDIUMTEXT NULL,
    ip_in           VARCHAR(45) NULL,
    ip_out          VARCHAR(45) NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_dtr_employee
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
        ON UPDATE CASCADE ON DELETE CASCADE,

    CONSTRAINT uq_dtr_employee_date
        UNIQUE (employee_id, work_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- CHARGES (Penalty Deductions)
-- =========================
CREATE TABLE charges (
    charge_id       BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    employee_id     BIGINT NOT NULL,
    charge_date     DATE NOT NULL,
    description     VARCHAR(500) NOT NULL,
    amount          DECIMAL(12,2) NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_charge_employee
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
        ON UPDATE CASCADE ON DELETE CASCADE,

    CONSTRAINT chk_charge_amount
        CHECK (amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- PAYROLL PERIODS
-- =========================
CREATE TABLE payroll_periods (
    payroll_id       VARCHAR(50) NOT NULL PRIMARY KEY,
    period_start     DATE NOT NULL,
    period_end       DATE NOT NULL,
    status           ENUM('pending','approved','processed','paid') NOT NULL DEFAULT 'pending',
    total_gross      DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    total_deductions DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    total_net_pay    DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    employee_count   INT NOT NULL DEFAULT 0,
    notes            TEXT NULL,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- PAYROLL PERIOD EMPLOYEES
-- =========================
CREATE TABLE payroll_period_employees (
    id              BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    payroll_id      VARCHAR(50) NOT NULL,
    employee_id     BIGINT NOT NULL,
    effective_start DATE NOT NULL,
    effective_end   DATE NOT NULL,
    days_worked     INT NOT NULL DEFAULT 0,
    total_hours     DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    overtime_hours  DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    daily_rate      DECIMAL(12,2) NULL,
    monthly_rate    DECIMAL(12,2) NULL,
    base_pay        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    overtime_pay    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    gross_income    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_charges   DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    net_pay         DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_ppe_payroll
        FOREIGN KEY (payroll_id) REFERENCES payroll_periods(payroll_id)
        ON UPDATE CASCADE ON DELETE CASCADE,

    CONSTRAINT fk_ppe_employee
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
        ON UPDATE CASCADE ON DELETE CASCADE,

    CONSTRAINT uq_ppe_payroll_employee
        UNIQUE (payroll_id, employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- EMPLOYEE REGISTRATIONS
-- =========================
CREATE TABLE IF NOT EXISTS employee_registrations (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    full_name  VARCHAR(255) NOT NULL,
    email      VARCHAR(255) NOT NULL,
    message    TEXT NULL,
    status     ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
