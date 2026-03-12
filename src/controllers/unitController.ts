// PATH: back-end/src/controllers/unitController.ts

import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { uploadFile } from '../lib/storage';

// GET all units
export const getUnits = async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('unit')
    .select('*, unit_image(*)')
    .eq('status', 'available')
    .order('is_featured', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
};

// GET single unit
export const getUnitById = async (req: Request, res: Response) => {
  const { unitId } = req.params;

  const { data, error } = await supabase
    .from('unit')
    .select('*, unit_image(*)')
    .eq('unit_id', unitId)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
};

// POST upload unit image
export const uploadUnitImage = async (req: Request, res: Response) => {
  const { unitId } = req.params;
  const { isMain = 0, sortOrder = 0 } = req.body;
  const file = req.file;

  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const path = `units/${unitId}/${Date.now()}.jpg`;
    const url = await uploadFile(
      'unit-images',
      path,
      file.buffer,
      file.mimetype
    );

    const { data, error } = await supabase
      .from('unit_image')
      .insert({
        unit_id: Number(unitId),
        image_url: url,
        is_main: Number(isMain),
        sort_order: Number(sortOrder),
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

// DELETE unit image
export const deleteUnitImage = async (req: Request, res: Response) => {
  const { imageId } = req.params;

  const { error } = await supabase
    .from('unit_image')
    .delete()
    .eq('image_id', imageId);

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ message: 'Image deleted' });
};