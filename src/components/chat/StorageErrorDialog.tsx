'use client';

import { X } from 'lucide-react';

interface StorageErrorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onClearOldFiles: () => void;
}

export function StorageErrorDialog({
  isOpen,
  onClose,
  onClearOldFiles
}: StorageErrorDialogProps) {
  if (!isOpen) return null;

  const handleClearFiles = () => {
    onClearOldFiles();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Storage Limit Reached
            </h3>
            <button
              onClick={onClose}
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="mb-6">
            <p className="text-gray-600 dark:text-gray-300">
              You've reached the storage limit for uploaded files. Would you like to clear old files to make space for new ones?
            </p>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleClearFiles}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Clear Old Files
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 