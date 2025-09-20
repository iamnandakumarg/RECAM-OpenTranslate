import type { Handler } from "@netlify/functions";
import { GoogleGenAI, Type } from "@google/genai";

// Define types locally for the function
interface TranslatedData {
  pageNumber: number;
  blocks: any[]; // Using any for simplicity
}

type Formality = 'default' | 'formal' | 'informal';

// Initialize the Gemini client. API key is set in Netlify environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const translationSchema = {
    type: Type.OBJECT,
    properties: {
        translatedPages: {
            type: Type.ARRAY,
            description: "An array of page objects, with all text content translated.",
            items: {
                type: Type.OBJECT,
                properties: {
                    pageNumber: { type: Type.INTEGER },
                    blocks: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.STRING },
                                type: { type: Type.STRING },
                                level: { type: Type.INTEGER },
                                text: { type: Type.STRING },
                                rows: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                id: { type: Type.STRING },
                                                text: { type: Type.STRING },
                                                row: { type: Type.INTEGER },
                                                col: { type: Type.INTEGER },
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};


const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { 
        pageToTranslate, 
        sourceLang, 
        targetLang, 
        formality, 
        glossary 
    } = JSON.parse(event.body || '{}');

    if (!pageToTranslate || !targetLang) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required translation parameters.' }) };
    }
    
    const sourceLanguageName = sourceLang === 'auto' ? 'the auto-detected source language' : sourceLang;

    const systemInstruction = `You are a highly precise JSON translation API. Your sole function is to translate the \`text\` fields within a JSON object from a source language to a target language.
    **INPUT JSON STRUCTURE:** The user will provide a JSON object with a "pages" array containing a single page object.
    **TASK & OUTPUT REQUIREMENTS:**
    1.  **Translate**: Translate all values associated with the \`"text"\` key from ${sourceLanguageName} to ${targetLang}.
    2.  **Formality**: Apply a ${formality === 'default' ? 'neutral' : formality} tone.
    ${glossary && glossary.trim() ? `3.  **Glossary**: Strictly apply the following custom translations:\n${glossary.trim()}` : ''}
    4.  **Preserve Structure**: The output JSON MUST have the exact same structure, keys, IDs, and order as the input JSON. Only the \`"text"\` values should be changed.
    5.  **Valid JSON**: The output MUST be a single, syntactically correct, complete JSON object. Ensure all double quotes inside translated text are properly escaped. Do NOT include any explanatory text, comments, or markdown.
    **OUTPUT JSON STRUCTURE (for the \`translatedPages\` key):** The output will be placed inside a root object with a \`translatedPages\` key, adhering to the required schema.`;

    const contentToTranslate = { pages: [JSON.parse(JSON.stringify(pageToTranslate))] };
    contentToTranslate.pages.forEach((page: any) => {
        (page.blocks || []).forEach((block: any) => {
            delete block.confidence;
            delete block.bbox;
            if (block.type === 'table') {
                (block.rows || []).forEach((row: any[]) => (row || []).forEach(cell => {
                    delete cell.confidence;
                }));
            }
        });
    });

    const prompt = JSON.stringify(contentToTranslate);

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: translationSchema,
        }
    });

    let jsonText = response.text.trim();
    const firstBrace = jsonText.indexOf('{');
    const lastBrace = jsonText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonText = jsonText.substring(firstBrace, lastBrace + 1);
    }
    
    const parsed = JSON.parse(jsonText);
    const translatedPageArray = parsed.translatedPages as TranslatedData[];

    if (!translatedPageArray || !Array.isArray(translatedPageArray) || translatedPageArray.length === 0) {
        throw new Error(`AI failed to return translation for page ${pageToTranslate.pageNumber}.`);
    }

    let translatedPage = translatedPageArray[0];

    // Merge original confidence scores and bboxes back into the translated data
    translatedPage.blocks = (translatedPage.blocks || []).map((translatedBlock, blockIndex) => {
        const originalBlock = pageToTranslate.blocks[blockIndex];
        if (!originalBlock) return translatedBlock;

        const newBlock = { ...translatedBlock, bbox: originalBlock.bbox };
        if ('confidence' in originalBlock && originalBlock.confidence !== undefined) {
            (newBlock as any).confidence = originalBlock.confidence;
        }

        if (newBlock.type === 'table' && originalBlock.type === 'table') {
            newBlock.rows = (newBlock.rows || []).map((translatedRow, rowIndex) => 
                (translatedRow || []).map((translatedCell, cellIndex) => {
                    const originalCell = originalBlock.rows?.[rowIndex]?.[cellIndex];
                    const newCell = { ...translatedCell };
                    if (originalCell && 'confidence' in originalCell && originalCell.confidence !== undefined) {
                        newCell.confidence = originalCell.confidence;
                    }
                    return newCell;
                })
            );
        }
        return newBlock;
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(translatedPage),
    };

  } catch (error) {
    console.error("Error in translate function:", error);
    const message = error instanceof Error ? error.message : "An unknown error occurred.";
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Failed to translate content: ${message}` }),
    };
  }
};

export { handler };
