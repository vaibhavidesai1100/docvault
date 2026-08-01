'use client';

import React, { useState, useEffect } from 'react';
import * as mammoth from 'mammoth';
import { DocumentItem } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader } from '@/components/shared/Loader';
import { formatBytes, formatFileType } from '@/lib/utils';
import {
  X,
  Download,
  FileText,
  FileCode,
  Image as ImageIcon,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';

interface DocumentViewerModalProps {
  isOpen: boolean;
  document: DocumentItem | null;
  onClose: () => void;
}

export function DocumentViewerModal({
  isOpen,
  document,
  onClose,
}: DocumentViewerModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [renderingDocx, setRenderingDocx] = useState(false);
  const [downloadFileName, setDownloadFileName] = useState<string>('');

  useEffect(() => {
    if (!isOpen || !document) {
      setPreviewUrl(null);
      setDocxHtml(null);
      return;
    }

    const doc = document;

    async function loadPreviewUrl() {
      setLoading(true);
      setDocxHtml(null);
      try {
        // Fetch inline preview URL (mode=preview ensures Content-Disposition: inline)
        const res = await fetch(`/api/documents/${doc.id}/download?mode=preview`);
        const data = await res.json();

        if (res.ok && data.downloadUrl) {
          setPreviewUrl(data.downloadUrl);
          setDownloadFileName(data.fileName || doc.title);

          // If file is DOCX, parse binary ArrayBuffer with mammoth to HTML
          const fileTypeLower = doc.file_type.toLowerCase();
          const isDocx =
            fileTypeLower.includes('wordprocessingml') ||
            fileTypeLower.includes('docx') ||
            fileTypeLower.includes('msword') ||
            doc.file_path.toLowerCase().endsWith('.docx');

          if (isDocx) {
            setRenderingDocx(true);
            try {
              const fileRes = await fetch(data.downloadUrl);
              const arrayBuffer = await fileRes.arrayBuffer();
              const result = await mammoth.convertToHtml({ arrayBuffer });
              setDocxHtml(result.value || '<p>Empty document content.</p>');
            } catch (err) {
              console.error('Docx rendering error:', err);
              setDocxHtml(null);
            } finally {
              setRenderingDocx(false);
            }
          }
        } else {
          toast.error(data.error || 'Failed to load preview');
        }
      } catch {
        toast.error('An error occurred loading document preview');
      } finally {
        setLoading(false);
      }
    }

    loadPreviewUrl();
  }, [isOpen, document]);

  if (!isOpen || !document) return null;

  const handleDownload = async () => {
    if (!document) return;
    try {
      toast.loading(`Generating download...`, { id: 'modal-dl' });
      const res = await fetch(`/api/documents/${document.id}/download?mode=download`);
      const data = await res.json();

      if (!res.ok || !data.downloadUrl) {
        toast.error('Failed to download document', { id: 'modal-dl' });
        return;
      }

      toast.success('Downloading...', { id: 'modal-dl' });
      const link = window.document.createElement('a');
      link.href = data.downloadUrl;
      link.download = data.fileName || downloadFileName || document.title;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    } catch {
      toast.error('Download failed', { id: 'modal-dl' });
    }
  };

  const fileTypeLower = document.file_type.toLowerCase();
  const isImage = fileTypeLower.includes('image');
  const isPdf = fileTypeLower.includes('pdf');
  const isDocx =
    fileTypeLower.includes('wordprocessingml') ||
    fileTypeLower.includes('docx') ||
    fileTypeLower.includes('msword') ||
    document.file_path.toLowerCase().endsWith('.docx');

  return (
    <div className="fixed -inset-10 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-center space-x-3 truncate">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 font-bold">
              {isImage ? <ImageIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
            </div>
            <div className="truncate space-y-0.5">
              <div className="flex items-center space-x-2 truncate">
                <h3 className="text-base font-bold text-slate-900 truncate">
                  {document.title}
                </h3>
                <Badge variant="brand">{document.category}</Badge>
                <Badge variant="default" className="hidden sm:inline-flex">
                  {formatFileType(document.file_type)}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-medium truncate max-w-md">
                {document.description ? `${document.description} • ` : ''}Size: {formatBytes(document.file_size)} • Encrypted Storage
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button size="sm" onClick={handleDownload} className="space-x-1.5 shadow-xs">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download</span>
            </Button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Content Viewer Body */}
        <div className="flex-1 bg-slate-900/5 p-4 sm:p-6 overflow-y-auto min-h-[400px] flex items-center justify-center">
          {loading || renderingDocx ? (
            <Loader label={renderingDocx ? 'Parsing & rendering DOCX document...' : 'Fetching secure document stream...'} />
          ) : isDocx && docxHtml ? (
            /* DOCX Rendered Paper Canvas View */
            <div className="w-full max-w-3xl bg-white p-8 sm:p-12 rounded-xl shadow-lg border border-slate-200 text-slate-800 space-y-4 font-serif text-sm leading-relaxed overflow-y-auto max-h-[70vh]">
              <div className="pb-4 mb-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-400 font-sans">
                <span className="font-semibold text-slate-600">{downloadFileName}</span>
                <span>Rendered Live Preview</span>
              </div>
              <div
                className="prose prose-slate max-w-none [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:text-slate-900 [&>h2]:text-xl [&>h2]:font-semibold [&>p]:mb-3 [&>ul]:list-disc [&>ul]:pl-5 [&>table]:w-full [&>table]:border-collapse [&>td]:border [&>td]:p-2"
                dangerouslySetInnerHTML={{ __html: docxHtml }}
              />
            </div>
          ) : previewUrl ? (
            isImage ? (
              <div className="flex flex-col items-center justify-center w-full">
                <img
                  src={previewUrl}
                  alt={document.title}
                  className="max-h-[68vh] w-auto rounded-xl shadow-lg border border-slate-200 object-contain bg-white"
                />
              </div>
            ) : isPdf ? (
              <div className="w-full h-[72vh] rounded-xl overflow-hidden shadow-inner border border-slate-300 bg-white">
                <iframe
                  src={previewUrl}
                  className="w-full h-full border-none"
                  title={document.title}
                />
              </div>
            ) : (
              <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-200 shadow-md text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <FileCode className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-lg font-bold text-slate-900">
                    {formatFileType(document.file_type)} File
                  </h4>
                  <p className="text-xs text-slate-500">
                    Document ready for download.
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1 text-left border border-slate-100 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Filename:</span>
                    <span className="text-slate-800 font-semibold truncate max-w-[200px]">
                      {downloadFileName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Size:</span>
                    <span className="text-slate-800 font-semibold">
                      {formatBytes(document.file_size)}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <Button onClick={handleDownload} className="w-full space-x-2">
                    <Download className="h-4 w-4" />
                    <span>Download Full File</span>
                  </Button>
                </div>
              </div>
            )
          ) : (
            <div className="text-center text-slate-500 space-y-2">
              <p className="text-sm">Unable to generate document preview link.</p>
              <Button size="sm" variant="outline" onClick={handleDownload}>
                Try Direct Download
              </Button>
            </div>
          )}
        </div>

        {/* Modal Footer Bar */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center space-x-1">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>256-bit Encrypted Document Vault</span>
          </span>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Close Viewer
          </Button>
        </div>
      </div>
    </div>
  );
}
