import React, { useState, useCallback } from 'react';
import { FileUploadIcon } from './icons';

interface FileUploadProps {
    onFileSelect: (file: File) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onFileSelect(e.dataTransfer.files[0]);
        }
    }, [onFileSelect]);
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onFileSelect(e.target.files[0]);
        }
    };

    return (
        <div 
            onDrop={handleDrop} 
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            className={`flex flex-col items-center justify-center p-8 md:p-12 border-2 border-dashed rounded-xl text-center transition-all duration-300 ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-500'}`}
        >
            <input 
                type="file" 
                id="file-upload" 
                className="hidden" 
                onChange={handleFileChange}
                accept=".pdf,.docx,.jpg,.jpeg,.png"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
                <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-blue-100 rounded-full text-blue-600">
                        <FileUploadIcon />
                    </div>
                    <p className="font-semibold text-lg text-gray-800">Drag & drop a file here or <span className="text-blue-600 font-semibold">browse</span></p>
                    <p className="text-sm text-gray-500">Supports: PDF, DOCX, JPG, PNG</p>
                </div>
            </label>
        </div>
    );
};