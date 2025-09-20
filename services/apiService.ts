import { supabase } from './supabaseClient';
import type { ExtractedData, TranslatedData } from '../types';
import type { Formality } from '../App';

// Helper to convert a file object to a base64 string.
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};


/**
 * Deletes a document from Supabase Storage.
 */
export const deleteDocument = async (filePath: string) => {
    const { error } = await supabase.storage.from('documents').remove([filePath]);
    if (error) {
        console.error('Error deleting file from Supabase Storage:', error);
        throw new Error('Could not delete file from storage.');
    }
    return { success: true };
};

/**
 * Uploads a file to Supabase Storage.
 * @returns The path of the uploaded file.
 */
export const uploadFile = async (file: File): Promise<string> => {
    const filePath = `public/${Date.now()}-${file.name}`;
    console.log(`Uploading file to Supabase Storage: ${filePath}`);
    const { error } = await supabase.storage.from('documents').upload(filePath, file);

    if (error) {
        console.error('Error uploading file:', error);
        throw new Error(`Supabase upload failed: ${error.message}`);
    }

    console.log('File uploaded successfully.');
    return filePath;
};

/**
 * Uses a Netlify function to extract structured content from a file.
 */
export const extractContent = async (file: File): Promise<ExtractedData[]> => {
    console.log('Calling Netlify function for content extraction...');
    try {
        const base64Data = await fileToBase64(file);

        const response = await fetch('/.netlify/functions/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fileData: base64Data,
                mimeType: file.type,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(errorBody.error || `Request failed with status ${response.status}`);
        }

        const data = await response.json();
        const extractedData = data.pages as ExtractedData[];
        
        if (!extractedData || !Array.isArray(extractedData)) {
          throw new Error("Function failed to return the expected data structure for document content.");
        }
        
        console.log('Content extracted successfully.');
        return extractedData;
    } catch (error) {
        console.error("Error calling extract function:", error);
        const message = error instanceof Error ? error.message : "An unknown error occurred";
        throw new Error(`Failed to extract content from the document: ${message}`);
    }
};


/**
 * Translates structured document data page by page using a Netlify function.
 */
export const translate = async (
    data: ExtractedData[], 
    sourceLang: string, 
    targetLang: string,
    formality: Formality,
    glossary: string,
    onProgress: (progress: number) => void
): Promise<TranslatedData[]> => {
  console.log(`Calling Netlify function for translation from ${sourceLang} to ${targetLang}...`);
  
    const allTranslatedPages: TranslatedData[] = [];
    const totalPages = data.length;

    for (let i = 0; i < totalPages; i++) {
        const pageToTranslate = data[i];
        
        try {
            const response = await fetch('/.netlify/functions/translate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                pageToTranslate,
                sourceLang,
                targetLang,
                formality,
                glossary
              })
            });

            if (!response.ok) {
              const errorBody = await response.json();
              throw new Error(errorBody.error || `Request failed with status ${response.status}`);
            }

            const translatedPage = await response.json();
            allTranslatedPages.push(translatedPage);

        } catch (error) {
            console.error(`Error translating page ${pageToTranslate.pageNumber}:`, error);
            const message = error instanceof Error ? error.message : "An unknown error occurred";
            throw new Error(`Failed to translate page ${pageToTranslate.pageNumber}: ${message}`);
        }
        
        onProgress(((i + 1) / totalPages) * 100);
    }

    return allTranslatedPages;
};