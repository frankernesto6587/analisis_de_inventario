'use client';

import { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { Upload, FileSpreadsheet, X, Loader2 } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
  accept?: string;
  className?: string;
}

export function FileUpload({
  onFileSelect,
  isLoading = false,
  accept = '.xlsx,.xls',
  className,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
        setSelectedFile(file);
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setSelectedFile(file);
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const clearFile = useCallback(() => {
    setSelectedFile(null);
  }, []);

  return (
    <div className={cn('w-full', className)}>
      {selectedFile ? (
        <div className="flex items-center justify-between rounded-xl border border-zinc-700 bg-zinc-800/50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10">
              <FileSpreadsheet className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <p className="font-medium text-zinc-200">{selectedFile.name}</p>
              <p className="text-sm text-zinc-500">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
          ) : (
            <button
              onClick={clearFile}
              className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      ) : (
        <label
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors',
            isDragging
              ? 'border-emerald-500 bg-emerald-500/5'
              : 'border-zinc-700 bg-zinc-800/30 hover:border-zinc-600 hover:bg-zinc-800/50'
          )}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
            <Upload
              className={cn(
                'h-8 w-8',
                isDragging ? 'text-emerald-400' : 'text-zinc-400'
              )}
            />
          </div>
          <p className="mt-4 text-base font-medium text-zinc-300">
            Arrastra tu archivo Excel aquí
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            o haz clic para seleccionar
          </p>
          <p className="mt-4 text-xs text-zinc-600">
            Formatos soportados: .xlsx, .xls
          </p>
          <input
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      )}
    </div>
  );
}
