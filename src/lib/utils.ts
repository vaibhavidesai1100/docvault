import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatFileType(mimeType: string): string {
  if (!mimeType) return 'File';
  const lower = mimeType.toLowerCase();
  if (lower.includes('pdf')) return 'PDF Document';
  if (lower.includes('wordprocessingml') || lower.includes('docx') || lower.includes('msword')) return 'DOCX Document';
  if (lower.includes('jpeg') || lower.includes('jpg')) return 'JPEG Image';
  if (lower.includes('png')) return 'PNG Image';
  if (lower.includes('webp')) return 'WEBP Image';
  
  // Fallback cleanly formatted
  const parts = mimeType.split('/');
  return parts[1] ? parts[1].toUpperCase() : mimeType;
}
