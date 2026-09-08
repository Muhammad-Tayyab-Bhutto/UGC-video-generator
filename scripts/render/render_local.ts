import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import fs from 'fs';

async function main() {
  console.log('Starting Remotion bundle process...');
  const entryPoint = path.join(process.cwd(), 'src/remotion/index.ts');
  const bundleLocation = await bundle({
    entryPoint,
    webpackOverride: (config) => config,
  });

  console.log('Bundle created at:', bundleLocation);

  const inputProps = {
    hookText: 'Calories tracked from a photo.',
    bodyText: 'Snap your meal and instantly get full breakdown.',
    ctaText: 'Try CalAI Free',
    backgroundUrl: path.join(process.cwd(), 'public/assets/sample_bg.jpg'),
    backgroundType: 'image',
    gifUrl: path.join(process.cwd(), 'public/assets/sample_sticker.gif'),
    audioUrl: path.join(process.cwd(), 'public/assets/sample_audio.wav'),
    durationInFrames: 210,
    fps: 30,
  };

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'UGCVideo',
    inputProps,
  });

  const outputLocation = path.join(process.cwd(), 'public/renders/output.mp4');
  fs.mkdirSync(path.dirname(outputLocation), { recursive: true });

  console.log('Rendering media locally to:', outputLocation);
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation,
    inputProps,
  });

  console.log('LOCAL RENDER SUCCESSFUL!');
  const stats = fs.statSync(outputLocation);
  console.log(`Rendered MP4 file size: ${stats.size} bytes`);
}

main().catch((err) => {
  console.error('Render error:', err);
  process.exit(1);
});
