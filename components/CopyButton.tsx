import React, { useState } from 'react';
import { ClipboardIcon } from './icons';

interface CopyButtonProps {
  textToCopy: string;
}

export const CopyButton: React.FC<CopyButtonProps> = ({ textToCopy }) => {
  const [buttonText, setButtonText] = useState('Copy');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setButtonText('Copied!');
      setTimeout(() => {
        setButtonText('Copy');
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      setButtonText('Error');
       setTimeout(() => {
        setButtonText('Copy');
      }, 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all"
      aria-label="Copy document text to clipboard"
    >
      <ClipboardIcon className="w-4 h-4 mr-1.5" />
      {buttonText}
    </button>
  );
};