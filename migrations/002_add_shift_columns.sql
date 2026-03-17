-- Add shift schedule columns to dtr_records
ALTER TABLE dtr_records
  ADD COLUMN shift_start TIME NULL AFTER status,
  ADD COLUMN shift_end   TIME NULL AFTER shift_start;
