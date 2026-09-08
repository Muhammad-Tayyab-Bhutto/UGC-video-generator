import { safeFetchProductPage } from '../scraper/safe-fetcher.js';
import { extractProductPageData, ProductPageData } from '../scraper/product-extractor.js';
import { analyzeProduct, ProductIntelligence } from '../ai/gemini-analyzer.js';

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
