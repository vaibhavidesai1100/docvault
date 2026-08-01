import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
