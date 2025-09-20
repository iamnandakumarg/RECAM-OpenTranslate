import React, { useState, useEffect } from 'react';

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
      <div className="mb-4">
        <p className="text-lg tracking-wider" style={{ color: '#2dd4bf' }}>loading...</p>
      </div>

      <div 
        className="w-full h-5 rounded-full p-0.5"
        style={{ border: '1px solid #2dd4bf' }}
        role="progressbar"
        aria-busy="true"
        aria-label="Processing document"
      >
        <div 
          className="h-full w-full rounded-full overflow-hidden"
        >
            <div 
                className="h-full w-full"
                style={{
                    animation: 'loading-pan 2s linear infinite',
                    background: `linear-gradient(
                        to right,
                        #0f766e, #14b8a6, #5eead4, #14b8a6, #0f766e
                    )`, // Using shades of teal for the gradient
                    backgroundSize: '200% 100%',
                }}
            ></div>
        </div>
      </div>
      <style>{`
        @keyframes loading-pan {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      
      <h2 className="mt-6 text-xl font-semibold">Processing "{fileName}"</h2>
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