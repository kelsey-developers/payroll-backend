// PATH: back-end/src/routes/payments.ts

import express from 'express';
import multer from 'multer';
import {
  getPaymentByBooking,
  uploadPaymentProof,
  verifyPayment,
} from '../controllers/paymentController';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/booking/:bookingId', getPaymentByBooking);
router.post('/booking/:bookingId/proof', upload.single('proof'), uploadPaymentProof);
router.patch('/:paymentId/verify', verifyPayment);

export default router;