// PATH: back-end/src/lib/storage.ts

import { supabase } from './supabase';

export const uploadFile = async (
  bucket: string,
  path: string,
  file: Buffer,
  mimetype: string
): Promise<string> => {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: mimetype, upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};