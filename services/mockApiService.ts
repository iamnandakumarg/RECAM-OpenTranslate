import type { ExtractedData, TranslatedData } from '../types';

// Helper to simulate network delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock data representing what PaddleOCR + LayoutParser would extract
const mockExtractedLeaseData: ExtractedData[] = [
  {
    pageNumber: 1,
    blocks: [
      { id: 'h1', type: 'heading', level: 1, text: 'COMMERCIAL LEASE AGREEMENT', bbox: { x1: 10, y1: 10, x2: 90, y2: 20 }, confidence: 0.99 },
      { id: 'p1', type: 'paragraph', text: 'This Lease Agreement ("Lease") is entered into by and between Landlord Name ("Landlord") and Tenant Name ("Tenant").', bbox: { x1: 10, y1: 25, x2: 90, y2: 35 }, confidence: 0.98 },
      { id: 'h2', type: 'heading', level: 2, text: '1. Leased Premises', bbox: { x1: 10, y1: 40, x2: 90, y2: 45 }, confidence: 0.97 },
      { id: 'p2', type: 'paragraph', text: 'The Landlord agrees to lease to the Tenant the property located at 123 Business Rd, Suite 456, Commerce City, ST 78901 (the "Leased Premises").', bbox: { x1: 10, y1: 50, x2: 90, y2: 60 }, confidence: 0.85 }, // Low confidence
      { id: 'h2-2', type: 'heading', level: 2, text: '2. Rent Schedule', bbox: { x1: 10, y1: 65, x2: 90, y2: 70 }, confidence: 0.99 },
      { id: 'p3', type: 'paragraph', text: 'Tenant shall pay rent in accordance with the following schedule:', bbox: { x1: 10, y1: 72, x2: 90, y2: 78 }, confidence: 0.96 },
      { 
        id: 't1',
        type: 'table',
        bbox: { x1: 10, y1: 80, x2: 90, y2: 120 },
        rows: [
          [{id: 'c1', text: 'Year', row: 0, col: 0, confidence: 0.99}, {id: 'c2', text: 'Monthly Rent', row: 0, col: 1, confidence: 0.99}, {id: 'c3', text: 'Annual Rent', row: 0, col: 2, confidence: 0.98}],
          [{id: 'c4', text: 'Year 1 (2024)', row: 1, col: 0, confidence: 0.95}, {id: 'c5', text: '$5,000.00', row: 1, col: 1, confidence: 0.99}, {id: 'c6', text: '$60,000.00', row: 1, col: 2, confidence: 0.99}],
          [{id: 'c7', text: 'Year 2 (2025)', row: 2, col: 0, confidence: 0.96}, {id: 'c8', text: '$5,150.00', row: 2, col: 1, confidence: 0.99}, {id: 'c9', text: '$61,800.00', row: 2, col: 2, confidence: 0.99}],
          [{id: 'c10', text: 'Year 3 (2026)', row: 3, col: 0, confidence: 0.94}, {id: 'c11', text: '$5,304.50', row: 3, col: 1, confidence: 0.78}, {id: 'c12', text: '$63,654.00', row: 3, col: 2, confidence: 0.88}], // Low confidence cells
        ],
      }
    ]
  }
];

