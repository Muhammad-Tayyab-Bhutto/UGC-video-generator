import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { ProductPageData } from '../scraper/product-extractor';

export interface ProductAnalysis {
  productName: string;
  oneLiner: string;
  targetAudience: string;
  primaryBenefit: string;
  keyFeatures: string[];
  tone: string;
  category: string;
}

export interface CreativePlan {
  hookText: string;
  bodyText: string;
  ctaText: string;
  visualKeywords: string[];
  gifSearchQuery: string;
  gifIntent: string;
  audioMood: 'upbeat' | 'playful' | 'focused' | 'energetic' | 'calm' | 'dramatic';
}

export interface ProductIntelligence {
  productAnalysis: ProductAnalysis;
  creativePlan: CreativePlan;
}

const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    productAnalysis: {
      type: SchemaType.OBJECT,
      properties: {
        productName: { type: SchemaType.STRING },
        oneLiner: { type: SchemaType.STRING },
        targetAudience: { type: SchemaType.STRING },
        primaryBenefit: { type: SchemaType.STRING },
        keyFeatures: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
        },
        tone: { type: SchemaType.STRING },
        category: { type: SchemaType.STRING },
      },
      required: ['productName', 'oneLiner', 'targetAudience', 'primaryBenefit', 'keyFeatures', 'tone', 'category'],
    },
    creativePlan: {
      type: SchemaType.OBJECT,
      properties: {
        hookText: { type: SchemaType.STRING },
        bodyText: { type: SchemaType.STRING },
        ctaText: { type: SchemaType.STRING },
        visualKeywords: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
        },
        gifSearchQuery: { type: SchemaType.STRING },
        gifIntent: { type: SchemaType.STRING },
        audioMood: {
          type: SchemaType.STRING,
          enum: ['upbeat', 'playful', 'focused', 'energetic', 'calm', 'dramatic'],
        },
      },
      required: ['hookText', 'bodyText', 'ctaText', 'visualKeywords', 'gifSearchQuery', 'gifIntent', 'audioMood'],
    },
  },
  required: ['productAnalysis', 'creativePlan'],
};

export async function analyzeProduct(
  pageData: ProductPageData,
  clientOverride?: GoogleGenerativeAI
): Promise<ProductIntelligence> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey && !clientOverride) {
    throw new Error('GEMINI_API_KEY missing from environment.');
  }

  const ai = clientOverride || new GoogleGenerativeAI(apiKey!);
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  const model = ai.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: responseSchema as unknown as import('@google/generative-ai').ResponseSchema,
      temperature: 0.3,
    },
  });

  const prompt = `You are an expert UGC video creative director creating a 5–10 second vertical social video script for a product.

STRICT GROUNDEDNESS RULES:
1. Base all copy ONLY on supported facts in the provided ProductPageData.
2. DO NOT invent prices, user statistics, awards, medical claims, or unverified performance metrics.
3. If specific metrics or features are missing, focus on the stated core value proposition.

COPYWRITING REQUIREMENTS:
- HOOK: Short, attention-grabbing, product-specific (all caps, under 7 words). Avoid generic openers like "Transform your life!" or "Game changer!".
- BODY: One concise benefit-focused statement explaining the product's core value.
- CTA: Clear, short call-to-action (under 4 words).
- GIF SEARCH QUERY & INTENT: Specify a reaction GIF search term (e.g., "mind blown reaction") AND the creative intent behind showing it.
- AUDIO MOOD: Pick exactly one from: upbeat, playful, focused, energetic, calm, dramatic.

Product Page Data:
URL: ${pageData.finalUrl}
Title: ${pageData.title}
Description: ${pageData.description}
H1: ${pageData.h1 || ''}
Headings: ${pageData.headings.join(' | ')}
Extracted Text Summary: ${pageData.text}
`;

  let attempts = 0;
  let lastError: Error | null = null;

  while (attempts < 2) {
    attempts++;
    try {
      const result = await model.generateContent(prompt);
      const rawResponseText = result.response.text();
      const parsed = JSON.parse(rawResponseText) as ProductIntelligence;

      validateProductIntelligenceRuntime(parsed);
      return parsed;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempts >= 2) break;
    }
  }

  throw new Error(`Failed to generate valid ProductIntelligence from Gemini after 2 attempts: ${lastError?.message}`);
}

export function validateProductIntelligenceRuntime(data: unknown): asserts data is ProductIntelligence {
  if (!data || typeof data !== 'object') {
    throw new Error('ProductIntelligence response must be an object');
  }

  const obj = data as Record<string, unknown>;
  const pa = obj.productAnalysis as Record<string, unknown>;
  const cp = obj.creativePlan as Record<string, unknown>;

  if (!pa || typeof pa !== 'object') throw new Error('Missing or invalid productAnalysis object');
  if (!cp || typeof cp !== 'object') throw new Error('Missing or invalid creativePlan object');

  const reqPaFields = ['productName', 'oneLiner', 'targetAudience', 'primaryBenefit', 'keyFeatures', 'tone', 'category'];
  for (const f of reqPaFields) {
    if (!pa[f]) throw new Error(`productAnalysis missing required field: ${f}`);
  }
  if (!Array.isArray(pa.keyFeatures)) throw new Error('productAnalysis.keyFeatures must be an array');

  const reqCpFields = ['hookText', 'bodyText', 'ctaText', 'visualKeywords', 'gifSearchQuery', 'gifIntent', 'audioMood'];
  for (const f of reqCpFields) {
    if (!cp[f]) throw new Error(`creativePlan missing required field: ${f}`);
  }
  if (!Array.isArray(cp.visualKeywords)) throw new Error('creativePlan.visualKeywords must be an array');

  const validAudioMoods = ['upbeat', 'playful', 'focused', 'energetic', 'calm', 'dramatic'];
  if (!validAudioMoods.includes(cp.audioMood as string)) {
    throw new Error(`Invalid audioMood (${cp.audioMood}). Must be one of: ${validAudioMoods.join(', ')}`);
  }
}
