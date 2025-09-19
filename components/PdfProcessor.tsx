import React from 'react';

// FIX: This component was referencing non-existent functions from fileProcessor.ts
// (createOcrWorker, preprocessCanvas, reconstructLayoutFromOcrData), causing import errors.
// The local OCR logic has been superseded by Gemini API calls in fileProcessor.ts.
// The component is stubbed out to fix the build, as it appears to be obsolete.

interface PdfProcessorProps {
    file: File;
    ocrLang: string;
    useHighAccuracy: boolean;
    onProgress: (message: string, percentage?: number | null) => void;
    onExtract: (text: string) => void;
    onError: (message: string) => void;
}


export const PdfProcessor: React.FC<PdfProcessorProps> = () => {
    // This component is currently a no-op as it is not used in the application.
    return null;
};
