// FIX: PageViewport is not exported from 'react-pdf'. It should be imported from 'pdfjs-dist'.
import { pdfjs } from 'react-pdf';
import type { PageViewport } from 'pdfjs-dist';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { translateTexts, translateImage } from './geminiService';
import type { TranslatedImageResponse, TranslatedLine } from '../types';

declare const JSZip: any;

declare global {
    interface Window {
        JSZip: any;
    }
}

type ProgressCallback = (message: string, percentage?: number | null) => void;

interface ProcessOptions {
    file: File;
    sourceLang: string;
    targetLang: string;
    onProgress: ProgressCallback;
}

interface ProcessResult {
    docxBlob?: Blob;
    text: string;
    structuredText?: TranslatedLine[];
}

// =================================================================================
// DOCX (HIGH-FIDELITY) PROCESSING
// =================================================================================

const handleDocx = async (options: ProcessOptions): Promise<ProcessResult> => {
    const { file, sourceLang, targetLang, onProgress } = options;
    onProgress('Analyzing DOCX structure...', 5);

    const zip = await new JSZip().loadAsync(await file.arrayBuffer());
    const contentXmlFile = zip.file("word/document.xml");

    if (!contentXmlFile) {
        throw new Error("Invalid DOCX file: word/document.xml not found.");
    }

    const xmlString = await contentXmlFile.async("string");
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "application/xml");
    
    // Use `w\\:t` to select 't' elements in the 'w' namespace
    const textNodes = Array.from(xmlDoc.querySelectorAll("w\\:t"));
    const originalTexts = textNodes.map(node => node.textContent || '');

    onProgress('Translating text segments...', 30);
    const translatedTexts = await translateTexts(originalTexts, sourceLang, targetLang);
    onProgress('Reconstructing DOCX document...', 80);

    if (originalTexts.length !== translatedTexts.length) {
        throw new Error("Translation returned a different number of text segments.");
    }

    textNodes.forEach((node, index) => {
        node.textContent = translatedTexts[index];
        // Preserve whitespace if the parent element has the `xml:space="preserve"` attribute
        if(node.parentElement?.getAttribute('xml:space') === 'preserve' && node.textContent.trim() !== ''){
            // no change, keep original spacing
        } else {
             // Word generally prefers separate text nodes for leading/trailing spaces.
             // For simplicity, we trim and add a space if needed. This is a robust compromise.
            if(node.textContent.startsWith(' ')) node.textContent = ' ' + node.textContent.trim();
            if(node.textContent.endsWith(' ')) node.textContent = node.textContent.trim() + ' ';
        }
    });

    const serializer = new XMLSerializer();
    const newXmlString = serializer.serializeToString(xmlDoc);
    zip.file("word/document.xml", newXmlString);
    
    onProgress('Finalizing document...', 95);
    const docxBlob = await zip.generateAsync({ type: "blob" });
    const fullText = translatedTexts.join('\n');

    return { docxBlob, text: fullText };
};

// =================================================================================
// PDF & IMAGE (TEXT-ONLY TRANSLATION)
// =================================================================================

const handlePdfOrImage = async (options: ProcessOptions): Promise<ProcessResult> => {
    const { file, sourceLang, targetLang, onProgress } = options;
    const isPdf = file.type === 'application/pdf';
    
    onProgress(isPdf ? 'Loading PDF...' : 'Loading image...', 0);

    const translatedPages: TranslatedImageResponse[] = [];
    const fileBuffer = await file.arrayBuffer();
    
    if (isPdf) {
        const pdf = await pdfjs.getDocument(fileBuffer).promise;
        const numPages = pdf.numPages;

        for (let i = 1; i <= numPages; i++) {
            const pageProgressStart = ((i - 1) / numPages) * 50;
            onProgress(`Processing page ${i} of ${numPages}...`, pageProgressStart);
            
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 }); // Good scale for quality
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (!context) throw new Error(`Could not get canvas context for page ${i}`);
            
            // FIX: The RenderParameters type from the version of pdfjs-dist being used appears to require the 'canvas' property.
            await page.render({ canvasContext: context, viewport: viewport, canvas: canvas }).promise;

            onProgress(`Translating page ${i} of ${numPages}...`, pageProgressStart + 25);
            
            const mimeType = 'image/png';
            const imageDataUrl = canvas.toDataURL(mimeType);
            const base64Image = imageDataUrl.split(',')[1];

            const translatedPage = await translateImage(base64Image, mimeType, sourceLang, targetLang);
            translatedPages.push(translatedPage);
        }
    } else { // Is an image
        onProgress('Analyzing image...', 20);

        const mimeType = file.type;
        const base64Image = btoa(new Uint8Array(fileBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
        
        onProgress('Translating image...', 50);
        const translatedPage = await translateImage(base64Image, mimeType, sourceLang, targetLang);
        translatedPages.push(translatedPage);
    }

    onProgress('Building translated DOCX document...', 90);

    const allParagraphs: Paragraph[] = [];
    translatedPages.forEach((page, index) => {
        if (page.lines && page.lines.length > 0) {
            const pageParagraphs = page.lines.map(line =>
                new Paragraph({
                    children: [
                        new TextRun({
                            text: line.text,
                            bold: line.isHeading,
                        }),
                    ],
                })
            );
            allParagraphs.push(...pageParagraphs);
        }

        // Add a single empty paragraph for spacing between pages, but not after the last one
        if (index < translatedPages.length - 1) {
            allParagraphs.push(new Paragraph({ text: "" }));
        }
    });

    const doc = new Document({
        styles: {
            default: {
                document: {
                    run: {
                        font: "Aptos",
                        size: 22, // 11pt in half-points
                    },
                },
            },
        },
        sections: [{
            properties: {
                page: {
                    margin: {
                        top: 1440,    // 1 inch in twips
                        right: 1440,  // 1 inch in twips
                        bottom: 1440, // 1 inch in twips
                        left: 1440,   // 1 inch in twips
                    },
                },
            },
            children: allParagraphs,
        }],
    });
    
    const docxBlob = await Packer.toBlob(doc);
    const fullText = translatedPages
        .map(page => (page.lines || []).map(line => line.text).join('\n'))
        .join('\n\n');
        
    const structuredText: TranslatedLine[] = [];
    translatedPages.forEach((page, index) => {
        if(page.lines) {
            structuredText.push(...page.lines);
        }
        // Add a blank line to represent a page break/larger gap, except after the last page
        if (index < translatedPages.length - 1) {
            structuredText.push({ text: '', isHeading: false });
        }
    });

    return { docxBlob, text: fullText, structuredText };
};


// =================================================================================
// MAIN EXPORTED FUNCTION
// =================================================================================

export const processAndTranslateFile = async (options: ProcessOptions): Promise<ProcessResult> => {
    const { file } = options;
    const fileType = file.type;
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (
        fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        extension === 'docx'
    ) {
        return handleDocx(options);
    } else if (fileType.startsWith('image/') || fileType === 'application/pdf') {
        return handlePdfOrImage(options);
    } else {
        throw new Error(`Unsupported file type: ${fileType || extension}. Please upload a DOCX, PDF, or image file.`);
    }
};
