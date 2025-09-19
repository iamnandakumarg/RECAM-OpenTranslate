export interface Language {
  code: string;
  name: string;
}

export interface ProcessStep {
  name: string;
}

export type Status = 'idle' | 'processing' | 'processed' | 'error';

export interface HistoryItem {
  id: number;
  file_name: string;
  source_language: string;
  target_language: string;
  created_at: string;
  translated_text: string;
}

export interface TranslatedLine {
    text: string;
    isHeading: boolean;
}

export interface TranslatedImageResponse {
    lines: TranslatedLine[];
}