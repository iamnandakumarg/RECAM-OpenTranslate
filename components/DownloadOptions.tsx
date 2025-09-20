import React from 'react';
import { DownloadIcon } from './icons';

interface DownloadOptionsProps {
    onDownloadPdf: () => void;
    onDownloadDocx: () => void;
}

export const DownloadOptions: React.FC<DownloadOptionsProps> = ({ onDownloadPdf, onDownloadDocx }) => {
  return (
    <div className="mt-8 text-center border-t pt-6">
      <h3 className="text-lg font-semibold mb-4">Download Translated Document</h3>
      <div className="flex justify-center space-x-4">
        <button 
            onClick={onDownloadPdf}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <DownloadIcon className="w-5 h-5 mr-2" />
          Download as PDF
        </button>
        <button 
            onClick={onDownloadDocx}
            className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <DownloadIcon className="w-5 h-5 mr-2" />
          Download as Word (.docx)
        </button>
      </div>
    </div>
  );
};