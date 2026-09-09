export type MessageRole = 'user' | 'assistant' | 'system';

export type IntentType =
  | 'CASUAL_CONVERSATION'
  | 'CAPABILITY_QUESTION'
  | 'PRODUCT_VIDEO_REQUEST'
  | 'FOLLOW_UP'
  | 'UNKNOWN';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  videoResult?: VideoResult;
  progress?: RenderProgress;
}

export interface IntentResult {
  intent: IntentType;
  extractedUrl?: string;
  replyText?: string;
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
  images: Array<{
    url: string;
    source: 'og:image' | 'twitter:image' | 'hero-image' | 'page-image';
  }>;
}

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
  voiceoverScript: string;
  visualKeywords: string[];
  gifSearchQuery: string;
  gifIntent: string;
  audioMood: 'upbeat' | 'playful' | 'focused' | 'energetic' | 'calm' | 'dramatic';
}

export interface ResolvedAssets {
  backgroundUrl: string;
  backgroundType: 'video' | 'image';
  gifUrl: string;
  audioUrl: string;
  voiceoverUrl?: string;
  backgroundSource: 'product-image' | 'pexels' | 'fallback';
  gifSource: 'giphy' | 'fallback';
  audioSource: 'bundled';
  voiceoverSource?: 'polly' | 'google-tts' | 'fallback';
}

export interface VideoCompositionProps {
  hookText: string;
  bodyText: string;
  ctaText: string;
  backgroundUrl: string;
  backgroundType: 'video' | 'image';
  gifUrl: string;
  audioUrl: string;
  voiceoverUrl?: string;
  voiceoverDuration?: number;
  durationInFrames: number;
  fps: number;
}

export type RenderStatus = 'queued' | 'scraping' | 'planning' | 'resolving_assets' | 'rendering' | 'completed' | 'failed';

export interface RenderProgress {
  jobId: string;
  status: RenderStatus;
  message: string;
  progressPercent: number;
}

export interface VideoResult {
  jobId: string;
  videoUrl: string;
  thumbnailUrl?: string;
  durationSeconds: number;
  title: string;
}

export interface UgcGenerationResult {
  product: ProductAnalysis;
  creativePlan: CreativePlan;
  assets: ResolvedAssets;
  renderId: string;
  videoUrl: string;
}
