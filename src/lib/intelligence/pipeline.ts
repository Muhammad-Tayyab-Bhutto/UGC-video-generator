import { safeFetchProductPage } from '@/lib/scraper/safe-fetcher';
import { extractProductPageData, ProductPageData } from '@/lib/scraper/product-extractor';
import { analyzeProduct, ProductIntelligence } from '@/lib/ai/gemini-analyzer';

export interface IntelligencePipelineResult {
  pageData: ProductPageData;
  intelligence: ProductIntelligence;
}

export async function processProductUrl(rawUrl: string): Promise<IntelligencePipelineResult> {
  // 1. Safe fetch with SSRF checks, pinned DNS, stream byte limits, and redirect validation
  const fetchResult = await safeFetchProductPage(rawUrl);

  // 2. Extract structured page metadata and image candidates
  const pageData = extractProductPageData(rawUrl, fetchResult.finalUrl, fetchResult.bodyText);

  // 3. Perform AI analysis to generate ProductAnalysis and CreativePlan
  const intelligence = await analyzeProduct(pageData);

  return {
    pageData,
    intelligence,
  };
}
