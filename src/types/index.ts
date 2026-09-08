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

export interface ProductAnalysis {
  url: string;
  title: string;
  description: string;
  brandName: string;
  tagline: string;
  primaryBenefit: string;
  targetAudience: string;
  keyFeatures: string[];
  visualMood: string;
  imageUrl?: string;
}

export interface CreativePlan {
  hookText: string;
  bodyText: string;
  ctaText: string;
  backgroundSearchQuery: string;
  gifSearchQuery: string;
  audioMood: 'upbeat' | 'energetic' | 'calm' | 'corporate';
}

export interface ResolvedAssets {
  backgroundUrl: string;
  backgroundType: 'video' | 'image';
  gifUrl: string;
  audioUrl: string;
}

export interface VideoCompositionProps {
  hookText: string;
  bodyText: string;
  ctaText: string;
  backgroundUrl: string;
  backgroundType: 'video' | 'image';
  gifUrl: string;
  audioUrl: string;
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
