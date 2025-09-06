
import React, { useRef, useState } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled: boolean;
}

const UploadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled && e.dataTransfer.files && e.dataTransfer.files[0]) {
        onFileSelect(e.dataTransfer.files[0]);
    }
  }

  const baseClasses = "relative block w-full rounded-lg border-2 border-dashed p-12 text-center transition-colors duration-200";
  const draggingClasses = "border-white bg-gray-800";
  const defaultClasses = "border-gray-600 hover:border-gray-500";

  return (
    <div 
        className={`${baseClasses} ${isDragging ? draggingClasses : defaultClasses}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="video/*"
        onChange={handleFileChange}
        disabled={disabled}
      />
      <div className="flex flex-col items-center">
        <UploadIcon />
        <span className="mt-2 block text-sm font-medium text-gray-300">
          Drag and drop a video, or click to browse
        </span>
        <p className="text-xs text-gray-500 mt-1">MP4, MOV, WEBM, etc. up to 50MB</p>
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled}
          className="mt-4 rounded-md bg-gray-200 text-black px-3.5 py-2.5 text-sm font-semibold shadow-sm hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Select File
        </button>
      </div>
    </div>
  );
};