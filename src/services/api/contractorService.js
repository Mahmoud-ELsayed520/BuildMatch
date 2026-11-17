import { supabase } from '../supabase/client';
import { BUCKETS, storageService } from '../storage/storageService';

export const VERIFICATION_DOCUMENT_TYPES = ['commercial_register', 'tax_card', 'syndicate_id', 'id_card', 'insurance_certificate', 'other'];

export const contractorService = {
  async getMyProfile(userId) {
    const { data, error } = await supabase.from('contractor_profiles').select('*').eq('id', userId).maybeSingle();
    if (error) throw error;
    return data;
  },

  async getMyVerificationDocuments(userId) {
    const { data, error } = await supabase.from('verification_documents').select('*').eq('contractor_id', userId).order('uploaded_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async uploadVerificationDocument(userId, documentType, file) {
    if (!VERIFICATION_DOCUMENT_TYPES.includes(documentType)) throw new Error('Unsupported verification document type.');
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${userId}/${Date.now()}-${safeName}`;
    const stored = await storageService.uploadFile(BUCKETS.VERIFICATION_DOCS, path, file);
    const { data, error } = await supabase.from('verification_documents').insert({
      contractor_id: userId,
      document_type: documentType,
      file_path: stored.path,
      file_name: file.name,
      file_size_bytes: file.size,
      mime_type: file.type,
    }).select().single();
    if (error) {
      // This object was just uploaded by this caller and is covered by the owner delete policy.
      await storageService.deleteFile(BUCKETS.VERIFICATION_DOCS, stored.path).catch(() => {});
      throw error;
    }
    return data;
  },

  async getVerificationDocumentUrl(path) {
    return storageService.createSignedUrl(BUCKETS.VERIFICATION_DOCS, path, 300);
  },
};
