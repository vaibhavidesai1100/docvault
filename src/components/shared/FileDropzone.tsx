'use client';

import React, { useRef, useState } from 'react';
import { UploadCloud, File, X, AlertCircle } from 'lucide-react';
import { ALLOWED_FILE_EXTENSIONS, PLAN_LIMITS, SubscriptionPlan } from '@/lib/constants';
import { formatBytes, cn } from '@/lib/utils';

interface FileDropzoneProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  subscriptionPlan?: SubscriptionPlan;
  disabled?: boolean;
}

export function FileDropzone({
  onFileSelect,
  selectedFile,
  subscriptionPlan = 'free',
  disabled = false,
}: FileDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const planLimit = PLAN_LIMITS[subscriptionPlan] || PLAN_LIMITS.free;

  const validateAndSetFile = (file: File | null) => {
    setErrorMsg(null);
    if (!file) {
      onFileSelect(null);
      return;
    }

    // Check file size
    if (file.size > planLimit.maxSizeBytes) {
      const err = `File size (${formatBytes(file.size)}) exceeds your ${planLimit.name} plan limit of ${planLimit.maxSizeLabel}. Upgrade to Pro for up to 100MB!`;
      setErrorMsg(err);
      onFileSelect(null);
      return;
    }

    // Check extension
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_FILE_EXTENSIONS.includes(ext as any)) {
      const err = `Unsupported file type (${ext}). Allowed formats: PDF, DOCX, JPG, PNG, WEBP.`;
      setErrorMsg(err);
      onFileSelect(null);
      return;
    }

    onFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-2">
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            validateAndSetFile(e.target.files[0]);
          }
        }}
        accept=".pdf,.docx,.jpg,.jpeg,.png,.webp"
        className="hidden"
      />

      {selectedFile ? (
        <div className="flex items-center justify-between p-3 rounded-lg border border-brand-200 bg-brand-50/50 text-slate-800">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white font-medium text-xs">
              <File className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate text-slate-900">{selectedFile.name}</p>
              <p className="text-xs text-slate-500">{formatBytes(selectedFile.size)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => validateAndSetFile(null)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={cn(
            'flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors text-center',
            isDragOver ? 'border-brand-500 bg-brand-50/50' : 'border-slate-300 hover:border-brand-400 bg-slate-50/50',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 mb-2">
            <UploadCloud className="h-5 w-5 text-brand-600" />
          </div>
          <p className="text-sm font-semibold text-slate-900">
            Click to upload <span className="font-normal text-slate-500">or drag & drop</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">
            PDF, DOCX, JPG, PNG, WEBP (Max {planLimit.maxSizeLabel} on {planLimit.name} Plan)
          </p>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center space-x-2 text-xs text-rose-600 font-medium pt-1">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
