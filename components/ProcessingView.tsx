import React, { useState, useEffect } from 'react';
import { SpinnerIcon } from './icons';

interface ProcessingViewProps {
  fileName: string;
}

const processingMessages = [
  "Analyzing document layout...",
  "Performing optical character recognition (OCR)...",
  "Structuring content into tables and paragraphs...",
  "Preparing text for translation...",
  "This may take a few moments for complex documents.",
  "Almost there...",
];

export const ProcessingView: React.FC<ProcessingViewProps> = ({ fileName }) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setCurrentMessageIndex((prevIndex) => (prevIndex + 1) % processingMessages.length);
        setIsFading(false);
      }, 500); // This should match the fade-out duration
    }, 3000); // Change message every 3 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-center p-8">
      <SpinnerIcon className="mx-auto h-12 w-12 text-teal-600" />
      <h2 className="mt-4 text-xl font-semibold">Processing "{fileName}"</h2>
      <div className="mt-2 text-gray-600 h-6 flex items-center justify-center">
        <p className={`transition-opacity duration-500 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
          {processingMessages[currentMessageIndex]}
        </p>
      </div>
      <p className="mt-4 text-sm text-gray-500">
        Please keep this window open.
      </p>
    </div>
  );
};