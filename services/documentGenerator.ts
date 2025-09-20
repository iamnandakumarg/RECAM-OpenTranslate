import type { TranslatedData } from '../types';

// Declare the libraries loaded from CDN in the global scope for TypeScript
declare const jsPDF: any;
declare const htmlToDocx: any;

/**
 * Helper to trigger a browser download for a Blob.
 */
const saveFile = (blob: Blob, fileName: string) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
};

/**
 * Generates an HTML string from the translated data, which can be used for DOCX conversion.
 */
const generateHtmlForDocx = (data: TranslatedData[]): string => {
    let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Calibri, sans-serif; font-size: 11pt; }
                h1, h2, h3, h4, h5, h6 { font-weight: bold; }
                h1 { font-size: 16pt; }
                h2 { font-size: 14pt; }
                p { margin-bottom: 1em; }
                table { border-collapse: collapse; width: 100%; margin-bottom: 1em; }
                th, td { border: 1px solid #dddddd; text-align: left; padding: 8px; }
                .page-break { page-break-after: always; }
            </style>
        </head>
        <body>
    `;

    data.forEach((page, pageIndex) => {
        page.blocks.forEach(block => {
            switch (block.type) {
                case 'heading':
                    html += `<h${block.level || 1}>${block.text || ''}</h${block.level || 1}>`;
                    break;
                case 'paragraph':
                    html += `<p>${block.text || ''}</p>`;
                    break;
                case 'list_item':
                    html += `<ul><li>${block.text || ''}</li></ul>`;
                    break;
                case 'table':
                    html += '<table><tbody>';
                    block.rows.forEach(row => {
                        html += '<tr>';
                        row.forEach(cell => {
                            html += `<td>${cell.text || ''}</td>`;
                        });
                        html += '</tr>';
                    });
                    html += '</tbody></table>';
                    break;
            }
        });

        if (pageIndex < data.length - 1) {
            html += '<div class="page-break"></div>';
        }
    });

    html += '</body></html>';
    return html;
};

/**
 * Generates and downloads a .docx file from the translated data.
 */
export const generateDocx = async (data: TranslatedData[], fileName: string): Promise<void> => {
    console.log("Generating DOCX...");
    const htmlString = generateHtmlForDocx(data);
    const docxGenerator = (window as any).htmlToDocx;

    if (!docxGenerator || typeof docxGenerator.asBlob !== 'function') {
        console.error("html-to-docx-ts library not found on the window object. It might not have loaded correctly.");
        throw new Error("Failed to generate DOCX: A required library is missing. Please check your network connection or try reloading the page.");
    }

    const fileBuffer = await docxGenerator.asBlob(htmlString);
    saveFile(fileBuffer, fileName);
    console.log("DOCX generated.");
};

/**
 * Generates and downloads a PDF file from the translated data.
 */
export const generatePdf = async (data: TranslatedData[], fileName:string): Promise<void> => {
    console.log("Generating PDF...");
    const { jsPDF: JSPDF } = (window as any).jspdf;
    const doc = new JSPDF();
    
    // jspdf-autotable extends the jsPDF instance prototype
    const autoTable = (doc as any).autoTable;

    let yPos = 20; // Initial Y position with top margin
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const contentWidth = doc.internal.pageSize.width - margin * 2;

    const checkAndAddPage = (requiredHeight: number) => {
        if (yPos + requiredHeight > pageHeight - margin) {
            doc.addPage();
            yPos = margin;
        }
    };

    data.forEach((page, pageIndex) => {
        if (pageIndex > 0) {
            doc.addPage();
            yPos = margin;
        }

        page.blocks.forEach(block => {
            switch (block.type) {
                case 'heading':
                    const fontSize = 18 - (block.level || 1) * 2;
                    checkAndAddPage(fontSize / 2);
                    doc.setFontSize(fontSize);
                    doc.setFont(undefined, 'bold');
                    doc.text(block.text || '', margin, yPos, { maxWidth: contentWidth });
                    yPos += 10;
                    break;
                case 'paragraph':
                    doc.setFontSize(11);
                    doc.setFont(undefined, 'normal');
                    const lines = doc.splitTextToSize(block.text || '', contentWidth);
                    checkAndAddPage(lines.length * 5 + 5);
                    doc.text(lines, margin, yPos);
                    yPos += lines.length * 5 + 5;
                    break;
                case 'list_item':
                     doc.setFontSize(11);
                     doc.setFont(undefined, 'normal');
                     const listItemText = `• ${block.text || ''}`;
                     const listLines = doc.splitTextToSize(listItemText, contentWidth - 5);
                     checkAndAddPage(listLines.length * 5 + 2);
                     doc.text(listLines, margin + 5, yPos);
                     yPos += listLines.length * 5 + 2;
                    break;
                case 'table':
                    const tableBody = block.rows.map(row => row.map(cell => cell.text || ''));
                    checkAndAddPage(20); 
                    autoTable(doc, {
                        startY: yPos,
                        body: tableBody,
                        theme: 'grid',
                        styles: { fontSize: 9, cellPadding: 2 },
                        headStyles: { fillColor: [52, 73, 94], textColor: 255 },
                        margin: { left: margin, right: margin },
                    });
                    yPos = (doc as any).autoTable.previous.finalY + 10;
                    break;
            }
        });
    });

    doc.save(fileName);
    console.log("PDF generated.");
};