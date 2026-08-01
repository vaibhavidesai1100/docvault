-- 0002_rls_policies.sql: Row Level Security Policies for DocVault

-- Security Definer helper function to safely check admin role without recursive RLS lookups
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin(auth.uid()));

-- Enable RLS on documents table
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Documents RLS Policies
CREATE POLICY "Users can view own documents or Admin view all"
  ON public.documents FOR SELECT
  USING (auth.uid() = owner_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can insert own documents"
  ON public.documents FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own documents"
  ON public.documents FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own documents or Admin delete any"
  ON public.documents FOR DELETE
  USING (auth.uid() = owner_id OR public.is_admin(auth.uid()));

-- Supabase Storage bucket policy setup
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage object policies
CREATE POLICY "Users access own folder or Admin access all storage"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'documents' AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin(auth.uid())
    )
  );
