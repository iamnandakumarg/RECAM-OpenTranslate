export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface TextBlock {
  id: string;
  type: 'heading' | 'paragraph' | 'list_item';
  level?: number; // For H1, H2, etc.
  text: string;
  bbox: BoundingBox;
  confidence?: number; // OCR confidence score (0 to 1)
}

export interface TableCell {
  id: string;
  text: string;
  row: number;
  col: number;
  confidence?: number; // OCR confidence score (0 to 1)
}

export interface TableBlock {
  id:string;
  type: 'table';
  rows: TableCell[][];
  bbox: BoundingBox;
}

export type DocumentBlock = TextBlock | TableBlock;

export interface ExtractedData {
  pageNumber: number;
  blocks: DocumentBlock[];
}

export interface TranslatedData extends ExtractedData {}

export interface GlossaryTerm {
  source: string;
  target: string;
}

export interface FailedTranslation {
  pageNumber: number;
  error: string;
}

export type TranslationResult = TranslatedData | FailedTranslation;