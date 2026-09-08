import { processProductUrl } from '../intelligence/pipeline';
import { resolveAssets } from '../assets/asset-resolver';
import { buildVideoCompositionProps } from '../assets/composition-props-builder';
import { renderUgcVideo, startUgcVideoRender } from '../renderer/render-ugc-video';
import { UgcGenerationResult, ProductAnalysis, CreativePlan, ResolvedAssets } from '../../types';

export interface AsyncGenerationJobResult {
  product: ProductAnalysis;
  creativePlan: CreativePlan;
  assets: ResolvedAssets;
  renderId: string;
  bucketName: string;
  functionName: string;
}

export async function startUgcVideoGeneration(productUrl: string): Promise<AsyncGenerationJobResult> {
  // 1. Intelligence Pipeline (SSRF Check, Safe Fetch, Extraction, Gemini Analysis)
  const { pageData, intelligence } = await processProductUrl(productUrl);

  // 2. Asset Resolution (Product Image First, Stock/Giphy/Bundled Fallbacks, Asset Security Validation)
  const assets = await resolveAssets({
    pageData,
    productAnalysis: intelligence.productAnalysis,
    creativePlan: intelligence.creativePlan,
  });

  // 3. Map to VideoCompositionProps
  const compositionProps = buildVideoCompositionProps(intelligence.creativePlan, assets);

  // 4. Submit AWS Remotion Lambda Production Render (Returns immediately)
  const startResult = await startUgcVideoRender(compositionProps);

  return {
    product: intelligence.productAnalysis,
    creativePlan: intelligence.creativePlan,
    assets,
    renderId: startResult.renderId,
    bucketName: startResult.bucketName,
    functionName: startResult.functionName,
  };
}

export async function generateUgcVideo(productUrl: string): Promise<UgcGenerationResult> {
  const { pageData, intelligence } = await processProductUrl(productUrl);
  const assets = await resolveAssets({
    pageData,
    productAnalysis: intelligence.productAnalysis,
    creativePlan: intelligence.creativePlan,
  });
  const compositionProps = buildVideoCompositionProps(intelligence.creativePlan, assets);
  const renderResult = await renderUgcVideo(compositionProps);

  return {
    product: intelligence.productAnalysis,
    creativePlan: intelligence.creativePlan,
    assets,
    renderId: renderResult.jobId,
    videoUrl: renderResult.videoUrl,
  };
}
