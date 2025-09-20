import { GoogleGenAI, Type } from "@google/genai";
import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

// Types copied from types.ts to make the function self-contained
interface TranslatedLine {
    text: string;
    isHeading: boolean;
}
interface TranslatedImageResponse {
    lines: TranslatedLine[];
}
interface Language {
    code: string;
    name: string;
}

// LANGUAGES constant copied from constants.ts to make the function self-contained
const LANGUAGES: Language[] = [
    { code: 'af', name: 'Afrikaans' }, { code: 'sq', name: 'Albanian' },
    { code: 'am', name: 'Amharic' }, { code: 'ar', name: 'Arabic' },
    { code: 'hy', name: 'Armenian' }, { code: 'az', name: 'Azerbaijani' },
    { code: 'eu', name: 'Basque' }, { code: 'be', name: 'Belarusian' },
    { code: 'bn', name: 'Bengali' }, { code: 'bs', name: 'Bosnian' },
    { code: 'bg', name: 'Bulgarian' }, { code: 'ca', name: 'Catalan' },
    { code: 'zh', name: 'Chinese' }, { code: 'hr', name: 'Croatian' },
    { code: 'cs', name: 'Czech' }, { code: 'da', name: 'Danish' },
    { code: 'nl', name: 'Dutch' }, { code: 'en', name: 'English' },
    { code: 'et', name: 'Estonian' }, { code: 'tl', name: 'Filipino' },
    { code: 'fi', name: 'Finnish' }, { code: 'fr', name: 'French' },
    { code: 'gl', name: 'Galician' }, { code: 'ka', name: 'Georgian' },
    { code: 'de', name: 'German' }, { code: 'el', name: 'Greek' },
    { code: 'gu', name: 'Gujarati' }, { code: 'ha', name: 'Hausa' },
    { code: 'he', name: 'Hebrew' }, { code: 'hi', name: 'Hindi' },
    { code: 'hu', name: 'Hungarian' }, { code: 'is', name: 'Icelandic' },
    { code: 'ig', name: 'Igbo' }, { code: 'id', name: 'Indonesian' },
    { code: 'ga', name: 'Irish' }, { code: 'it', name: 'Italian' },
    { code: 'ja', name: 'Japanese' }, { code: 'jv', name: 'Javanese' },
    { code: 'kn', name: 'Kannada' }, { code: 'kk', name: 'Kazakh' },
    { code: 'km', name: 'Khmer' }, { code: 'ko', name: 'Korean' },
    { code: 'lo', name: 'Lao' }, { code: 'lv', name: 'Latvian' },
    { code: 'lt', name: 'Lithuanian' }, { code: 'lb', name: 'Luxembourgish' },
    { code: 'mk', name: 'Macedonian' }, { code: 'mg', name: 'Malagasy' },
    { code: 'ms', name: 'Malay' }, { code: 'ml', name: 'Malayalam' },
    { code: 'mt', name: 'Maltese' }, { code: 'mi', name: 'Maori' },
    { code: 'mr', name: 'Marathi' }, { code: 'mn', name: 'Mongolian' },
    { code: 'my', name: 'Myanmar (Burmese)' }, { code: 'ne', name: 'Nepali' },
    { code: 'no', name: 'Norwegian' }, { code: 'ps', name: 'Pashto' },
    { code: 'fa', name: 'Persian' }, { code: 'pl', name: 'Polish' },
    { code: 'pt', name: 'Portuguese' }, { code: 'pa', name: 'Punjabi' },
    { code: 'ro', name: 'Romanian' }, { code: 'ru', name: 'Russian' },
    { code: 'sr', name: 'Serbian' }, { code: 'si', name: 'Sinhala' },
    { code: 'sk', name: 'Slovak' }, { code: 'sl', name: 'Slovenian' },
    { code: 'es', name: 'Spanish' }, { code: 'sw', name: 'Swahili' },
    { code: 'sv', name: 'Swedish' }, { code: 'ta', name: 'Tamil' },
    { code: 'te', name: 'Telugu' }, { code: 'th', name: 'Thai' },
    { code: 'tr', name: 'Turkish' }, { code: 'uk', name: 'Ukrainian' },
    { code: 'ur', name: 'Urdu' }, { code: 'uz', name: 'Uzbek' },
    { code: 'vi', name: 'Vietnamese' }, { code: 'cy', name: 'Welsh' },
    { code: 'yo', name: 'Yoruba' }, { code: 'zu', name: 'Zulu' },
];

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

async function translateTextsHandler(body: any): Promise<string[]> {
  const { texts, sourceLang, targetLang } = body;
  const sourceLanguageName = LANGUAGES.find(l => l.code === sourceLang)?.name || 'Auto-Detected';
  const targetLanguageName = LANGUAGES.find(l => l.code === targetLang)?.name;

  if (!targetLanguageName) {
    throw new Error(`Invalid target language: ${targetLang}`);
  }

  const systemInstruction = `You are an expert translation engine. Your task is to translate user-provided text.
- You will be given a source language, a target language, and a JSON array of strings to translate.
- If the source language is 'Auto-Detected', you must first identify the language of the text.
- IMPORTANT: Preserve original formatting within each string, such as markdown, newlines, or special characters.
- You MUST return a JSON array of strings.
- The returned array must have the exact same number of elements as the input array. Each element must be the translated string corresponding to the original at the same index.
- Respond ONLY with the JSON array, without any extra text, commentary, or markdown backticks.`;
  
  const userMessage = `Source Language: ${sourceLanguageName}
Target Language: ${targetLanguageName}

Translate the following JSON array of texts:
${JSON.stringify(texts)}`;

  const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userMessage,
      config: {
          systemInstruction,
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
  const sanitizedJsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  const translatedArray = JSON.parse(sanitizedJsonText);

  if (!Array.isArray(translatedArray) || translatedArray.length !== texts.length) {
      throw new Error('Translation API returned a malformed response. The number of translated items does not match the original.');
  }
  return translatedArray;
}

async function translateImageHandler(body: any): Promise<TranslatedImageResponse> {
    const { base64Image, mimeType, sourceLang, targetLang } = body;
    const sourceLanguageName = LANGUAGES.find(l => l.code === sourceLang)?.name || 'Auto-Detected';
    const targetLanguageName = LANGUAGES.find(l => l.code === targetLang)?.name;

    if (!targetLanguageName) {
        throw new Error(`Invalid target language: ${targetLang}`);
    }

    const imagePart = {
        inlineData: { mimeType, data: base64Image },
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
    const sanitizedJsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    const result: TranslatedImageResponse = JSON.parse(sanitizedJsonText);

    if (!result || !Array.isArray(result.lines)) {
         throw new Error("Invalid JSON structure received from translation API.");
    }
    return result;
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }
    if (!event.body) {
        return { statusCode: 400, body: 'Bad Request: Missing body' };
    }

    try {
        const body = JSON.parse(event.body);
        const { type } = body;

        let result;
        if (type === 'text') {
            result = await translateTextsHandler(body);
        } else if (type === 'image') {
            result = await translateImageHandler(body);
        } else {
            return { statusCode: 400, body: JSON.stringify({ error: 'Bad Request: Invalid type' }) };
        }

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(result),
        };

    } catch (error) {
        console.error("Error in Netlify function:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return {
            statusCode: 500,
            body: JSON.stringify({ error: errorMessage }),
        };
    }
};

export { handler };
