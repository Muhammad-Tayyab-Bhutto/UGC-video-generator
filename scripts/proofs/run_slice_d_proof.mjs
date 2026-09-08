import { generateUgcVideo } from '../../dist/lib/orchestrator/ugc-generator.js';

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error('Usage: node run_slice_d_proof.mjs <URL>');
    process.exit(1);
  }

  console.log(`\n==================================================`);
  console.log(`STARTING END-TO-END UGC GENERATION FOR: ${url}`);
  console.log(`==================================================\n`);

  try {
    const result = await generateUgcVideo(url);

    console.log('--- GENERATION SUMMARY ---');
    console.log('PRODUCT_URL:       ', url);
    console.log('PRODUCT:           ', result.product.productName);
    console.log('HOOK:              ', result.creativePlan.hookText);
    console.log('BACKGROUND_SOURCE: ', result.assets.backgroundSource);
    console.log('BACKGROUND_URL:    ', result.assets.backgroundUrl);
    console.log('GIF_SOURCE:        ', result.assets.gifSource);
    console.log('GIF_QUERY:         ', result.creativePlan.gifSearchQuery);
    console.log('AUDIO_SOURCE:      ', result.assets.audioSource);
    console.log('AUDIO_MOOD:        ', result.creativePlan.audioMood);
    console.log('RENDER_ID:         ', result.renderId);
    console.log('VIDEO_URL:         ', result.videoUrl);
    console.log(`\n==================================================\n`);
  } catch (err) {
    console.error('Slice D proof failed:', err.message || err);
    process.exit(1);
  }
}

main();
