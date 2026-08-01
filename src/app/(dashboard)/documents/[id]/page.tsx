'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { DocumentItem } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader } from '@/components/shared/Loader';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { formatBytes, formatDate, formatFileType } from '@/lib/utils';
import {
  FileText,
  Download,
  Trash2,
  ArrowLeft,
  Calendar,
  HardDrive,
  Folder,
  User,
  Eye,
  FileCode,
  Image as ImageIcon,
} from 'lucide-react';
import { DocumentViewerModal } from '@/components/shared/DocumentViewerModal';
import { toast } from 'sonner';

export default function SingleDocumentPage() {
  const params = useParams();
  const router = useRouter();
  const docId = params.id as string;

  const [document, setDocument] = useState<DocumentItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  useEffect(() => {
    async function loadDoc() {
      try {
        const res = await fetch(`/api/documents/${docId}`);
        const data = await res.json();

        if (!res.ok || !data.document) {
          toast.error('Document not found');
          router.push('/documents');
          return;
        }

        setDocument(data.document);

        // Fetch signed preview URL (mode=preview ensures Content-Disposition: inline)
        setLoadingPreview(true);
        const downloadRes = await fetch(`/api/documents/${docId}/download?mode=preview`);
        const downloadData = await downloadRes.json();
        if (downloadRes.ok && downloadData.downloadUrl) {
          setPreviewUrl(downloadData.downloadUrl);
        }
      } catch {
        toast.error('Failed to load document details');
      } finally {
        setLoading(false);
        setLoadingPreview(false);
      }
    }
    if (docId) loadDoc();
  }, [docId, router]);

  const handleDownload = async () => {
    if (!document) return;
    try {
      toast.loading(`Generating download link...`, { id: 'download' });
      const res = await fetch(`/api/documents/${docId}/download?mode=download`);
      const data = await res.json();

      if (!res.ok || !data.downloadUrl) {
        toast.error(data.error || 'Failed to download document', { id: 'download' });
        return;
      }

      toast.success('Downloading...', { id: 'download' });
      const link = window.document.createElement('a');
      link.href = data.downloadUrl;
      link.download = data.fileName || document.title;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    } catch {
      toast.error('Download failed', { id: 'download' });
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to delete document');
        setIsDeleting(false);
        return;
      }

      toast.success('Document deleted successfully');
      router.push('/documents');
    } catch {
      toast.error('An error occurred during document deletion');
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <Loader label="Loading document details & preview..." fullPage />;
  }

  if (!document) return null;

  const isImage = document.file_type.toLowerCase().includes('image');
  const isPdf = document.file_type.toLowerCase().includes('pdf');

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/documents">
          <Button variant="ghost" size="sm" className="space-x-1">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Documents</span>
          </Button>
        </Link>

        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={() => setIsPreviewModalOpen(true)} className="space-x-2">
            <Eye className="h-4 w-4 text-brand-600" />
            <span>Open Interactive Preview</span>
          </Button>
          <Button onClick={handleDownload} className="space-x-2">
            <Download className="h-4 w-4" />
            <span>Download Signed File</span>
          </Button>
          <Button variant="destructive" onClick={() => setIsDeleteOpen(true)} className="space-x-2">
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start space-x-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white font-bold shadow-sm">
              {isImage ? (
                <ImageIcon className="h-6 w-6" />
              ) : (
                <FileText className="h-6 w-6" />
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <CardTitle className="text-2xl">{document.title}</CardTitle>
                <Badge variant="brand">{document.category}</Badge>
              </div>
              <CardDescription>
                {document.description || 'No description provided for this document.'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-4 border-t border-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
              <span className="text-xs text-slate-400 font-medium flex items-center space-x-1">
                <HardDrive className="h-3.5 w-3.5" />
                <span>File Size</span>
              </span>
              <p className="text-sm font-semibold text-slate-900 font-mono">
                {formatBytes(document.file_size)}
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
              <span className="text-xs text-slate-400 font-medium flex items-center space-x-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>Upload Date</span>
              </span>
              <p className="text-sm font-semibold text-slate-900">
                {formatDate(document.created_at)}
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
              <span className="text-xs text-slate-400 font-medium flex items-center space-x-1">
                <Folder className="h-3.5 w-3.5" />
                <span>File Type</span>
              </span>
              <p className="text-sm font-semibold text-slate-900 truncate">
                {formatFileType(document.file_type)}
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1">
              <span className="text-xs text-slate-400 font-medium flex items-center space-x-1">
                <User className="h-3.5 w-3.5" />
                <span>Uploaded By</span>
              </span>
              <p className="text-sm font-semibold text-slate-900 truncate">
                {document.profiles?.full_name || document.profiles?.email || 'Self'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DOCUMENT PREVIEW SECTION */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <Eye className="h-5 w-5 text-brand-600" />
            <CardTitle className="text-lg">Document Live Preview</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loadingPreview ? (
            <div className="h-48 flex items-center justify-center">
              <Loader label="Loading file preview..." />
            </div>
          ) : previewUrl ? (
            isImage ? (
              <div className="flex justify-center p-4 bg-slate-900/5 rounded-xl border border-slate-200">
                <img
                  src={previewUrl}
                  alt={document.title}
                  className="max-h-[500px] w-auto rounded-lg shadow-sm object-contain"
                />
              </div>
            ) : isPdf ? (
              <div className="w-full rounded-xl overflow-hidden border border-slate-200 shadow-xs">
                <iframe
                  src={previewUrl}
                  className="w-full h-[650px] bg-slate-100"
                  title={document.title}
                />
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  <FileCode className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatFileType(document.file_type)} Preview
                  </p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    Direct iframe preview is optimized for PDF and Image files. Click the button below to download and view the full {formatFileType(document.file_type)} file.
                  </p>
                </div>
                <Button onClick={handleDownload} variant="outline" size="sm" className="space-x-2">
                  <Download className="h-4 w-4" />
                  <span>Download Document File</span>
                </Button>
              </div>
            )
          ) : (
            <div className="p-6 text-center text-sm text-slate-500">
              Unable to load live preview link. Use the Download button above.
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        title="Delete Document"
        description={`Are you sure you want to delete "${document.title}"? This cannot be undone.`}
        confirmText="Delete Document"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onClose={() => setIsDeleteOpen(false)}
      />

      <DocumentViewerModal
        isOpen={isPreviewModalOpen}
        document={document}
        onClose={() => setIsPreviewModalOpen(false)}
      />
    </div>
  );
}
