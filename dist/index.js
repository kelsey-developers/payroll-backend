"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const dtr_1 = __importDefault(require("./routes/dtr"));
const employees_1 = __importDefault(require("./routes/employees"));
const charges_1 = __importDefault(require("./routes/charges"));
const payroll_periods_1 = __importDefault(require("./routes/payroll-periods"));
const registrations_1 = __importDefault(require("./routes/registrations"));
const openapi_1 = require("./openapi");
const db_1 = require("./lib/db");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT ?? 4000;
/** Run any pending schema migrations on startup (safe to re-run — checks before altering). */
async function runMigrations() {
    try {
        // Add email column to employees if it doesn't exist yet
        const [cols] = await db_1.pool.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'email'`);
        if (cols.length === 0) {
            await db_1.pool.query(`ALTER TABLE employees ADD COLUMN email VARCHAR(255) NULL UNIQUE AFTER full_name`);
            console.log('[migration] Added email column to employees table.');
        }
        // Add proof columns to dtr_records if they don't exist yet
        const dtrCols = [
            `ALTER TABLE dtr_records ADD COLUMN photo_in  MEDIUMTEXT NULL AFTER notes`,
            `ALTER TABLE dtr_records ADD COLUMN photo_out MEDIUMTEXT NULL AFTER photo_in`,
            `ALTER TABLE dtr_records ADD COLUMN ip_in     VARCHAR(45) NULL AFTER photo_out`,
            `ALTER TABLE dtr_records ADD COLUMN ip_out    VARCHAR(45) NULL AFTER ip_in`,
        ];
        const colNames = ['photo_in', 'photo_out', 'ip_in', 'ip_out'];
        for (let i = 0; i < colNames.length; i++) {
            const [exist] = await db_1.pool.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'dtr_records' AND COLUMN_NAME = ?`, [colNames[i]]);
            if (exist.length === 0) {
                await db_1.pool.query(dtrCols[i]);
                console.log(`[migration] Added ${colNames[i]} column to dtr_records.`);
            }
        }
        // Create employee_registrations table if it doesn't exist
        await db_1.pool.query(`
      CREATE TABLE IF NOT EXISTS employee_registrations (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        full_name  VARCHAR(255) NOT NULL,
        email      VARCHAR(255) NOT NULL,
        message    TEXT NULL,
        status     ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    }
    catch (err) {
        console.error('[migration] Failed to run migrations:', err);
    }
}
app.use((0, cors_1.default)({ origin: '*' }));
app.use(express_1.default.json());
// Payroll system routes (MySQL)
app.use('/api/dtr', dtr_1.default);
app.use('/api/employees', employees_1.default);
app.use('/api/charges', charges_1.default);
app.use('/api/payroll-periods', payroll_periods_1.default);
app.use('/api/employee-registrations', registrations_1.default);
// Swagger / OpenAPI
app.get('/openapi.json', (_req, res) => res.json(openapi_1.openapiSpec));
app.use('/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(openapi_1.openapiSpec));
// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
runMigrations().then(() => {
    app.listen(PORT, () => {
        console.log(`Payroll backend running on http://localhost:${PORT}`);
        console.log(`Swagger docs:           http://localhost:${PORT}/docs`);
    });
});
