import { GoogleGenAI, Type } from "@google/genai";
import { LANGUAGES } from '../constants';
import { TranslatedImageResponse, TranslatedLine } from '../types';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.warn("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export async function translateTexts(
    texts: string[], 
    sourceLang: string, 
    targetLang: string
): Promise<string[]> {
  if (!texts || texts.length === 0 || texts.every(t => !t.trim())) {
    return texts; // Return original array if empty or contains only whitespace
  }
  
  const sourceLanguageName = LANGUAGES.find(l => l.code === sourceLang)?.name || 'Auto-Detected';
  const targetLanguageName = LANGUAGES.find(l => l.code === targetLang)?.name;

  if (!targetLanguageName) {
    throw new Error(`Invalid target language: ${targetLang}`);
  }

  const prompt = `
    You are an expert translation engine.
    - Source Language: ${sourceLanguageName}. If 'Auto-Detected', identify the language from the text.
    - Target Language: ${targetLanguageName}.
    - IMPORTANT: Preserve original formatting within each string, like markdown or special characters.
    - Your task is to translate every string in the provided JSON array.
    - You MUST return a JSON array with the exact same number of elements as the input array, where each element is the translated string.
  `;
  
  const contents = `Translate the following array of text:\n ${JSON.stringify(texts)}`;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [prompt, contents].join('\n'),
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.STRING,
                },
            },
        },
    });

    const jsonText = response.text.trim();
    const translatedArray = JSON.parse(jsonText);

    if (!Array.isArray(translatedArray) || translatedArray.length !== texts.length) {
        throw new Error('Translation API returned a malformed response. The number of translated items does not match the original.');
    }

    return translatedArray;

  } catch (error) {
    console.error("Error translating text with Gemini API:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('JSON')) {
        throw new Error('Failed to parse the translation response. The AI may have returned an invalid format.');
    }
    throw new Error("Failed to translate the document. The API may be unavailable or the request was blocked.");
  }
}


export async function translateImage(
    base64Image: string,
    mimeType: string,
    sourceLang: string,
    targetLang: string
): Promise<TranslatedImageResponse> {
    const sourceLanguageName = LANGUAGES.find(l => l.code === sourceLang)?.name || 'Auto-Detected';
    const targetLanguageName = LANGUAGES.find(l => l.code === targetLang)?.name;

    if (!targetLanguageName) {
        throw new Error(`Invalid target language: ${targetLang}`);
    }

    const imagePart = {
        inlineData: {
            mimeType: mimeType,
            data: base64Image,
        },
    };

    const textPart = {
        text: `You are an expert translator and document analyst. Your task is to accurately translate all text visible in the provided image and identify its structure.
- Source Language: ${sourceLanguageName}. If 'Auto-Detected', identify the language from the text.
- Target Language: ${targetLanguageName}.
- Analyze the text and identify headings and subheadings based on their visual prominence (font size, weight, capitalization).
- You MUST return a JSON object with the following schema: { "lines": [{ "text": "string", "isHeading": boolean }] }.
- 'lines' should be an array of objects. Each object represents a line of text from top to bottom.
- 'text' should be the translated text of the line. Preserve original line breaks within the text content.
- 'isHeading' should be true if the line is a heading or subheading, and false otherwise.
- Return only the JSON object, without any additional comments, introductions, or explanations.`,
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        lines: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    text: { type: Type.STRING },
                                    isHeading: { type: Type.BOOLEAN }
                                },
                                required: ["text", "isHeading"]
                            }
                        }
                    },
                    required: ["lines"]
                }
            }
        });

        const jsonText = response.text.trim();
        const result: TranslatedImageResponse = JSON.parse(jsonText);

        if (!result || !Array.isArray(result.lines)) {
             throw new Error("Invalid JSON structure received from translation API.");
        }

        return result;

    } catch (error) {
        console.error("Error translating image with Gemini API:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('JSON')) {
            throw new Error('Failed to parse the translation response. The AI may have returned an invalid format.');
        }
        throw new Error("Failed to translate the document via image analysis. The API may be unavailable or the request was blocked.");
    }
}
