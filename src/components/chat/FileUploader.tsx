import { useState, useRef, useEffect } from 'react';
import { Upload, X, FileIcon, AlertCircle, Trash2 } from 'lucide-react';

interface FileUploaderProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
  onDelete: (fileId: string) => void;
  uploadedFiles: {
    [key: string]: {
      name: string;
      size: number;
      mimeType: string;
      timestamp: number;
    };
  };
  maxTotalFiles: number;
  maxTotalSize: number;
  fileExpiryTime: number;
}

const SUPPORTED_FILE_TYPES = {
  'image/*': 'Images (jpg, png, gif, etc.)',
  'audio/*': 'Audio files',
  'video/*': 'Video files',
  '.pdf': 'PDF documents',
  '.csv': 'CSV files',
  '.py': 'Python files',
  '.ipynb': 'Jupyter notebooks'
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function getTimeLeft(timestamp: number, expiryTime: number): string {
  const timeLeft = timestamp + expiryTime - Date.now();
  const minutes = Math.floor(timeLeft / 60000);
  return minutes > 0 ? `${minutes} min${minutes > 1 ? 's' : ''} left` : 'expiring soon';
}

export function FileUploader({ 
  isOpen, 
  onClose, 
  onUpload, 
  onDelete,
  uploadedFiles,
  maxTotalFiles,
  maxTotalSize,
  fileExpiryTime
}: FileUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const totalSize = Object.values(uploadedFiles).reduce((sum, file) => sum + file.size, 0);
  const fileCount = Object.keys(uploadedFiles).length;
  const availableSpace = maxTotalSize - totalSize;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > availableSpace) {
      return `File size exceeds available space (${formatFileSize(availableSpace)} remaining)`;
    }

    if (fileCount >= maxTotalFiles) {
      return `Maximum ${maxTotalFiles} files allowed`;
    }

    // Check file type
    const isValidType = Object.keys(SUPPORTED_FILE_TYPES).some(type => {
      if (type.endsWith('*')) {
        const baseType = type.split('/')[0];
        return file.type.startsWith(baseType);
      }
      return file.name.toLowerCase().endsWith(type);
    });

    if (!isValidType) {
      return 'Unsupported file type';
    }

    return null;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);

    const file = e.dataTransfer.files[0];
    if (file) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (file) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      await onUpload(selectedFile);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" onClick={onClose} />
        
        <div 
          ref={dialogRef}
          className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Upload File ({fileCount}/{maxTotalFiles})
              </h3>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-4">
            {/* Storage usage */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Storage used</span>
                <span className="text-gray-900 dark:text-gray-100">{formatFileSize(totalSize)} / {formatFileSize(maxTotalSize)}</span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${(totalSize / maxTotalSize) * 100}%` }}
                />
              </div>
            </div>

            {/* Current files */}
            {fileCount > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Current files:</h4>
                <div className="space-y-2">
                  {Object.entries(uploadedFiles).map(([id, file]) => (
                    <div 
                      key={id}
                      className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileIcon className="h-4 w-4 flex-shrink-0 text-gray-500 dark:text-gray-400" />
                        <span className="truncate text-gray-900 dark:text-gray-100">{file.name}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatFileSize(file.size)} • {getTimeLeft(file.timestamp, fileExpiryTime)}
                        </span>
                        <button
                          onClick={() => onDelete(id)}
                          className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove file"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Drop zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                border-2 border-dashed rounded-lg p-6
                flex flex-col items-center justify-center gap-3
                cursor-pointer transition-colors
                ${isDragging
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500'
                }
                ${fileCount >= maxTotalFiles ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              onClick={() => fileCount < maxTotalFiles && fileInputRef.current?.click()}
            >
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                <Upload className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {selectedFile ? selectedFile.name : fileCount >= maxTotalFiles 
                    ? 'Maximum files reached'
                    : 'Drop your file here, or click to browse'
                  }
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Available space: {formatFileSize(availableSpace)}
                </p>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="mt-3 flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {/* Supported file types */}
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Supported file types:
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {Object.entries(SUPPORTED_FILE_TYPES).map(([type, desc]) => (
                  <div
                    key={type}
                    className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400"
                  >
                    <FileIcon className="h-3 w-3 flex-shrink-0" />
                    <span>{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading || fileCount >= maxTotalFiles}
                className={`
                  px-4 py-2 text-sm font-medium rounded-lg transition-colors
                  ${!selectedFile || isUploading || fileCount >= maxTotalFiles
                    ? 'bg-blue-500/50 text-white cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                  }
                `}
              >
                {isUploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>

          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept={Object.keys(SUPPORTED_FILE_TYPES).join(',')}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
} 