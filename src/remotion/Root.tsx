import React from 'react';
import { Composition } from 'remotion';
import { MainComposition } from './Composition';
import { VideoCompositionProps } from '../types';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="UGCVideo"
        component={MainComposition as unknown as React.FC}
        durationInFrames={210}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          hookText: 'Calories tracked from a photo.',
          bodyText: 'Snap your meal and instantly get full breakdown.',
          ctaText: 'Try CalAI Free',
          backgroundUrl: '/assets/sample_bg.jpg',
          backgroundType: 'image',
          gifUrl: '/assets/sample_sticker.gif',
          audioUrl: '/assets/sample_audio.wav',
          durationInFrames: 210,
          fps: 30,
        }}
      />
    </>
  );
};
