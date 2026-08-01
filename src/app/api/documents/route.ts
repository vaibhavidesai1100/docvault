import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { uploadDocumentSchema } from '@/lib/validations/document';
import { PLAN_LIMITS, ALLOWED_FILE_TYPES, SubscriptionPlan } from '@/lib/constants';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('documents')
      .select('*, profiles(email, full_name)', { count: 'exact' });

    // Check if admin user querying all documents or regular user querying own
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      query = query.eq('owner_id', user.id);
    }

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    if (category && category !== 'All') {
      query = query.eq('category', category);
    }

    const { data: documents, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      documents: documents || [],
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user profile for plan validation
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_plan')
      .eq('id', user.id)
      .single();

    const plan = (profile?.subscription_plan || 'free') as SubscriptionPlan;
    const planLimit = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

    // 1. Server-side Pre-Check: Total Upload Count
    const { count: currentDocCount } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id);

    if ((currentDocCount || 0) >= planLimit.maxDocuments) {
      return NextResponse.json(
        {
          error: `You have reached your ${planLimit.name} plan limit of ${planLimit.maxDocuments} documents. Please upgrade to Pro for unlimited uploads!`,
        },
        { status: 403 }
      );
    }

    // Parse Form Data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string;
    const description = (formData.get('description') as string) || '';
    const category = formData.get('category') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate Metadata Schema
    const validationResult = uploadDocumentSchema.safeParse({ title, description, category });
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    // 2. Server-side Pre-Check: Unique Title per User
    const { data: existingDocs } = await supabase
      .from('documents')
      .select('id')
      .eq('owner_id', user.id)
      .ilike('title', title.trim())
      .limit(1);

    if (existingDocs && existingDocs.length > 0) {
      return NextResponse.json(
        {
          error: `A document with the title "${title.trim()}" already exists in your vault. Please use a unique title (e.g. "${title.trim()} v2").`,
        },
        { status: 400 }
      );
    }

    // 2. Server-side Pre-Check: File Size
    if (file.size > planLimit.maxSizeBytes) {
      return NextResponse.json(
        {
          error: `File size exceeds your ${planLimit.name} plan limit of ${planLimit.maxSizeLabel}. Upgrade to Pro for up to 100MB!`,
        },
        { status: 400 }
      );
    }

    // 3. Server-side Pre-Check: MIME type
    if (!ALLOWED_FILE_TYPES.includes(file.type as any)) {
      return NextResponse.json(
        { error: `Unsupported file type (${file.type}). Allowed formats: PDF, DOCX, JPG, PNG, WEBP.` },
        { status: 400 }
      );
    }

    const documentId = crypto.randomUUID();
    const fileExtension = file.name.split('.').pop() || '';
    const storagePath = `${user.id}/${documentId}/${file.name}`;

    // ArrayBuffer to Upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Supabase Storage Bucket
    const { error: storageError } = await supabase.storage
      .from('documents')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (storageError) {
      return NextResponse.json({ error: storageError.message }, { status: 500 });
    }

    // Insert Record into PostgreSQL
    const { data: docRecord, error: dbError } = await supabase
      .from('documents')
      .insert({
        id: documentId,
        owner_id: user.id,
        title: validationResult.data.title,
        description: validationResult.data.description,
        category: validationResult.data.category,
        file_path: storagePath,
        file_type: file.type,
        file_size: file.size,
      })
      .select()
      .single();

    if (dbError) {
      // Rollback storage file on DB error
      await supabase.storage.from('documents').remove([storagePath]);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ document: docRecord }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
