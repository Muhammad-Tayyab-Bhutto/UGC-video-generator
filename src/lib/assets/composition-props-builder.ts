import { CreativePlan, ResolvedAssets, VideoCompositionProps } from '../../types';

export function buildVideoCompositionProps(
  creativePlan: CreativePlan,
  assets: ResolvedAssets
): VideoCompositionProps {
  return {
    hookText: creativePlan.hookText,
    bodyText: creativePlan.bodyText,
    ctaText: creativePlan.ctaText,
    backgroundUrl: assets.backgroundUrl,
    backgroundType: assets.backgroundType,
    gifUrl: assets.gifUrl,
    audioUrl: assets.audioUrl,
    voiceoverUrl: assets.voiceoverUrl,
    durationInFrames: 210, // Trusted constant (~7 seconds)
    fps: 30,               // Trusted constant (30 FPS)
  };
}
