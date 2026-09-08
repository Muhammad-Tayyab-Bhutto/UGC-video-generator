import { renderUgcVideo } from './dist/src/lib/renderer/render-ugc-video.js';

async function main() {
  console.log('--- REMOTION LAMBDA PRODUCTION RENDER PROOF ---');
  
  const props = {
    hookText: 'CALORIES TRACKED FROM A PHOTO.',
    bodyText: 'Snap your meal & get full breakdown.',
    ctaText: 'TRY CALAI FREE',
    backgroundUrl: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=1080&h=1920&fit=crop',
    backgroundType: 'image',
    gifUrl: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
    audioUrl: '',
    durationInFrames: 210,
    fps: 30,
  };

  const result = await renderUgcVideo(props);

  console.log('\n==================================================');
  console.log('RENDER_COMPLETED');
  console.log('RENDER_ID:', result.jobId);
  console.log('OUTPUT_URL:', result.videoUrl);
  console.log('==================================================\n');
}

main().catch(err => {
  console.error('Production render failed:', err.message || err);
  process.exit(1);
});
