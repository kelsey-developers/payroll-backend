import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';

import dtrRoutes              from './routes/dtr';
import employeeRoutes         from './routes/employees';
import chargesRoutes          from './routes/charges';
import payrollPeriodRoutes    from './routes/payroll-periods';
import registrationRoutes     from './routes/registrations';
import { openapiSpec }     from './openapi';
import { pool }            from './lib/db';

dotenv.config();

const app  = express();
const PORT = process.env.PORT ?? 4000;

/** Run any pending schema migrations on startup (safe to re-run — checks before altering). */
async function runMigrations() {
  try {
    // Add email column to employees if it doesn't exist yet
    const [cols] = await pool.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'email'`
    );
    if ((cols as any[]).length === 0) {
      await pool.query(
        `ALTER TABLE employees ADD COLUMN email VARCHAR(255) NULL UNIQUE AFTER full_name`
      );
      console.log('[migration] Added email column to employees table.');
    }

    // Add proof columns to dtr_records if they don't exist yet
    const dtrCols: string[] = [
      `ALTER TABLE dtr_records ADD COLUMN photo_in  MEDIUMTEXT NULL AFTER notes`,
      `ALTER TABLE dtr_records ADD COLUMN photo_out MEDIUMTEXT NULL AFTER photo_in`,
      `ALTER TABLE dtr_records ADD COLUMN ip_in     VARCHAR(45) NULL AFTER photo_out`,
      `ALTER TABLE dtr_records ADD COLUMN ip_out    VARCHAR(45) NULL AFTER ip_in`,
    ];
    const colNames = ['photo_in', 'photo_out', 'ip_in', 'ip_out'];
    for (let i = 0; i < colNames.length; i++) {
      const [exist] = await pool.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dtr_records' AND COLUMN_NAME = ?`,
        [colNames[i]]
      );
      if ((exist as any[]).length === 0) {
        await pool.query(dtrCols[i]);
        console.log(`[migration] Added ${colNames[i]} column to dtr_records.`);
      }
    }

    // Create employee_registrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS employee_registrations (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        full_name  VARCHAR(255) NOT NULL,
        email      VARCHAR(255) NOT NULL,
        message    TEXT NULL,
        status     ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (err) {
    console.error('[migration] Failed to run migrations:', err);
  }
}

app.use(cors({ origin: '*' }));
app.use(express.json());

// Payroll system routes (MySQL)
app.use('/api/dtr',                      dtrRoutes);
app.use('/api/employees',                employeeRoutes);
app.use('/api/charges',                  chargesRoutes);
app.use('/api/payroll-periods',          payrollPeriodRoutes);
app.use('/api/employee-registrations',   registrationRoutes);

// Swagger / OpenAPI
app.get('/openapi.json', (_req, res) => res.json(openapiSpec));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

runMigrations().then(() => {
  app.listen(PORT, () => {
    console.log(`Payroll backend running on http://localhost:${PORT}`);
    console.log(`Swagger docs:           http://localhost:${PORT}/docs`);
  });
});
