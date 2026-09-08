import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const { bundle } = await import('@remotion/bundler');
  const { renderMedia, selectComposition } = await import('@remotion/renderer');

  console.log('Building Remotion bundle...');
  const entryPoint = path.join(__dirname, 'src/remotion/index.ts');
  const bundleLocation = await bundle({ entryPoint });

  const inputProps = {
    hookText: 'CALORIES TRACKED FROM A PHOTO.',
    bodyText: 'Snap your meal & get full breakdown.',
    ctaText: 'TRY CALAI FREE',
    backgroundUrl: path.join(__dirname, 'public/assets/sample_bg.jpg'),
    backgroundType: 'image',
    gifUrl: path.join(__dirname, 'public/assets/sample_sticker.gif'),
    audioUrl: path.join(__dirname, 'public/assets/sample_audio.wav'),
    durationInFrames: 210,
    fps: 30,
  };

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'UGCVideo',
    inputProps,
  });

  const outputLocation = path.join(__dirname, 'tmp/renders/local-proof.mp4');
  fs.mkdirSync(path.dirname(outputLocation), { recursive: true });

  console.log('Rendering media directly to MP4 via Remotion renderer:', outputLocation);
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation,
    inputProps,
  });

  const stats = fs.statSync(outputLocation);
  console.log(`\nSUCCESS! MP4 Rendered by Remotion: ${outputLocation} (${stats.size} bytes)`);
}

main().catch(err => {
  console.error('Render execution failed:', err);
  process.exit(1);
});
