import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';

import dtrRoutes           from './routes/dtr';
import employeeRoutes      from './routes/employees';
import chargesRoutes       from './routes/charges';
import payrollPeriodRoutes from './routes/payroll-periods';
import { openapiSpec }     from './openapi';

dotenv.config();

const app  = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// Payroll system routes (MySQL)
app.use('/api/dtr',             dtrRoutes);
app.use('/api/employees',       employeeRoutes);
app.use('/api/charges',         chargesRoutes);
app.use('/api/payroll-periods', payrollPeriodRoutes);

// Swagger / OpenAPI
app.get('/openapi.json', (_req, res) => res.json(openapiSpec));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Payroll backend running on http://localhost:${PORT}`);
  console.log(`Swagger docs:           http://localhost:${PORT}/docs`);
});
