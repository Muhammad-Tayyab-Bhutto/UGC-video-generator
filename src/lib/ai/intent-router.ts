import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { IntentResult, IntentType } from '../../types/index.js';
import { normalizeAndValidateUrlFormat } from '../security/url-security.js';

const intentResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    intent: {
      type: SchemaType.STRING,
      enum: ['CASUAL_CONVERSATION', 'CAPABILITY_QUESTION', 'PRODUCT_VIDEO_REQUEST', 'UNKNOWN'],
    },
    extractedUrl: { type: SchemaType.STRING },
    replyText: { type: SchemaType.STRING },
  },
  required: ['intent'],
};

// Regex helper to pull URLs from raw user text as a fallback
export function extractUrlFromText(text: string): string | undefined {
  // Regex matching http/https URLs or standard domain formats (e.g. example.com, www.example.com)
  const urlRegex = /(?:https?:\/\/|www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/gi;
  const matches = text.match(urlRegex);
  if (!matches) return undefined;

  for (const candidate of matches) {
    // Strip trailing punctuation like periods or commas if present at the end of sentence
    const cleaned = candidate.replace(/[.,;:!?]+$/, '');
    const check = normalizeAndValidateUrlFormat(cleaned);
    if (check.valid && check.normalizedUrl) {
      return check.normalizedUrl;
    }
  }

  return undefined;
}

export async function classifyIntent(userMessage: string): Promise<IntentResult> {
  const trimmed = userMessage.trim();
  if (!trimmed) {
    return { intent: 'CASUAL_CONVERSATION', replyText: 'Hey there! How can I help you today?' };
  }

  // 1. Deterministic Fast-Path Heuristics for common greetings & questions
  const lower = trimmed.toLowerCase();
  if (['hi', 'hello', 'hey', 'yo', 'sup', 'good morning', 'good evening'].includes(lower)) {
    return {
      intent: 'CASUAL_CONVERSATION',
      replyText: "Hey! Send me any product URL and I can generate a short UGC-style video for it.",
    };
  }

  if (
    lower.includes('what can you do') ||
    lower.includes('how does this work') ||
    lower.includes('help') ||
    lower.includes('what is this')
  ) {
    return {
      intent: 'CAPABILITY_QUESTION',
      replyText:
        "I turn product pages into short 7-second UGC-style videos. Send me any product landing page URL and I'll analyze the product, craft the script, select visuals and audio, then render a video for you on AWS Lambda!",
    };
  }

  // 2. URL Extraction Check
  const candidateUrl = extractUrlFromText(trimmed);

  // If message clearly contains a URL along with video/product creation intent
  const hasCreationKeywords =
    lower.includes('create') ||
    lower.includes('make') ||
    lower.includes('generate') ||
    lower.includes('video') ||
    lower.includes('ad') ||
    lower.includes('ugc') ||
    lower.includes('build') ||
    lower.includes("here's") ||
    lower.includes('check');

  if (candidateUrl && (hasCreationKeywords || lower.split(' ').length <= 3)) {
    return {
      intent: 'PRODUCT_VIDEO_REQUEST',
      extractedUrl: candidateUrl,
    };
  }

  // 3. Fallback to Gemini LLM Classifier if API key available
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const ai = new GoogleGenerativeAI(apiKey);
      const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
      const model = ai.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: intentResponseSchema as unknown as import('@google/generative-ai').ResponseSchema,
          temperature: 0.1,
        },
      });

      const prompt = `Classify the user message into one of these intents:
- CASUAL_CONVERSATION: Greetings, small talk, casual statements.
- CAPABILITY_QUESTION: Questions asking what this tool does or how it works.
- PRODUCT_VIDEO_REQUEST: User wants to generate a video for a product or provides a product URL.
- UNKNOWN: Off-topic or unrecognized requests.

Extract candidate product URL if present in extractedUrl.

User Message: "${trimmed}"`;

      const result = await model.generateContent(prompt);
      const parsed = JSON.parse(result.response.text()) as { intent: IntentType; extractedUrl?: string; replyText?: string };
      
      const extracted = parsed.extractedUrl ? extractUrlFromText(parsed.extractedUrl) || candidateUrl : candidateUrl;

      if (parsed.intent === 'PRODUCT_VIDEO_REQUEST' && extracted) {
        return {
          intent: 'PRODUCT_VIDEO_REQUEST',
          extractedUrl: extracted,
        };
      }

      if (parsed.intent === 'CAPABILITY_QUESTION') {
        return {
          intent: 'CAPABILITY_QUESTION',
          replyText:
            "I turn product pages into short 7-second UGC-style videos. Send me any product URL and I'll create a video for you!",
        };
      }

      if (parsed.intent === 'CASUAL_CONVERSATION') {
        return {
          intent: 'CASUAL_CONVERSATION',
          replyText: "Hey! Drop a product URL here and I'll generate a video for it.",
        };
      }
    } catch {
      // Fall through to deterministic default
    }
  }

  // 4. Default fallback
  if (candidateUrl) {
    return {
      intent: 'PRODUCT_VIDEO_REQUEST',
      extractedUrl: candidateUrl,
    };
  }

  return {
    intent: 'CASUAL_CONVERSATION',
    replyText: "I'm a UGC video generator! Send me a product URL (like linear.app or raycast.com) to generate a video.",
  };
}
