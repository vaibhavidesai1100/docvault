import { z } from 'zod';
import { DOCUMENT_CATEGORIES, ALLOWED_FILE_TYPES, PLAN_LIMITS } from '@/lib/constants';

export const uploadDocumentSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters long').max(100, 'Title cannot exceed 100 characters'),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional().default(''),
  category: z.enum(DOCUMENT_CATEGORIES, {
    errorMap: () => ({ message: 'Please select a valid document category' }),
  }),
});

export const updateDocumentSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters long').max(100, 'Title cannot exceed 100 characters'),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional().default(''),
  category: z.enum(DOCUMENT_CATEGORIES, {
    errorMap: () => ({ message: 'Please select a valid document category' }),
  }),
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;

