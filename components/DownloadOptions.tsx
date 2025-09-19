import React from 'react';
import { generatePdf, saveDocx } from '../services/documentGenerator';
import { DownloadIcon } from './icons';
import { TranslatedLine } from '../types';

interface DownloadOptionsProps {
    text: string;
    filename: string;
    docxBlob?: Blob;
    structuredText?: TranslatedLine[];
}

export const DownloadOptions: React.FC<DownloadOptionsProps> = ({ text, filename, docxBlob, structuredText }) => {
    const isOriginalDocx = filename.toLowerCase().endsWith('.docx');

    return (
        <div className="mt-6">
            <h4 className="font-semibold mb-3 text-gray-900">Download Translation</h4>
            <div className="flex flex-col sm:flex-row gap-4">
                 {docxBlob && (
                    <button
                        onClick={() => saveDocx(docxBlob, filename)}
                        className="flex items-center justify-center gap-2 w-full bg-blue-500 text-white font-semibold py-2.5 px-4 rounded-xl hover:bg-blue-600 transition-colors"
                    >
                        <DownloadIcon/>
                        Download Word (.docx)
                    </button>
                 )}
                <button
                    onClick={() => generatePdf(structuredText || text, filename)}
                    className="flex items-center justify-center gap-2 w-full bg-gray-200 text-gray-800 font-semibold py-2.5 px-4 rounded-xl hover:bg-gray-300 transition-colors"
                >
                    <DownloadIcon/>
                    Download PDF
                </button>
            </div>
             {docxBlob && (
                <p className="text-xs text-center mt-4 text-gray-500">
                    {isOriginalDocx
                        ? "The .docx file preserves the original document's structure and formatting."
                        : "The .docx file contains the translated text with rich formatting."}
                </p>
            )}
        </div>
    );
};