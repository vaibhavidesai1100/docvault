import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PLAN_LIMITS, ALLOWED_FILE_TYPES, SubscriptionPlan } from '@/lib/constants';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: document, error } = await supabase
      .from('documents')
      .select('*, profiles(email, full_name)')
      .eq('id', id)
      .single();

    if (error || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ document });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Retrieve document object path before deleting DB record
    const { data: document, error: fetchErr } = await supabase
      .from('documents')
      .select('file_path, owner_id')
      .eq('id', id)
      .single();

    if (fetchErr || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete DB record (RLS will enforce owner or admin)
    const { error: deleteDbErr } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (deleteDbErr) {
      return NextResponse.json({ error: deleteDbErr.message }, { status: 403 });
    }

    // Remove file object from storage
    if (document.file_path) {
      await supabase.storage.from('documents').remove([document.file_path]);
    }

    return NextResponse.json({ message: 'Document deleted successfully' });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: document, error: fetchErr } = await supabase
      .from('documents')
      .select('*, profiles(role)')
      .eq('id', id)
      .single();

    if (fetchErr || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, subscription_plan')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role === 'admin';
    if (document.owner_id !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden: You do not own this document' }, { status: 403 });
    }

    let title = '';
    let description = '';
    let category = '';
    let file: File | null = null;

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      title = (formData.get('title') as string) || '';
      description = (formData.get('description') as string) || '';
      category = (formData.get('category') as string) || '';
      const formFile = formData.get('file');
      if (formFile && formFile instanceof File && formFile.size > 0) {
        file = formFile;
      }
    } else {
      const body = await request.json();
      title = body.title || '';
      description = body.description || '';
      category = body.category || '';
    }

    const { updateDocumentSchema } = await import('@/lib/validations/document');
    const validationResult = updateDocumentSchema.safeParse({ title, description, category });

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const cleanTitle = validationResult.data.title.trim();
    const cleanDesc = validationResult.data.description?.trim() || '';
    const cleanCat = validationResult.data.category;

    if (cleanTitle.toLowerCase() !== document.title.trim().toLowerCase()) {
      const { data: existingDocs } = await supabase
        .from('documents')
        .select('id')
        .eq('owner_id', document.owner_id)
        .neq('id', id)
        .ilike('title', cleanTitle)
        .limit(1);

      if (existingDocs && existingDocs.length > 0) {
        return NextResponse.json(
          {
            error: `Another document with the title "${cleanTitle}" already exists in the vault.`,
          },
          { status: 400 }
        );
      }
    }

    const updatePayload: Record<string, any> = {
      title: cleanTitle,
      description: cleanDesc,
      category: cleanCat,
      updated_at: new Date().toISOString(),
    };

    // Process file replacement if provided
    if (file) {
      // Get owner's subscription plan for file size check
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('subscription_plan')
        .eq('id', document.owner_id)
        .single();

      const ownerPlan = (ownerProfile?.subscription_plan || 'free') as SubscriptionPlan;
      const planLimit = PLAN_LIMITS[ownerPlan] || PLAN_LIMITS.free;

      if (file.size > planLimit.maxSizeBytes) {
        return NextResponse.json(
          {
            error: `File size exceeds ${planLimit.name} plan limit of ${planLimit.maxSizeLabel}. Upgrade to Pro for up to 100MB!`,
          },
          { status: 400 }
        );
      }

      if (!ALLOWED_FILE_TYPES.includes(file.type as any)) {
        return NextResponse.json(
          { error: `Unsupported file type (${file.type}). Allowed formats: PDF, DOCX, JPG, PNG, WEBP.` },
          { status: 400 }
        );
      }

      const storagePath = `${document.owner_id}/${id}/${file.name}`;
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const { error: storageError } = await supabase.storage
        .from('documents')
        .upload(storagePath, buffer, {
          contentType: file.type,
          upsert: true,
        });

      if (storageError) {
        return NextResponse.json({ error: storageError.message }, { status: 500 });
      }

      // Cleanup old file from storage if path changed
      if (document.file_path && document.file_path !== storagePath) {
        await supabase.storage.from('documents').remove([document.file_path]);
      }

      updatePayload.file_path = storagePath;
      updatePayload.file_type = file.type;
      updatePayload.file_size = file.size;
    }

    const { data: updatedDoc, error: updateErr } = await supabase
      .from('documents')
      .update(updatePayload)
      .eq('id', id)
      .select('*, profiles(email, full_name)')
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ document: updatedDoc });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


