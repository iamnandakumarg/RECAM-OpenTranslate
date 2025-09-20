import { GoogleGenAI, Type } from "@google/genai";
import type { Handler, HandlerEvent } from "@netlify/functions";

// Centralized error response function
const createErrorResponse = (statusCode: number, message: string, error?: any) => {
    console.error("Function Error:", message, error); // Log the full error for Netlify logs
    return {
        statusCode,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: message }),
    };
};

// Helper to strip markdown from Gemini's JSON response
const sanitizeJson = (text: string): string => {
    // Finds a JSON block between ```json and ```
    const match = text.match(/```json\n([\s\S]*?)\n```/);
    if (match && match[1]) {
        return match[1].trim();
    }
    // Fallback for cases where the markdown is just ``` ```
    const plainMatch = text.match(/```([\s\S]*?)```/);
    if (plainMatch && plainMatch[1]) {
        return plainMatch[1].trim();
    }
    return text.trim();
};

const handler: Handler = async (event: HandlerEvent) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }
    if (!process.env.API_KEY) {
        return createErrorResponse(500, "API_KEY environment variable is not set.");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    let body;

    try {
        body = JSON.parse(event.body || "{}");
    } catch (e) {
        return createErrorResponse(400, "Invalid JSON in request body.", e);
    }
    
    const { type } = body;

    try {
        if (type === 'text') {
            const { texts, sourceLang, targetLang } = body;
            if (!Array.isArray(texts)) {
                return createErrorResponse(400, "Invalid request: 'texts' must be an array.");
            }
            if (texts.length === 0 || texts.every(t => !t.trim())) {
                return {
                    statusCode: 200,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(texts),
                };
            }

            const sourceLangDisplay = sourceLang === 'auto' ? 'the auto-detected language' : sourceLang;
            const targetLangDisplay = targetLang;

            const systemInstruction = `You are a highly skilled translation engine. Your task is to translate a JSON array of strings.
- The user will provide an array of strings to be translated from ${sourceLangDisplay} to ${targetLangDisplay}.
- You MUST respond with ONLY a valid JSON array of strings.
- The translated array must have the exact same number of elements as the input array.
- Preserve any original markdown, HTML, or special characters in the translation.
- Do not add any commentary, greetings, or extra text outside of the JSON array.`;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: JSON.stringify(texts),
                config: {
                    systemInstruction,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                }
            });
            
            let translatedTexts;
            try {
                const sanitized = sanitizeJson(response.text);
                translatedTexts = JSON.parse(sanitized);
            } catch (e) {
                return createErrorResponse(500, "Failed to parse translated text from AI. The model returned invalid JSON.", { originalResponse: response.text });
            }

            if (!Array.isArray(translatedTexts) || translatedTexts.length !== texts.length) {
                return createErrorResponse(500, "Translation failed: The number of translated segments does not match the original.", { originalCount: texts.length, translatedCount: translatedTexts.length });
            }

            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(translatedTexts),
            };

        } else if (type === 'image') {
            const { base64Image, mimeType, sourceLang, targetLang } = body;
            const sourceLangDisplay = sourceLang === 'auto' ? 'the auto-detected language' : sourceLang;
            const targetLangDisplay = targetLang;
            
            const imagePart = { inlineData: { mimeType, data: base64Image } };
            const textPart = { 
                text: `You are an expert document analyst. Analyze the following image, identify all text elements, and translate them from ${sourceLangDisplay} to ${targetLangDisplay}. Preserve the structure by identifying headings.
- Respond ONLY with a valid JSON object that follows this schema: { "lines": [{ "text": "string", "isHeading": boolean }] }.
- 'isHeading' should be true for titles, subtitles, or visually distinct headings.
- Ensure all identifiable text is captured and translated accurately.`
            };

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
                    },
                }
            });
            
            let parsedResult;
            try {
                const sanitized = sanitizeJson(response.text);
                parsedResult = JSON.parse(sanitized);
            } catch (e) {
                return createErrorResponse(500, "Failed to parse translated image data from AI. The model returned invalid JSON.", { originalResponse: response.text });
            }
            
            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(parsedResult),
            };

        } else {
            return createErrorResponse(400, `Unsupported request type: '${type}'.`);
        }

    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during AI processing.";
        return createErrorResponse(502, `Error communicating with the AI service: ${errorMessage}`, e);
    }
};

export { handler };
