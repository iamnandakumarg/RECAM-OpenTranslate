declare const jspdf: any;
declare const saveAs: any;

declare global {
    interface Window {
        jspdf: any;
        saveAs: (blob: Blob, filename: string) => void;
    }
}

// Local type definition to keep this service decoupled
interface FormattedLine {
    text: string;
    isHeading: boolean;
}


const getFilenameWithExtension = (baseFilename: string, extension: string): string => {
    const nameWithoutExt = baseFilename.split('.').slice(0, -1).join('.') || baseFilename;
    return `${nameWithoutExt}_translated.${extension}`;
}

export const generatePdf = (data: string | FormattedLine[], filename: string) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

    doc.setProperties({ title: `Translated: ${filename}` });
    
    // Use a standard sans-serif font like Helvetica, which is similar to Aptos.
    doc.setFont('helvetica');

    const fontSize = 11;
    const headingFontSize = 14;
    const lineSpacing = 6; // Increased for better readability
    const paragraphSpacing = 3; 
    const margin = 20; // 2cm padding
    const effectiveWidth = doc.internal.pageSize.getWidth() - margin * 2;
    const pageHeight = doc.internal.pageSize.getHeight();

    let cursorY = margin;

    const checkPageBreak = (neededHeight: number = lineSpacing) => {
        if (cursorY + neededHeight > pageHeight - margin) {
            doc.addPage();
            cursorY = margin;
        }
    };

    const processLines = (lines: { text: string; isHeading: boolean }[]) => {
        lines.forEach((line, index) => {
            const trimmedLine = line.text.trim();
            
            if (trimmedLine === '') {
                 // Ensure space is not added for multiple consecutive blank lines.
                if (index > 0 && lines[index - 1].text.trim() !== '') {
                    cursorY += paragraphSpacing;
                    checkPageBreak();
                }
            } else {
                const isHeading = line.isHeading;
                doc.setFontSize(isHeading ? headingFontSize : fontSize);
                doc.setFont('helvetica', isHeading ? 'bold' : 'normal');

                const wrappedLines = doc.splitTextToSize(trimmedLine, effectiveWidth);
                
                checkPageBreak(wrappedLines.length * lineSpacing);

                wrappedLines.forEach((wrappedLine: string) => {
                    doc.text(wrappedLine, margin, cursorY);
                    cursorY += lineSpacing;
                });

                // Add a bit of extra space after headings for separation
                if (isHeading) {
                    cursorY += paragraphSpacing;
                    checkPageBreak();
                }
            }
        });
    }

    if (typeof data === 'string') {
        const lines = data.split('\n').map(text => ({ text, isHeading: false }));
        processLines(lines);
    } else {
        processLines(data);
    }
    
    doc.save(getFilenameWithExtension(filename, 'pdf'));
};


export const saveDocx = (blob: Blob, filename: string) => {
    window.saveAs(blob, getFilenameWithExtension(filename, 'docx'));
};
