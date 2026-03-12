// PATH: back-end/src/controllers/paymentController.ts

import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { uploadFile } from '../lib/storage';

// GET payment by booking
export const getPaymentByBooking = async (req: Request, res: Response) => {
  const { bookingId } = req.params;

  const { data, error } = await supabase
    .from('payment')
    .select('*')
    .eq('booking_id', bookingId)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
};

// POST upload payment proof
export const uploadPaymentProof = async (req: Request, res: Response) => {
  const { bookingId } = req.params;
  const file = req.file;

  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const path = `payments/${bookingId}/${Date.now()}.jpg`;
    const url = await uploadFile(
      'payment-proofs',
      path,
      file.buffer,
      file.mimetype
    );

    const { data, error } = await supabase
      .from('payment')
      .update({
        proof_url: url,
        payment_status: 'submitted',
      })
      .eq('booking_id', bookingId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// PATCH verify payment (admin)
export const verifyPayment = async (req: Request, res: Response) => {
  const { paymentId } = req.params;
  const { verifiedByUserId, status } = req.body; // status: 'verified' | 'rejected'

  const { data, error } = await supabase
    .from('payment')
    .update({
      payment_status: status,
      verified_at: new Date().toISOString(),
      verified_by_user_id: verifiedByUserId,
    })
    .eq('payment_id', paymentId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
};