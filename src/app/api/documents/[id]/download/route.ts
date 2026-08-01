import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'download'; // 'download' | 'preview'

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch document details
    const { data: document, error: fetchErr } = await supabase
      .from('documents')
      .select('file_path, title, file_type, file_size')
      .eq('id', id)
      .single();

    if (fetchErr || !document) {
      return NextResponse.json({ error: 'Document not found or access denied' }, { status: 404 });
    }

    // Calculate download filename with proper extension
    let ext = '';
    if (document.file_path && document.file_path.includes('.')) {
      ext = '.' + document.file_path.split('.').pop();
    } else if (document.file_type) {
      const lower = document.file_type.toLowerCase();
      if (lower.includes('pdf')) ext = '.pdf';
      else if (lower.includes('wordprocessingml') || lower.includes('docx')) ext = '.docx';
      else if (lower.includes('jpeg') || lower.includes('jpg')) ext = '.jpg';
      else if (lower.includes('png')) ext = '.png';
      else if (lower.includes('webp')) ext = '.webp';
    }

    const cleanTitle = document.title.trim();
    const downloadFileName = ext && !cleanTitle.toLowerCase().endsWith(ext.toLowerCase())
      ? `${cleanTitle}${ext}`
      : cleanTitle;

    // Mode handling: 'preview' uses inline Content-Disposition, 'download' uses attachment header
    const options = mode === 'download' ? { download: downloadFileName } : undefined;
    const expiresInSeconds = mode === 'download' ? 60 : 300;

    const { data: signedData, error: signedErr } = await supabase.storage
      .from('documents')
      .createSignedUrl(document.file_path, expiresInSeconds, options);

    if (signedErr || !signedData?.signedUrl) {
      return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 });
    }

    return NextResponse.json({
      downloadUrl: signedData.signedUrl,
      fileName: downloadFileName,
      fileType: document.file_type,
      fileSize: document.file_size,
      title: document.title,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
