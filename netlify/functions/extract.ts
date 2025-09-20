import type { Handler } from "@netlify/functions";
import { GoogleGenAI, Type } from "@google/genai";

// Define types locally for the function
interface ExtractedData {
  pageNumber: number;
  blocks: any[]; // Using any for simplicity in serverless function
}

// Initialize the Gemini client. API key is set in Netlify environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

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

const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const { fileData, mimeType } = JSON.parse(event.body || '{}');
    if (!fileData || !mimeType) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing file data or mime type' }) };
    }

    const imagePart = {
      inlineData: {
        mimeType,
        data: fileData,
      },
    };

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

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed),
    };

  } catch (error) {
    console.error("Error in extract function:", error);
    const message = error instanceof Error ? error.message : "An unknown error occurred.";
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Failed to extract content: ${message}` }),
    };
  }
};

export { handler };
