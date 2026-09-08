import { VideoCompositionProps } from '../../types';

export function validateVideoCompositionProps(props: unknown): VideoCompositionProps {
  if (!props || typeof props !== 'object') {
    throw new Error('VideoCompositionProps must be a non-null object.');
  }

  const p = props as Record<string, unknown>;

  if (typeof p.hookText !== 'string' || !p.hookText.trim()) {
    throw new Error('VideoCompositionProps.hookText is required and cannot be empty.');
  }

  if (typeof p.bodyText !== 'string' || !p.bodyText.trim()) {
    throw new Error('VideoCompositionProps.bodyText is required and cannot be empty.');
  }

  if (typeof p.ctaText !== 'string' || !p.ctaText.trim()) {
    throw new Error('VideoCompositionProps.ctaText is required and cannot be empty.');
  }

  if (typeof p.backgroundUrl !== 'string' || !p.backgroundUrl.trim()) {
    throw new Error('VideoCompositionProps.backgroundUrl is required and cannot be empty.');
  }

  if (p.backgroundType !== 'image' && p.backgroundType !== 'video') {
    throw new Error('VideoCompositionProps.backgroundType must be either "image" or "video".');
  }

  if (typeof p.gifUrl !== 'string' || !p.gifUrl.trim()) {
    throw new Error('VideoCompositionProps.gifUrl is required and cannot be empty.');
  }

  if (typeof p.audioUrl !== 'string') {
    throw new Error('VideoCompositionProps.audioUrl must be a string.');
  }

  // URL format validation helper
  const isValidUrlOrPath = (urlStr: string): boolean => {
    if (urlStr.startsWith('/') || urlStr.startsWith('./') || urlStr.startsWith('../')) {
      return true;
    }
    try {
      const parsed = new URL(urlStr);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  if (!isValidUrlOrPath(p.backgroundUrl as string)) {
    throw new Error(`Invalid backgroundUrl format: "${p.backgroundUrl}"`);
  }

  if (!isValidUrlOrPath(p.gifUrl as string)) {
    throw new Error(`Invalid gifUrl format: "${p.gifUrl}"`);
  }

  if ((p.audioUrl as string).trim() && !isValidUrlOrPath(p.audioUrl as string)) {
    throw new Error(`Invalid audioUrl format: "${p.audioUrl}"`);
  }

  return {
    hookText: (p.hookText as string).trim(),
    bodyText: (p.bodyText as string).trim(),
    ctaText: (p.ctaText as string).trim(),
    backgroundUrl: (p.backgroundUrl as string).trim(),
    backgroundType: p.backgroundType as 'image' | 'video',
    gifUrl: (p.gifUrl as string).trim(),
    audioUrl: (p.audioUrl as string).trim(),
    durationInFrames: typeof p.durationInFrames === 'number' ? p.durationInFrames : 210,
    fps: typeof p.fps === 'number' ? p.fps : 30,
  };
}
