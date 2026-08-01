export const PLAN_LIMITS = {
  free: {
    name: 'Free',
    maxDocuments: 5,
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    maxSizeLabel: '10 MB',
  },
  pro: {
    name: 'Pro',
    maxDocuments: Infinity,
    maxSizeBytes: 100 * 1024 * 1024, // 100MB
    maxSizeLabel: '100 MB',
  },
} as const;

export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.docx', '.jpg', '.jpeg', '.png', '.webp'] as const;

export const DOCUMENT_CATEGORIES = [
  'Financial',
  'Legal',
  'Technical',
  'Personal',
  'Business',
  'Other',
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];
export type UserRole = 'user' | 'admin';
export type SubscriptionPlan = 'free' | 'pro';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  subscription_plan: SubscriptionPlan;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
}

export interface DocumentItem {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  category: DocumentCategory;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
  updated_at: string;
  profiles?: Partial<UserProfile>;
}
