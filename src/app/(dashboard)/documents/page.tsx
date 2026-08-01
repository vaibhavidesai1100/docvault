'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { DocumentItem, DOCUMENT_CATEGORIES, UserProfile, PLAN_LIMITS, SubscriptionPlan } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Loader } from '@/components/shared/Loader';
import { EmptyState } from '@/components/shared/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { FileDropzone } from '@/components/shared/FileDropzone';
import { Pagination } from '@/components/shared/Pagination';
import { formatBytes, formatDate } from '@/lib/utils';
import {
  Upload,
  Search,
  FileText,
  Download,
  Trash2,
  Eye,
  Filter,
  ArrowUpDown,
  Plus,
  AlertTriangle,
  Sparkles,
  Pencil,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DocumentViewerModal } from '@/components/shared/DocumentViewerModal';
import { EditDocumentModal } from '@/components/shared/EditDocumentModal';
import { toast } from 'sonner';

export default function DocumentsPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalDocs, setTotalDocs] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Preview, Edit & Upload Modal State
  const [viewingDoc, setViewingDoc] = useState<DocumentItem | null>(null);
  const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Other');
  const [uploadDescription, setUploadDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Delete Confirm Dialog State
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const supabase = createClient();

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: '8',
        search: searchQuery,
        category: selectedCategory,
      });

      const res = await fetch(`/api/documents?${queryParams.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to fetch documents');
        return;
      }

      setDocuments(data.documents || []);
      setTotalDocs(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      toast.error('An error occurred while loading documents');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, selectedCategory]);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (data) {
          if (data.role === 'admin') {
            router.push('/admin/documents');
            return;
          }
          setUserProfile(data as UserProfile);
        }
      }
    }
    loadUser();
  }, [supabase]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Upload Handler
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error('Please select a file to upload');
      return;
    }
    if (!uploadTitle.trim()) {
      toast.error('Please enter a document title');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('title', uploadTitle.trim());
      formData.append('category', uploadCategory);
      formData.append('description', uploadDescription.trim());

      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Upload failed');
        setIsUploading(false);
        return;
      }

      toast.success('Document uploaded successfully!');
      setIsUploadOpen(false);
      setUploadFile(null);
      setUploadTitle('');
      setUploadDescription('');
      setUploadCategory('Other');
      fetchDocuments();
    } catch {
      toast.error('An error occurred during file upload');
    } finally {
      setIsUploading(false);
    }
  };

  // Signed Download Handler
  const handleDownload = async (docId: string, title: string) => {
    try {
      toast.loading(`Generating download link for "${title}"...`, { id: 'download' });
      const res = await fetch(`/api/documents/${docId}/download`);
      const data = await res.json();

      if (!res.ok || !data.downloadUrl) {
        toast.error(data.error || 'Failed to download document', { id: 'download' });
        return;
      }

      toast.success('Downloading...', { id: 'download' });
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = data.fileName || title;
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

      toast.success('Document deleted');
      setDeletingDocId(null);
      fetchDocuments();
    } catch {
      toast.error('An error occurred while deleting document');
    } finally {
      setIsDeleting(false);
    }
  };

  const userPlan = (userProfile?.subscription_plan || 'free') as SubscriptionPlan;
  const planLimit = PLAN_LIMITS[userPlan];

  return (
    <div className="space-y-6">
      {/* Top Header & Upload Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Documents</h1>
          <p className="text-slate-500 text-sm">
            Upload, organize, and securely download your business files
          </p>
        </div>
        <Button onClick={() => setIsUploadOpen(true)} className="space-x-2">
          <Plus className="h-4 w-4" />
          <span>Upload Document</span>
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative w-full md:flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
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

      {/* Document List / Grid Table */}
      {loading ? (
        <Loader label="Fetching documents..." fullPage />
      ) : documents.length === 0 ? (
        <EmptyState
          title="No documents found"
          description={
            searchQuery || selectedCategory !== 'All'
              ? 'No documents match your filter parameters. Try clearing your search.'
              : 'Upload your first PDF, DOCX, or Image file to get started.'
          }
          actionLabel={searchQuery || selectedCategory !== 'All' ? 'Clear Filters' : 'Upload Document'}
          onAction={() => {
            if (searchQuery || selectedCategory !== 'All') {
              setSearchQuery('');
              setSelectedCategory('All');
            } else {
              setIsUploadOpen(true);
            }
          }}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Document Title</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">File Size</th>
                  <th className="px-6 py-3">Date Uploaded</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <Link
                            href={`/documents/${doc.id}`}
                            className="font-semibold text-slate-900 hover:text-brand-600 transition-colors"
                          >
                            {doc.title}
                          </Link>
                          {doc.description && (
                            <p className="text-xs text-slate-400 line-clamp-1">{doc.description}</p>
                          )}
                        </div>
                      </div>
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
                          <Eye className="h-4 w-4 text-brand-600 hover:text-brand-700" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit Document Details"
                          onClick={() => setEditingDoc(doc)}
                        >
                          <Pencil className="h-4 w-4 text-slate-600 hover:text-slate-900" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Signed Download"
                          onClick={() => handleDownload(doc.id, doc.title)}
                        >
                          <Download className="h-4 w-4 text-brand-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete"
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
            itemsPerPage={8}
          />
        </Card>
      )}

      {/* Upload Dialog Modal */}
      <Dialog
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Upload Document"
        description={`Current plan: ${planLimit.name} (Max ${planLimit.maxSizeLabel} per file)`}
      >
        {userPlan === 'free' && totalDocs >= 5 ? (
          <div className="space-y-4 pt-2">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-amber-900">
                    Free Plan Limit Reached (5/5 Documents)
                  </h4>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    You have reached the maximum 5 document limit on your Free plan. Upgrade to the Pro Plan for unlimited document storage and up to 100MB file uploads!
                  </p>
                </div>
              </div>

              <Button
                type="button"
                onClick={async () => {
                  try {
                    toast.loading('Redirecting to Stripe Checkout...', { id: 'stripe-modal' });
                    const res = await fetch('/api/stripe/checkout', { method: 'POST' });
                    const data = await res.json();
                    if (!res.ok || !data.url) {
                      toast.error(data.error || 'Failed to initiate checkout', { id: 'stripe-modal' });
                      return;
                    }
                    window.location.href = data.url;
                  } catch {
                    toast.error('Stripe Checkout error', { id: 'stripe-modal' });
                  }
                }}
                className="w-full bg-brand-600 space-x-2 text-sm shadow-xs"
              >
                <Sparkles className="h-4 w-4" />
                <span>Upgrade to Pro ($19/mo)</span>
              </Button>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUploadOpen(false)}
              >
                Close Window
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleUploadSubmit} className="space-y-4 pt-2">
            <Input
              label="Document Title *"
              placeholder="e.g. Q3 Financial Statement"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              required
            />

            <Select
              label="Category *"
              options={DOCUMENT_CATEGORIES.map((c) => ({ label: c, value: c }))}
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value)}
            />

            <Input
              label="Description (Optional)"
              placeholder="Brief notes about this file..."
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Select File *
              </label>
              <FileDropzone
                onFileSelect={(file) => {
                  setUploadFile(file);
                  if (file && !uploadTitle) {
                    // Auto-fill title from filename
                    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                    setUploadTitle(baseName);
                  }
                }}
                selectedFile={uploadFile}
                subscriptionPlan={userPlan}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUploadOpen(false)}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={isUploading}
                disabled={!uploadTitle.trim() || !uploadFile || isUploading}
              >
                Upload File
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingDocId}
        title="Delete Document"
        description="Are you sure you want to delete this document? This action permanently removes the file from storage."
        confirmText="Delete Document"
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

      {/* Document Details Edit Modal */}
      <EditDocumentModal
        isOpen={!!editingDoc}
        document={editingDoc}
        onClose={() => setEditingDoc(null)}
        onSuccess={() => {
          setEditingDoc(null);
          fetchDocuments();
        }}
      />
    </div>
  );
}
