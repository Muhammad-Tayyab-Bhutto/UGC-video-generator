import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { VideoCompositionProps } from '../types';

export const MainComposition: React.FC<VideoCompositionProps> = ({
  hookText,
  bodyText,
  ctaText,
  backgroundUrl,
  backgroundType,
  gifUrl,
  audioUrl,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Timing constants (in frames at 30 fps)
  // Hook: 0 -> 75 frames (~2.5s)
  // Body: 60 -> 150 frames (~2.0s to ~5.0s)
  // CTA: 135 -> 210 frames (~4.5s to 7.0s)

  // Hook Spring animation
  const hookSpring = spring({
    frame,
    fps,
    config: { damping: 12, mass: 0.5 },
  });

  const hookOpacity = interpolate(frame, [0, 15, 60, 75], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Body Spring animation
  const bodySpring = spring({
    frame: frame - 60,
    fps,
    config: { damping: 14, mass: 0.6 },
  });

  const bodyOpacity = interpolate(frame, [60, 75, 135, 150], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // CTA Spring animation
  const ctaSpring = spring({
    frame: frame - 135,
    fps,
    config: { damping: 10, mass: 0.4 },
  });

  const ctaOpacity = interpolate(frame, [135, 150, 210], [0, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Sticker animation: enters at frame 30, stays visible
  const stickerSpring = spring({
    frame: frame - 30,
    fps,
    config: { damping: 12, mass: 0.5 },
  });

  // Background subtle zoom
  const bgScale = interpolate(frame, [0, 210], [1, 1.15]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* 1. Background Layer */}
      <AbsoluteFill style={{ transform: `scale(${bgScale})` }}>
        {backgroundType === 'video' ? (
          <OffthreadVideo
            src={backgroundUrl}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Img
            src={backgroundUrl}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
      </AbsoluteFill>

      {/* Dark Overlay Gradient for contrast */}
      <AbsoluteFill
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.7) 100%)',
        }}
      />

      {/* 2. Sticker Overlay (Top Right / Middle Badge) */}
      {frame >= 30 && (
        <div
          style={{
            position: 'absolute',
            top: 140,
            right: 60,
            transform: `scale(${stickerSpring}) rotate(-6deg)`,
            zIndex: 20,
            filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.5))',
          }}
        >
          <Img
            src={gifUrl}
            style={{
              width: 180,
              height: 180,
              objectFit: 'contain',
              borderRadius: 20,
            }}
          />
        </div>
      )}

      {/* 3. Text Overlay Layer */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0 80px',
          zIndex: 30,
          textAlign: 'center',
        }}
      >
        {/* Hook Section */}
        {frame < 75 && (
          <div
            style={{
              opacity: hookOpacity,
              transform: `scale(${hookSpring})`,
              backgroundColor: '#FFE600',
              color: '#000000',
              padding: '30px 45px',
              borderRadius: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            }}
          >
            <h1
              style={{
                fontSize: 64,
                fontWeight: 900,
                lineHeight: 1.1,
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '-1px',
              }}
            >
              {hookText}
            </h1>
          </div>
        )}

        {/* Body Section */}
        {frame >= 60 && frame < 150 && (
          <div
            style={{
              opacity: bodyOpacity,
              transform: `scale(${bodySpring})`,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              color: '#0D0D0D',
              padding: '35px 50px',
              borderRadius: '28px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <p
              style={{
                fontSize: 52,
                fontWeight: 800,
                lineHeight: 1.2,
                margin: 0,
              }}
            >
              {bodyText}
            </p>
          </div>
        )}

        {/* CTA Section */}
        {frame >= 135 && (
          <div
            style={{
              opacity: ctaOpacity,
              transform: `scale(${ctaSpring})`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 24,
            }}
          >
            <div
              style={{
                backgroundColor: '#FF2E93',
                color: '#FFFFFF',
                padding: '32px 60px',
                borderRadius: '50px',
                boxShadow: '0 25px 50px rgba(255, 46, 147, 0.5)',
              }}
            >
              <h2
                style={{
                  fontSize: 56,
                  fontWeight: 900,
                  margin: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                {ctaText}
              </h2>
            </div>
            <div
              style={{
                backgroundColor: 'rgba(0,0,0,0.7)',
                color: '#FFF',
                padding: '12px 28px',
                borderRadius: '30px',
                fontSize: 28,
                fontWeight: 600,
                border: '1px solid rgba(255,255,255,0.3)',
              }}
            >
              Link Below 🚀
            </div>
          </div>
        )}
      </AbsoluteFill>

      {/* 4. Audio Layer */}
      {audioUrl && (
        <Audio
          src={audioUrl.startsWith('/') ? staticFile(audioUrl) : audioUrl}
          volume={0.8}
        />
      )}
    </AbsoluteFill>
  );
};
