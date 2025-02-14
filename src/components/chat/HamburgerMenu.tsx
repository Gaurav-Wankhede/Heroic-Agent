'use client';

import { Menu, X, Keyboard, Upload, Trash2 } from 'lucide-react';
import { useEffect } from 'react';

interface HamburgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
  shortcuts: {
    send: string;
    newLine: string;
    cancelEdit: string;
    clearChat: string;
    fileUpload: string;
  };
  onFileUpload: () => void;
  onClearChat: () => void;
}

export function HamburgerMenu({
  isOpen,
  onClose,
  onToggle,
  shortcuts,
  onFileUpload,
  onClearChat
}: HamburgerMenuProps) {
  // Handle clicks outside the menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const menu = document.getElementById('mobile-menu');
      const hamburger = document.querySelector('[aria-controls="mobile-menu"]');
      
      if (isOpen && 
          menu && 
          !menu.contains(event.target as Node) && 
          hamburger && 
          !hamburger.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={onToggle}
        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
        title="Menu"
        type="button"
        aria-expanded={isOpen}
        aria-controls="mobile-menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Menu overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-[998]"
          onClick={onClose}
        />
      )}

      {/* Slide-out menu */}
      <div 
        id="mobile-menu"
        className={`
          fixed inset-y-0 left-0 w-72 bg-white dark:bg-gray-800 shadow-xl 
          transform transition-all duration-300 ease-in-out z-[999]
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          scrollbar-none
        `}
        aria-hidden={!isOpen}
      >
        <div className="flex flex-col h-full overflow-y-auto scrollbar-none">
          <div className="sticky top-0 flex items-center justify-between p-4 border-b border-gray-200/80 dark:border-gray-700/80 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Menu</h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Keyboard Shortcuts Section */}
          <div className="p-4 border-b border-gray-200/80 dark:border-gray-700/80">
            <div className="flex items-center gap-2 mb-3">
              <Keyboard className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Keyboard Shortcuts</h4>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Send message</span>
                <kbd className="px-2 py-1 text-xs font-semibold bg-gray-100 dark:bg-gray-700 rounded text-gray-500 dark:text-gray-400">
                  {shortcuts.send}
                </kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">New line</span>
                <kbd className="px-2 py-1 text-xs font-semibold bg-gray-100 dark:bg-gray-700 rounded text-gray-500 dark:text-gray-400">
                  {shortcuts.newLine}
                </kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Cancel edit</span>
                <kbd className="px-2 py-1 text-xs font-semibold bg-gray-100 dark:bg-gray-700 rounded text-gray-500 dark:text-gray-400">
                  {shortcuts.cancelEdit}
                </kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Clear chat</span>
                <kbd className="px-2 py-1 text-xs font-semibold bg-gray-100 dark:bg-gray-700 rounded text-gray-500 dark:text-gray-400">
                  {shortcuts.clearChat}
                </kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Upload file</span>
                <kbd className="px-2 py-1 text-xs font-semibold bg-gray-100 dark:bg-gray-700 rounded text-gray-500 dark:text-gray-400">
                  {shortcuts.fileUpload}
                </kbd>
              </div>
            </div>
          </div>

          {/* Actions Section */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Menu className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Actions</h4>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => {
                  onClose();
                  onFileUpload();
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Upload className="h-4 w-4" />
                <span>Upload File</span>
              </button>
              <button
                onClick={() => {
                  onClose();
                  onClearChat();
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span>Clear Chat</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 