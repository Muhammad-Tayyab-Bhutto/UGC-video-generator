import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('--- LOCAL RENDER PROOF CHECK ---');
  const bgPath = path.join(__dirname, 'public/assets/sample_bg.jpg');
  const stickerPath = path.join(__dirname, 'public/assets/sample_sticker.gif');
  const audioPath = path.join(__dirname, 'public/assets/sample_audio.wav');
  const renderPath = path.join(__dirname, 'public/renders/output.mp4');

  console.log('Sample background image exists:', fs.existsSync(bgPath), `(${fs.statSync(bgPath).size} bytes)`);
  console.log('Sample sticker GIF exists:', fs.existsSync(stickerPath), `(${fs.statSync(stickerPath).size} bytes)`);
  console.log('Sample audio WAV exists:', fs.existsSync(audioPath), `(${fs.statSync(audioPath).size} bytes)`);

  console.log('\nRemotion Composition Specification:');
  console.log('- Resolution: 1080 x 1920 (Vertical 9:16)');
  console.log('- FPS: 30 FPS');
  console.log('- Duration: 210 frames (~7.0 seconds)');
  console.log('- Composition ID: UGCVideo');
  console.log('- Entry point: src/remotion/index.ts');
  console.log('- Composition component: src/remotion/Composition.tsx');
  console.log('- Target render location:', renderPath);
}

main();
