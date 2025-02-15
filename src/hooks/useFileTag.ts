import { useState, useCallback, useEffect, useRef } from 'react';

interface FileTagState {
  isActive: boolean;
  query: string;
  position: { top: number; left: number } | null;
  triggerIndex: number;
}

interface UploadedFile {
  name: string;
  content?: string;
  [key: string]: any;
}

interface UseFileTagOptions {
  uploadedFiles: Record<string, UploadedFile>;
  onSelect: (fileId: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}

export function useFileTag({ uploadedFiles, onSelect, textareaRef }: UseFileTagOptions) {
  const [tagState, setTagState] = useState<FileTagState>({
    isActive: false,
    query: '',
    position: null,
    triggerIndex: -1
  });

  const handleInput = useCallback((
    input: string,
    cursorPosition: number
  ) => {
    if (!textareaRef.current) return;

    const lastAtSymbol = input.lastIndexOf('@', cursorPosition);
    
    if (lastAtSymbol !== -1 && lastAtSymbol < cursorPosition) {
      const query = input.slice(lastAtSymbol + 1, cursorPosition);
      const textBeforeCursor = input.slice(0, cursorPosition);
      const lines = textBeforeCursor.split('\n');
      const currentLine = lines[lines.length - 1];
      const textareaRect = textareaRef.current.getBoundingClientRect();
      
      // Calculate position based on text metrics
      const tempSpan = document.createElement('span');
      tempSpan.style.font = window.getComputedStyle(textareaRef.current).font;
      tempSpan.style.visibility = 'hidden';
      tempSpan.textContent = currentLine;
      document.body.appendChild(tempSpan);
      const charWidth = tempSpan.offsetWidth / currentLine.length;
      document.body.removeChild(tempSpan);

      setTagState({
        isActive: true,
        query,
        position: {
          top: textareaRect.top + (lines.length * parseInt(window.getComputedStyle(textareaRef.current).lineHeight)),
          left: textareaRect.left + (currentLine.length * charWidth)
        },
        triggerIndex: lastAtSymbol
      });
    } else {
      setTagState({
        isActive: false,
        query: '',
        position: null,
        triggerIndex: -1
      });
    }
  }, [textareaRef]);

  const handleTagSelect = useCallback((fileId: string) => {
    onSelect(fileId);
    setTagState({
      isActive: false,
      query: '',
      position: null,
      triggerIndex: -1
    });
  }, [onSelect]);

  const getFilteredFiles = useCallback(() => {
    if (!tagState.query) return Object.entries(uploadedFiles);
    
    return Object.entries(uploadedFiles).filter(([_, file]) =>
      file.name.toLowerCase().includes(tagState.query.toLowerCase())
    );
  }, [uploadedFiles, tagState.query]);

  // Close tag suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tagState.isActive) {
        const target = e.target as HTMLElement;
        if (!target.closest('.file-tag-suggestions')) {
          setTagState(prev => ({ ...prev, isActive: false }));
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [tagState.isActive]);

  return {
    tagState,
    handleInput,
    handleTagSelect,
    getFilteredFiles,
    resetTagState: () => setTagState({
      isActive: false,
      query: '',
      position: null,
      triggerIndex: -1
    })
  };
} 