import { GoogleGenAI, Type } from "@google/genai";
import { supabase } from './supabaseClient';
import type { ExtractedData, TranslatedData, DocumentBlock } from '../types';
import type { Formality } from '../App';

// Initialize the Gemini client.
// It's assumed that process.env.API_KEY is available in the execution environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

// Helper to convert a file object to a base64 generative part for the Gemini API.
const fileToGenerativePart = async (file: File) => {
  const base64EncodedData = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });

  return {
    inlineData: {
      mimeType: file.type,
      data: base64EncodedData,
    },
  };
};

// JSON schema for Gemini to structure the extracted document content.
const documentSchema = {
    type: Type.OBJECT,
    properties: {
        pages: {
            type: Type.ARRAY,
            description: "An array of page objects, each representing a page in the document.",
            items: {
                type: Type.OBJECT,
                required: ["pageNumber", "blocks"],
                properties: {
                    pageNumber: { type: Type.INTEGER, description: "The page number, starting from 1." },
                    blocks: {
                        type: Type.ARRAY,
                        description: "An array of content blocks found on the page.",
                        items: {
                            type: Type.OBJECT,
                            required: ["id", "type"],
                            properties: {
                                id: { type: Type.STRING, description: "A unique identifier for the block (e.g., 'block-1')." },
                                type: { type: Type.STRING, description: "The type of the block ('heading', 'paragraph', or 'table')." },
                                level: { type: Type.INTEGER, description: "For headings, the level (1 for H1, 2 for H2, etc.)." },
                                text: { type: Type.STRING, description: "The text content of the block. For tables, this should be omitted." },
                                confidence: { type: Type.NUMBER, description: "The OCR confidence score from 0 to 1 for the extracted text."},
                                rows: { 
                                    type: Type.ARRAY,
                                    description: "For blocks of type 'table', an array of row objects.",
                                    items: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            required: ["id", "text", "row", "col"],
                                            properties: {
                                                id: { type: Type.STRING, description: "A unique identifier for the cell (e.g., 'cell-1-1')." },
                                                text: { type: Type.STRING, description: "The text content of the table cell." },
                                                row: { type: Type.INTEGER, description: "The row index of the cell (0-based)." },
                                                col: { type: Type.INTEGER, description: "The column index of the cell (0-based)." },
                                                confidence: { type: Type.NUMBER, description: "The OCR confidence score for the cell text from 0 to 1."},
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

// JSON schema for Gemini to structure the translated content.
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
 * Uses Gemini to extract structured content from a file.
 */
export const extractContent = async (file: File): Promise<ExtractedData[]> => {
    console.log('Calling Gemini for content extraction...');
    try {
        const imagePart = await fileToGenerativePart(file);

        const prompt = `You are an expert document processor. Analyze the provided document image or PDF and perform Optical Character Recognition (OCR) and layout analysis.
    Extract all content, including headings, paragraphs, and tables.
    Identify heading levels (e.g., H1=1, H2=2).
    For each extracted text element (paragraphs, headings, table cells), provide an estimated confidence score between 0 and 1.
    Structure the output according to the provided JSON schema. Ensure every block and cell has a unique 'id'. For non-table blocks, 'text' should contain the content. For table blocks, the content must be in the 'rows' property, and the 'text' property should be omitted.
    `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, { text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: documentSchema,
            },
        });

        const jsonText = response.text.trim();
        const parsed = JSON.parse(jsonText);
        const extractedData = parsed.pages as ExtractedData[];
        
        if (!extractedData || !Array.isArray(extractedData)) {
          throw new Error("AI failed to return the expected data structure for document content.");
        }
        
        console.log('Content extracted successfully.');
        return extractedData;
    } catch (error) {
        console.error("Error processing document with Gemini:", error);
        const message = error instanceof Error ? error.message : "An unknown error occurred";
        throw new Error(`Failed to extract content from the document: ${message}`);
    }
};


/**
 * Translates structured document data using Gemini.
 */
export const translate = async (
    data: ExtractedData[], 
    sourceLang: string, 
    targetLang: string,
    formality: Formality,
    glossary: string
): Promise<TranslatedData[]> => {
  console.log(`Calling Gemini for translation from ${sourceLang} to ${targetLang}...`);
  
  const sourceLanguageName = sourceLang === 'auto' ? 'the auto-detected source language' : sourceLang;

  const systemInstruction = `You are a highly precise JSON translation API. Your sole function is to translate the \`text\` fields within a JSON object from a source language to a target language.

**INPUT JSON STRUCTURE:**
The user will provide a JSON object with the following structure:
{
  "pages": [
    {
      "pageNumber": <integer>,
      "blocks": [
        {
          "id": "<string>",
          "type": "<'heading'|'paragraph'|'table'>",
          "level": <integer, optional>,
          "text": "<string to translate, optional>",
          "rows": [
            [
              {
                "id": "<string>",
                "text": "<string to translate>",
                "row": <integer>,
                "col": <integer>
              }
            ]
          ]
        }
      ]
    }
  ]
}

**TASK & OUTPUT REQUIREMENTS:**
1.  **Translate**: Translate all values associated with the \`"text"\` key from ${sourceLanguageName} to ${targetLang}.
2.  **Formality**: Apply a ${formality === 'default' ? 'neutral' : formality} tone.
${glossary.trim() ? `3.  **Glossary**: Strictly apply the following custom translations:\n${glossary.trim()}` : ''}
4.  **Preserve Structure**: The output JSON MUST have the exact same structure, keys, IDs, and order as the input JSON. Only the \`"text"\` values should be changed.
5.  **Valid JSON**: The output MUST be a single, syntactically correct, complete JSON object.
    *   **Crucially, ensure all double quotes inside translated text are properly escaped with a backslash (e.g., "he said \\"hello\\"").**
    *   Do NOT include any explanatory text, comments, or markdown code fences (like \`\`\`json) in your response. The response must start with '{' and end with '}'.
    *   Do NOT truncate the output. The JSON must be complete.

**OUTPUT JSON STRUCTURE (for the \`translatedPages\` key):**
The output will be placed inside a root object with a \`translatedPages\` key, adhering to the required schema.
`;

  // Create a deep copy and remove confidence/bbox scores to save tokens.
  const contentToTranslate = { pages: JSON.parse(JSON.stringify(data)) };
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

  try {
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
    // Gemini can sometimes wrap the JSON in markdown. This robustly extracts the JSON object.
    const firstBrace = jsonText.indexOf('{');
    const lastBrace = jsonText.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonText = jsonText.substring(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(jsonText);
    let translatedData = parsed.translatedPages as TranslatedData[];

    if (!translatedData || !Array.isArray(translatedData)) {
       throw new Error("AI failed to return the expected data structure for translation.");
    }
    
    // Merge original confidence scores and bboxes back into the translated data for UI use.
    translatedData = translatedData.map((translatedPage, pageIndex) => ({
      ...translatedPage,
      blocks: (translatedPage.blocks || []).map((translatedBlock, blockIndex) => {
        const originalBlock = data[pageIndex]?.blocks[blockIndex];
        if (!originalBlock) return translatedBlock;

        const newBlock: DocumentBlock = { ...translatedBlock, bbox: originalBlock.bbox };
        if ('confidence' in originalBlock && originalBlock.confidence !== undefined) {
          (newBlock as any).confidence = originalBlock.confidence;
        }

        if (newBlock.type === 'table' && originalBlock.type === 'table') {
          const originalRows = originalBlock.rows || [];
          newBlock.rows = (newBlock.rows || []).map((translatedRow, rowIndex) => 
            (translatedRow || []).map((translatedCell, cellIndex) => {
              const originalCell = originalRows[rowIndex]?.[cellIndex];
              const newCell = { ...translatedCell };
              if (originalCell && 'confidence' in originalCell && originalCell.confidence !== undefined) {
                newCell.confidence = originalCell.confidence;
              }
              return newCell;
            })
          );
        }
        return newBlock;
      })
    }));

    return translatedData;
  } catch (error) {
    console.error("Error translating content with Gemini:", error);
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    throw new Error(`Failed to translate the document content: ${message}`);
  }
};