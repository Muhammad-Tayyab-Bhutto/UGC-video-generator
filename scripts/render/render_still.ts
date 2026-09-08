import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import path from 'path';
import fs from 'fs';

async function main() {
  console.log('Bundling Remotion entry point...');
  const entryPoint = path.join(process.cwd(), 'src/remotion/index.ts');
  const bundleLocation = await bundle({ entryPoint });

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

  const outputLocation = path.join(process.cwd(), 'public/renders/still.png');
  fs.mkdirSync(path.dirname(outputLocation), { recursive: true });

  console.log('Rendering frame 45 to PNG...');
  await renderStill({
    composition,
    serveUrl: bundleLocation,
    output: outputLocation,
    frame: 45,
    inputProps,
  });

  const stats = fs.statSync(outputLocation);
  console.log(`STILL RENDER SUCCESSFUL! Image size: ${stats.size} bytes`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
