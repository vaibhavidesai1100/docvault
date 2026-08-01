'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DocumentItem, DOCUMENT_CATEGORIES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader } from '@/components/shared/Loader';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Pagination } from '@/components/shared/Pagination';
import { formatBytes, formatDate } from '@/lib/utils';
import {
  FileText,
  Download,
  Trash2,
  Search,
  RefreshCw,
  Eye,
  ShieldAlert,
} from 'lucide-react';
import { DocumentViewerModal } from '@/components/shared/DocumentViewerModal';
import { toast } from 'sonner';

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalDocs, setTotalDocs] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Preview & Delete State
  const [viewingDoc, setViewingDoc] = useState<DocumentItem | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchGlobalDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        search: searchQuery,
        category: selectedCategory,
      });

      const res = await fetch(`/api/documents?${queryParams.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to fetch global document repository');
        return;
      }

      setDocuments(data.documents || []);
      setTotalDocs(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      toast.error('An error occurred while fetching global documents');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, selectedCategory]);

  useEffect(() => {
    fetchGlobalDocuments();
  }, [fetchGlobalDocuments]);

  // Signed Download
  const handleDownload = async (docId: string, title: string) => {
    try {
      toast.loading(`Generating download link...`, { id: 'download' });
      const res = await fetch(`/api/documents/${docId}/download`);
      const data = await res.json();

      if (!res.ok || !data.downloadUrl) {
        toast.error(data.error || 'Failed to download document', { id: 'download' });
        return;
      }

      toast.success('Downloading...', { id: 'download' });
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      toast.error('Download failed', { id: 'download' });
    }
  };

  // Delete Handler
  const handleDeleteConfirm = async () => {
    if (!deletingDocId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/documents/${deletingDocId}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to delete document');
        setIsDeleting(false);
        return;
      }

      toast.success('Document deleted by admin override');
      setDeletingDocId(null);
      fetchGlobalDocuments();
    } catch {
      toast.error('An error occurred while deleting document');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Global Documents</h1>
          <p className="text-slate-500 text-sm">
            Administrative view of all documents uploaded across all system users
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchGlobalDocuments} className="space-x-2">
          <RefreshCw className="h-4 w-4 text-slate-500" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative w-full md:flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search all documents by title..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="w-full md:w-48">
            <Select
              options={[
                { label: 'All Categories', value: 'All' },
                ...DOCUMENT_CATEGORIES.map((c) => ({ label: c, value: c })),
              ]}
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      </Card>

      {loading ? (
        <Loader label="Loading global documents..." fullPage />
      ) : documents.length === 0 ? (
        <EmptyState
          title="No system documents"
          description="No uploaded files exist matching your query parameters."
          icon={ShieldAlert}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-purple-50/50 border-b border-slate-200 text-xs font-semibold text-purple-900 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Title</th>
                  <th className="px-6 py-3">Uploader Email</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">File Size</th>
                  <th className="px-6 py-3">Date Uploaded</th>
                  <th className="px-6 py-3 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <Link
                            href={`/documents/${doc.id}`}
                            className="font-semibold text-slate-900 hover:text-purple-600 transition-colors"
                          >
                            {doc.title}
                          </Link>
                          {doc.description && (
                            <p className="text-xs text-slate-400 line-clamp-1">{doc.description}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 font-mono text-xs text-slate-700">
                      {doc.profiles?.email || doc.owner_id}
                    </td>

                    <td className="px-6 py-4">
                      <Badge variant="brand">{doc.category}</Badge>
                    </td>

                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      {formatBytes(doc.file_size)}
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-500">
                      {formatDate(doc.created_at)}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Quick View & Preview"
                          onClick={() => setViewingDoc(doc)}
                        >
                          <Eye className="h-4 w-4 text-purple-600 hover:text-purple-700" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Download"
                          onClick={() => handleDownload(doc.id, doc.title)}
                        >
                          <Download className="h-4 w-4 text-purple-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Admin Delete"
                          onClick={() => setDeletingDocId(doc.id)}
                        >
                          <Trash2 className="h-4 w-4 text-rose-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => setCurrentPage(page)}
            totalItems={totalDocs}
            itemsPerPage={10}
          />
        </Card>
      )}

      {/* Delete Confirm Modal */}
      <ConfirmDialog
        isOpen={!!deletingDocId}
        title="Admin Delete Document"
        description="Are you sure you want to delete this document as an Admin override? This permanently removes the object from storage."
        confirmText="Admin Delete"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeletingDocId(null)}
      />

      {/* Instant Inline Document Preview Modal */}
      <DocumentViewerModal
        isOpen={!!viewingDoc}
        document={viewingDoc}
        onClose={() => setViewingDoc(null)}
      />
    </div>
  );
}
