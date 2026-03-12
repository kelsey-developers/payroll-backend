// PATH: back-end/src/index.ts

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import dtrRoutes from './routes/dtr';
import payrollRoutes from './routes/payroll';
import unitRoutes from './routes/units';
import paymentRoutes from './routes/payments';
import employeeRoutes from './routes/employees';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/dtr', dtrRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/employees', employeeRoutes);

app.listen(process.env.PORT || 4000, () => {
  console.log(`Server running on port ${process.env.PORT || 4000}`);
});