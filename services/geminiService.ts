import { TranslatedImageResponse } from '../types';

export async function translateTexts(
    texts: string[], 
    sourceLang: string, 
    targetLang: string
): Promise<string[]> {
  if (!texts || texts.length === 0 || texts.every(t => !t.trim())) {
    return texts; // Return original array if empty or contains only whitespace
  }

  try {
      const response = await fetch('/.netlify/functions/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'text', texts, sourceLang, targetLang }),
      });

      if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to translate and could not parse error response.' }));
          throw new Error(errorData.error || `Translation failed with status: ${response.status}`);
      }

      const result = await response.json();
      return result;

  } catch (error) {
    console.error("Error calling translation function:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    throw new Error(`Failed to translate the document. ${errorMessage}`);
  }
}

export async function translateImage(
    base64Image: string,
    mimeType: string,
    sourceLang: string,
    targetLang: string
): Promise<TranslatedImageResponse> {
    try {
        const response = await fetch('/.netlify/functions/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'image', base64Image, mimeType, sourceLang, targetLang }),
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Failed to translate image and could not parse error response.' }));
            throw new Error(errorData.error || `Image translation failed with status: ${response.status}`);
        }

        const result = await response.json();
        return result;

    } catch (error) {
        console.error("Error calling image translation function:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to translate the document via image analysis. ${errorMessage}`);
    }
}
