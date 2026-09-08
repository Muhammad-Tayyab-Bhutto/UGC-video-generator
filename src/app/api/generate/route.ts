import { NextRequest, NextResponse } from 'next/server';
import { classifyIntent } from '@/lib/ai/intent-router';
import { generateUgcVideo } from '@/lib/orchestrator/ugc-generator';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userMessage = body.message;

    if (!userMessage || typeof userMessage !== 'string' || !userMessage.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // 1. Classify intent
    const intentResult = await classifyIntent(userMessage);

    // 2. Handle Casual & Capability Intents
    if (intentResult.intent !== 'PRODUCT_VIDEO_REQUEST' || !intentResult.extractedUrl) {
      return NextResponse.json({
        intent: intentResult.intent,
        replyText: intentResult.replyText || "Send me a product URL to generate a video!",
      });
    }

    // 3. Handle Product Video Request (Triggers full pipeline + Lambda render)
    const productUrl = intentResult.extractedUrl;

    try {
      const generationResult = await generateUgcVideo(productUrl);

      return NextResponse.json({
        intent: 'PRODUCT_VIDEO_REQUEST',
        extractedUrl: productUrl,
        replyText: `Here is your UGC video for **${generationResult.product.productName}**!`,
        result: generationResult,
      });
    } catch (genErr: unknown) {
      const msg = genErr instanceof Error ? genErr.message : String(genErr);
      
      // Server-side diagnostic log (Secrets omitted)
      console.error('[ugc-generation-failure]', {
        extractedUrl: productUrl,
        errorMessage: msg,
        timestamp: new Date().toISOString(),
      });
      
      // Return safe, user-friendly error messages based on failure stage
      let safeError = "I understood the product request, but video generation failed. Please check the URL and try again.";
      if (msg.includes('Security validation failed') || msg.includes('Forbidden protocol')) {
        safeError = "That URL doesn't look like a public product page. Please try a valid public website URL.";
      } else if (msg.includes('HTTP fetch failed') || msg.includes('Could not resolve DNS') || msg.includes('EAI_AGAIN')) {
        safeError = "I couldn't reach that product page. Please ensure the website is publicly available.";
      } else if (msg.includes('GEMINI_API_KEY missing')) {
        safeError = "AI product intelligence service is temporarily unconfigured.";
      }

      return NextResponse.json({
        intent: 'PRODUCT_VIDEO_REQUEST',
        extractedUrl: productUrl,
        error: safeError,
      }, { status: 422 });
    }
  } catch (err: unknown) {
    console.error('[api-route-error]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
