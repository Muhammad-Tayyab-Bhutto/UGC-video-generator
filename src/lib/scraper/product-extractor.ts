import * as cheerio from 'cheerio';
import { URL } from 'url';

export interface ImageCandidate {
  url: string;
  source: 'og:image' | 'twitter:image' | 'hero-image' | 'page-image';
}

export interface ProductPageData {
  requestedUrl: string;
  finalUrl: string;
  title: string;
  description: string;
  siteName?: string;
  h1?: string;
  headings: string[];
  text: string;
  images: ImageCandidate[];
}

const MAX_TEXT_LENGTH = 4000;

export function extractProductPageData(
  requestedUrl: string,
  finalUrl: string,
  html: string
): ProductPageData {
  const $ = cheerio.load(html);

  // 1. Remove non-content / noise tags
  $('script, style, noscript, svg, nav, footer, iframe, header, form').remove();

  // 2. Deterministic Title Priority: og:title -> <title> -> <h1>
  const ogTitle = $('meta[property="og:title"]').attr('content')?.trim();
  const metaTitle = $('title').text().trim();
  const h1Title = $('h1').first().text().trim();
  const title = ogTitle || metaTitle || h1Title || 'Product Page';

  // 3. Deterministic Description Priority: og:description -> meta description -> first p
  const ogDesc = $('meta[property="og:description"]').attr('content')?.trim();
  const metaDesc = $('meta[name="description"]').attr('content')?.trim();
  const twitterDesc = $('meta[name="twitter:description"]').attr('content')?.trim();
  const firstP = $('p').first().text().trim();
  const description = ogDesc || metaDesc || twitterDesc || firstP || '';

  // 4. Site Name
  const siteName = $('meta[property="og:site_name"]').attr('content')?.trim();

  // 5. Headings
  const headings: string[] = [];
  $('h1, h2, h3').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text && text.length > 3 && !headings.includes(text)) {
      headings.push(text);
    }
  });

  // 6. Readable Content Extraction
  let rawText = $('body').text().replace(/\s+/g, ' ').trim();
  if (rawText.length > MAX_TEXT_LENGTH) {
    rawText = rawText.substring(0, MAX_TEXT_LENGTH) + '...';
  }

  // 7. Image Candidates Extraction with Provenance & Deduplication
  const imageMap = new Map<string, ImageCandidate>();

  const addImage = (rawImgUrl: string | undefined, source: ImageCandidate['source']) => {
    if (!rawImgUrl) return;
    const trimmed = rawImgUrl.trim();
    if (!trimmed || trimmed.startsWith('data:')) return;

    try {
      const absoluteUrl = new URL(trimmed, finalUrl).toString();
      if (absoluteUrl.startsWith('http://') || absoluteUrl.startsWith('https://')) {
        if (!imageMap.has(absoluteUrl)) {
          imageMap.set(absoluteUrl, { url: absoluteUrl, source });
        }
      }
    } catch {
      // Ignore malformed image URLs
    }
  };

  // og:image & twitter:image
  addImage($('meta[property="og:image"]').attr('content'), 'og:image');
  addImage($('meta[property="og:image:secure_url"]').attr('content'), 'og:image');
  addImage($('meta[name="twitter:image"]').attr('content'), 'twitter:image');
  addImage($('meta[name="twitter:image:src"]').attr('content'), 'twitter:image');

  // Page images (hero / prominent images)
  $('img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src');
    const alt = $(el).attr('alt') || '';
    const isHero = alt.toLowerCase().includes('hero') || alt.toLowerCase().includes('product');
    addImage(src, isHero ? 'hero-image' : 'page-image');
  });

  return {
    requestedUrl,
    finalUrl,
    title,
    description,
    siteName,
    h1: h1Title || undefined,
    headings: headings.slice(0, 10),
    text: rawText,
    images: Array.from(imageMap.values()).slice(0, 10),
  };
}
