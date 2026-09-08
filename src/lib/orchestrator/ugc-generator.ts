import { processProductUrl } from '../intelligence/pipeline.js';
import { resolveAssets } from '../assets/asset-resolver.js';
import { buildVideoCompositionProps } from '../assets/composition-props-builder.js';
import { renderUgcVideo } from '../renderer/render-ugc-video.js';
import { UgcGenerationResult } from '../../types/index.js';

export async function generateUgcVideo(productUrl: string): Promise<UgcGenerationResult> {
  // 1. Intelligence Pipeline (SSRF Check, Safe Fetch, Extraction, Gemini Analysis)
  const { pageData, intelligence } = await processProductUrl(productUrl);

  // 2. Asset Resolution (Product Image First, Stock/Giphy/Bundled Fallbacks, Asset Security Validation)
  const assets = await resolveAssets({
    pageData,
    productAnalysis: intelligence.productAnalysis,
    creativePlan: intelligence.creativePlan,
  });

  // 3. Map to VideoCompositionProps (Trusted constants: 1080x1920, 30fps, 210 frames)
  const compositionProps = buildVideoCompositionProps(intelligence.creativePlan, assets);

  // 4. Trigger AWS Remotion Lambda Production Render
  const renderResult = await renderUgcVideo(compositionProps);

  return {
    product: intelligence.productAnalysis,
    creativePlan: intelligence.creativePlan,
    assets,
    renderId: renderResult.jobId,
    videoUrl: renderResult.videoUrl,
  };
}