// Mock data representing the translated version. Confidence scores are only on the original.
const mockTranslatedLeaseData: TranslatedData[] = [
    {
      pageNumber: 1,
      blocks: [
        { id: 'h1', type: 'heading', level: 1, text: 'CONTRATO DE ARRENDAMIENTO COMERCIAL', bbox: { x1: 10, y1: 10, x2: 90, y2: 20 } },
        { id: 'p1', type: 'paragraph', text: 'Este Contrato de Arrendamiento ("Contrato") se celebra entre Nombre del Arrendador ("Arrendador") y Nombre del Arrendatario ("Arrendatario").', bbox: { x1: 10, y1: 25, x2: 90, y2: 35 } },
        { id: 'h2', type: 'heading', level: 2, text: '1. Locales Arrendados', bbox: { x1: 10, y1: 40, x2: 90, y2: 45 } },
        { id: 'p2', type: 'paragraph', text: 'El Arrendador se compromete a arrendar al Arrendatario la propiedad ubicada en 123 Business Rd, Suite 456, Commerce City, ST 78901 (los "Locales Arrendados").', bbox: { x1: 10, y1: 50, x2: 90, y2: 60 } },
        { id: 'h2-2', type: 'heading', level: 2, text: '2. Calendario de Pagos de Alquiler', bbox: { x1: 10, y1: 65, x2: 90, y2: 70 } },
        { id: 'p3', type: 'paragraph', text: 'El Arrendatario pagará el alquiler de acuerdo con el siguiente calendario:', bbox: { x1: 10, y1: 72, x2: 90, y2: 78 } },
        { 
          id: 't1',
          type: 'table',
          bbox: { x1: 10, y1: 80, x2: 90, y2: 120 },
          rows: [
            [{id: 'c1', text: 'Año', row: 0, col: 0}, {id: 'c2', text: 'Alquiler Mensual', row: 0, col: 1}, {id: 'c3', text: 'Alquiler Anual', row: 0, col: 2}],
            [{id: 'c4', text: 'Año 1 (2024)', row: 1, col: 0}, {id: 'c5', text: '$5,000.00', row: 1, col: 1}, {id: 'c6', text: '$60,000.00', row: 1, col: 2}],
            [{id: 'c7', text: 'Año 2 (2025)', row: 2, col: 0}, {id: 'c8', text: '$5,150.00', row: 2, col: 1}, {id: 'c9', text: '$61,800.00', row: 2, col: 2}],
            [{id: 'c10', text: 'Año 3 (2026)', row: 3, col: 0}, {id: 'c11', text: '$5,304.50', row: 3, col: 1}, {id: 'c12', text: '$63,654.00', row: 3, col: 2}],
          ],
        }
      ]
    }
  ];

export const mockUploadAndProcess = async (file: File): Promise<ExtractedData[]> => {
  console.log(`Mock processing file: ${file.name}`);
  await sleep(4800); // Simulate OCR, layout analysis, etc.
  return JSON.parse(JSON.stringify(mockExtractedLeaseData)); // Return a deep copy
};

export const mockTranslate = async (data: ExtractedData[], sourceLang: string, targetLang: string): Promise<TranslatedData[]> => {
  console.log('Mock translating data...');
  console.log(`Source: ${sourceLang}, Target: ${targetLang}`);
  await sleep(100); // Translation is fast after the main processing
  // In a real app, you would translate data here. We just return a pre-translated mock.
  const translated = JSON.parse(JSON.stringify(mockTranslatedLeaseData));
  
  // The translated data structure should mirror the original, so we'll ensure that.
  // This simplistic mapping assumes the blocks are in the same order.
  for (let i = 0; i < data.length; i++) {
    for (let j = 0; j < data[i].blocks.length; j++) {
      // FIX: Add type guards to correctly narrow down the block types before accessing properties.
      // This resolves type errors by ensuring properties like 'rows' are only accessed on table blocks.
      const originalBlock = data[i].blocks[j];
      const translatedBlock = translated[i].blocks[j];

      // Copy original confidence to the translated version for preview purposes
      if (originalBlock.type !== 'table' && translatedBlock.type !== 'table') {
        translatedBlock.confidence = originalBlock.confidence;
      } else if (originalBlock.type === 'table' && translatedBlock.type === 'table') {
         for(let r = 0; r < originalBlock.rows.length; r++) {
            for (let c = 0; c < originalBlock.rows[r].length; c++) {
                translatedBlock.rows[r][c].confidence = originalBlock.rows[r][c].confidence;
            }
         }
      }
    }
  }

  return translated;
};
