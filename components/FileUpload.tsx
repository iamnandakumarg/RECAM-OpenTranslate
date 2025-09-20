import React, { useState, useCallback } from 'react';
import { UploadCloudIcon, TrashIcon } from './icons';
import { LanguageSelector } from './LanguageSelector';
import { AdvancedOptions } from './AdvancedOptions';
import { SOURCE_LANGUAGES, SUPPORTED_LANGUAGES } from '../constants';
import type { Formality } from '../App';
import type { GlossaryTerm } from '../types';

interface FileUploadProps {
  originalFile: File | null;
  onFileSelect: (file: File) => void;
  onClearFile: () => void;
  onExtract: () => void;
  error: string | null;
  sourceLanguage: string;
  setSourceLanguage: (lang: string) => void;
  targetLanguage: string;
  setTargetLanguage: (lang: string) => void;
  formality: Formality;
  setFormality: (formality: Formality) => void;
  glossary: GlossaryTerm[];
  setGlossary: (glossary: GlossaryTerm[]) => void;
}

const ACCEPTED_FILES = 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*';

export const FileUpload: React.FC<FileUploadProps> = ({ 
    originalFile,
    onFileSelect,
    onClearFile,
    onExtract,
    error,
    sourceLanguage,
    setSourceLanguage,
    targetLanguage,
    setTargetLanguage,
    formality,
    setFormality,
    glossary,
    setGlossary,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback((file: File | undefined | null) => {
    if (file) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

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

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  };

  const handleFileSelectEvent = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    handleFile(file);
  };

  const LanguageAndAdvancedOptions = (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 max-w-lg mx-auto text-left">
          <LanguageSelector 
            id="source-language"
            label="Source Language"
            languages={SOURCE_LANGUAGES}
            value={sourceLanguage}
            onChange={setSourceLanguage}
          />
          <LanguageSelector 
            id="target-language"
            label="Target Language"
            languages={SUPPORTED_LANGUAGES}
            value={targetLanguage}
            onChange={setTargetLanguage}
          />
      </div>

      <AdvancedOptions 
        formality={formality}
        setFormality={setFormality}
        glossary={glossary}
        setGlossary={setGlossary}
      />
    </>
  );

  if (originalFile) {
    return (
      <div>
        <div className="rounded-lg border border-gray-300 bg-white p-4 mb-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="font-semibold text-gray-900">{originalFile.name}</p>
                    <p className="text-sm text-gray-600">{(originalFile.size / 1024).toFixed(2)} KB</p>
                </div>
                <button 
                    onClick={onClearFile} 
                    className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-100 transition-colors"
                    aria-label="Remove file"
                >
                    <TrashIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
        
        {LanguageAndAdvancedOptions}

        <div className="mt-8">
            <button
                onClick={onExtract}
                className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
                Extract and Preview
            </button>
        </div>
        {error && <p className="mt-4 text-sm text-red-600 text-center">{error}</p>}
      </div>
    );
  }

  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold mb-2">Upload Your Document</h2>
      <p className="text-gray-600 mb-6">
        Select your languages and upload a PDF, Word document, or image to begin.
      </p>

      {LanguageAndAdvancedOptions}

      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`relative block w-full rounded-lg border-2 border-dashed border-gray-300 p-12 text-center hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors ${
          isDragging ? 'bg-blue-50 border-blue-400' : ''
        }`}
      >
        <UploadCloudIcon className="mx-auto h-12 w-12 text-gray-400" />
        <span className="mt-2 block text-sm font-semibold text-gray-800">
          Drag and drop a file or click to upload
        </span>
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileSelectEvent}
          accept={ACCEPTED_FILES}
          aria-label="File uploader"
        />
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Supported formats: PDF, DOC, DOCX, PNG, JPG
      </p>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </div>
  );
};
