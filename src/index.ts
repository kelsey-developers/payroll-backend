import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import dtrRoutes from './routes/dtr';
import payrollRoutes from './routes/payroll';
import employeeRoutes from './routes/employees';

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// Routes
app.use('/api/dtr', dtrRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/employees', employeeRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
