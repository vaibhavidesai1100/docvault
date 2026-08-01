'use client';

import React, { useState, useEffect } from 'react';
import { DocumentItem, DOCUMENT_CATEGORIES } from '@/lib/constants';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { FileDropzone } from '@/components/shared/FileDropzone';
import { formatBytes, formatFileType } from '@/lib/utils';
import { toast } from 'sonner';

interface EditDocumentModalProps {
  isOpen: boolean;
  document: DocumentItem | null;
  onClose: () => void;
  onSuccess: (updatedDoc: DocumentItem) => void;
}

export function EditDocumentModal({
  isOpen,
  document,
  onClose,
  onSuccess,
}: EditDocumentModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('Other');
  const [description, setDescription] = useState('');
  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (document) {
      setTitle(document.title || '');
      setCategory(document.category || 'Other');
      setDescription(document.description || '');
      setReplacementFile(null);
    }
  }, [document]);

  if (!document) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Document title is required');
      return;
    }

    setIsSubmitting(true);
    try {
      let res: Response;
      if (replacementFile) {
        const formData = new FormData();
        formData.append('title', title.trim());
        formData.append('category', category);
        formData.append('description', description.trim());
        formData.append('file', replacementFile);

        res = await fetch(`/api/documents/${document.id}`, {
          method: 'PATCH',
          body: formData,
        });
      } else {
        res = await fetch(`/api/documents/${document.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            category,
            description: description.trim(),
          }),
        });
      }

      const data = await res.json();

      if (!res.ok || !data.document) {
        toast.error(data.error || 'Failed to update document');
        setIsSubmitting(false);
        return;
      }

      toast.success('Document updated successfully');
      setReplacementFile(null);
      onSuccess(data.document);
      onClose();
    } catch {
      toast.error('An unexpected error occurred while updating document');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Document"
      description="Update document details or upload a replacement file"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <Input
          label="Document Title *"
          placeholder="e.g. Q3 Financial Statement"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <Select
          label="Category *"
          options={DOCUMENT_CATEGORIES.map((c) => ({ label: c, value: c }))}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Description
          </label>
          <textarea
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Brief description about this file..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-slate-700">
              Replace File (Optional)
            </label>
            <span
              className="text-xs text-slate-500 font-medium truncate max-w-[220px]"
              title={document.file_path ? document.file_path.split('/').pop() || document.title : document.title}
            >
              Current: {document.file_path ? document.file_path.split('/').pop() || document.title : document.title} ({formatBytes(document.file_size)})
            </span>
          </div>
          <FileDropzone
            onFileSelect={(file) => setReplacementFile(file)}
            selectedFile={replacementFile}
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting} disabled={!title.trim() || isSubmitting}>
            Save Changes
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

