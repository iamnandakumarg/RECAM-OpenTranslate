import { pdfjs } from 'react-pdf';

// Configure the PDF.js worker from a CDN. This is a required step for react-pdf.
// By doing this once in a separate module, we ensure it's set up for the entire application.
// The key fix is using the .mjs (module) version of the worker script.
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`;
