'use client';

/**
 * GigWheels - File Upload Component
 * Weekly car rentals for gig drivers
 *
 * Drag-and-drop file upload with progress indicator and preview.
 */

import { useState, useRef, useCallback, DragEvent, ChangeEvent, ReactNode } from 'react';
import { clsx } from 'clsx';

// File validation
interface FileValidation {
  maxSize?: number; // in bytes
  acceptedTypes?: string[]; // MIME types
  maxFiles?: number;
}

// Upload state
export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export interface UploadedFile {
  file: File;
  id: string;
  progress: number;
  status: UploadStatus;
  error?: string;
  preview?: string;
}

// Component props
export interface FileUploadProps {
  onUpload: (files: File[]) => Promise<void> | void;
  validation?: FileValidation;
  multiple?: boolean;
  disabled?: boolean;
  label?: string;
  hint?: string;
  accept?: string;
  showPreview?: boolean;
  className?: string;
  children?: ReactNode;
  // External state control
  files?: UploadedFile[];
  onFilesChange?: (files: UploadedFile[]) => void;
}

// Default validation
const defaultValidation: FileValidation = {
  maxSize: 10 * 1024 * 1024, // 10MB
  acceptedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  maxFiles: 5,
};

// Format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Generate unique ID
const generateId = () => `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Get file icon based on type
const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) {
    return (
      <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  }
  if (type === 'application/pdf') {
    return (
      <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    );
  }
  return (
    <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
};

/**
 * Progress bar component
 */
const ProgressBar = ({ progress }: { progress: number }) => (
  <div className="w-full bg-gray-200 rounded-full h-2">
    <div
      className="bg-gold h-2 rounded-full transition-all duration-300"
      style={{ width: `${progress}%` }}
    />
  </div>
);

/**
 * File item component
 */
const FileItem = ({
  file,
  onRemove,
  showPreview,
}: {
  file: UploadedFile;
  onRemove: (id: string) => void;
  showPreview: boolean;
}) => {
  return (
    <div
      className={clsx(
        'flex items-center gap-3 p-3 bg-white border rounded-lg',
        file.status === 'error' && 'border-red-300 bg-red-50',
        file.status === 'success' && 'border-green-300 bg-green-50'
      )}
    >
      {/* Preview or Icon */}
      <div className="flex-shrink-0">
        {showPreview && file.preview ? (
          <img
            src={file.preview}
            alt={file.file.name}
            className="w-12 h-12 object-cover rounded"
          />
        ) : (
          getFileIcon(file.file.type)
        )}
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {file.file.name}
        </p>
        <p className="text-xs text-gray-500">
          {formatFileSize(file.file.size)}
        </p>

        {/* Progress or status */}
        {file.status === 'uploading' && (
          <div className="mt-1">
            <ProgressBar progress={file.progress} />
          </div>
        )}
        {file.status === 'error' && file.error && (
          <p className="mt-1 text-xs text-red-600">{file.error}</p>
        )}
        {file.status === 'success' && (
          <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Uploaded
          </p>
        )}
      </div>

      {/* Remove button */}
      <button
        type="button"
        onClick={() => onRemove(file.id)}
        className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Remove file"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

/**
 * Main FileUpload component
 */
export function FileUpload({
  onUpload,
  validation = defaultValidation,
  multiple = false,
  disabled = false,
  label,
  hint,
  accept,
  showPreview = true,
  className,
  children,
  files: externalFiles,
  onFilesChange,
}: FileUploadProps) {
  const [internalFiles, setInternalFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use external or internal files
  const files = externalFiles ?? internalFiles;

  // Merge validation with defaults
  const mergedValidation = { ...defaultValidation, ...validation };

  // Validate a file
  const validateFile = useCallback(
    (file: File): string | null => {
      if (mergedValidation.maxSize && file.size > mergedValidation.maxSize) {
        return `File size exceeds ${formatFileSize(mergedValidation.maxSize)}`;
      }
      if (
        mergedValidation.acceptedTypes &&
        !mergedValidation.acceptedTypes.includes(file.type)
      ) {
        return `File type "${file.type}" is not accepted`;
      }
      return null;
    },
    [mergedValidation]
  );

  // Create preview for images
  const createPreview = useCallback((file: File): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(undefined);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(file);
    });
  }, []);

  // Helper to update files (handles both internal state and external callback)
  const updateFiles = useCallback(
    (updater: (prev: UploadedFile[]) => UploadedFile[]) => {
      if (onFilesChange) {
        // External control: compute new value and pass array
        onFilesChange(updater(externalFiles ?? []));
      } else {
        // Internal control: use functional update
        setInternalFiles(updater);
      }
    },
    [onFilesChange, externalFiles]
  );

  // Process selected files
  const processFiles = useCallback(
    async (selectedFiles: FileList | File[]) => {
      const fileArray = Array.from(selectedFiles);

      // Check max files
      if (mergedValidation.maxFiles) {
        const totalFiles = files.length + fileArray.length;
        if (totalFiles > mergedValidation.maxFiles) {
          alert(`Maximum ${mergedValidation.maxFiles} files allowed`);
          return;
        }
      }

      // Process each file
      const newFiles: UploadedFile[] = await Promise.all(
        fileArray.map(async (file) => {
          const error = validateFile(file);
          const preview = showPreview ? await createPreview(file) : undefined;
          return {
            file,
            id: generateId(),
            progress: 0,
            status: error ? 'error' : 'idle' as UploadStatus,
            error: error ?? undefined,
            preview,
          };
        })
      );

      // Update files
      updateFiles((prev) => [...prev, ...newFiles]);

      // Upload valid files
      const validFiles = newFiles.filter((f) => f.status !== 'error');
      if (validFiles.length > 0) {
        // Update status to uploading
        updateFiles((prev) =>
          prev.map((f) =>
            validFiles.some((vf) => vf.id === f.id)
              ? { ...f, status: 'uploading' as UploadStatus }
              : f
          )
        );

        try {
          await onUpload(validFiles.map((f) => f.file));

          // Update status to success
          updateFiles((prev) =>
            prev.map((f) =>
              validFiles.some((vf) => vf.id === f.id)
                ? { ...f, status: 'success' as UploadStatus, progress: 100 }
                : f
            )
          );
        } catch (error) {
          // Update status to error
          updateFiles((prev) =>
            prev.map((f) =>
              validFiles.some((vf) => vf.id === f.id)
                ? {
                    ...f,
                    status: 'error' as UploadStatus,
                    error: error instanceof Error ? error.message : 'Upload failed',
                  }
                : f
            )
          );
        }
      }
    },
    [files, mergedValidation, validateFile, createPreview, showPreview, updateFiles, onUpload]
  );

  // Handle file input change
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
        e.target.value = ''; // Reset input
      }
    },
    [processFiles]
  );

  // Handle drag events
  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const droppedFiles = e.dataTransfer.files;
      if (droppedFiles.length > 0) {
        processFiles(droppedFiles);
      }
    },
    [disabled, processFiles]
  );

  // Remove a file
  const handleRemove = useCallback(
    (id: string) => {
      updateFiles((prev) => prev.filter((f) => f.id !== id));
    },
    [updateFiles]
  );

  // Click to open file dialog
  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  // Build accept string
  const acceptString =
    accept || mergedValidation.acceptedTypes?.join(',') || '*/*';

  return (
    <div className={clsx('w-full', className)}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}

      {/* Drop zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={disabled ? undefined : handleClick}
        className={clsx(
          'relative border-2 border-dashed rounded-xl p-6 text-center transition-colors',
          isDragging
            ? 'border-gold bg-gold/5'
            : 'border-gray-300 hover:border-gold',
          disabled
            ? 'cursor-not-allowed opacity-50'
            : 'cursor-pointer'
        )}
      >
        {/* Hidden input */}
        <input
          ref={inputRef}
          type="file"
          onChange={handleChange}
          accept={acceptString}
          multiple={multiple}
          disabled={disabled}
          className="hidden"
        />

        {/* Default content or custom children */}
        {children || (
          <>
            <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <p className="text-gray-600 mb-2">
              {isDragging
                ? 'Drop files here...'
                : 'Drag and drop files here, or click to browse'}
            </p>
            {hint && <p className="text-xs text-gray-400">{hint}</p>}
          </>
        )}
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file) => (
            <FileItem
              key={file.id}
              file={file}
              onRemove={handleRemove}
              showPreview={showPreview}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default FileUpload;
