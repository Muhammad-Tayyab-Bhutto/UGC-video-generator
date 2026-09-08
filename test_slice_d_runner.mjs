import assert from 'assert';
import { resolveAssets } from './dist/src/lib/assets/asset-resolver.js';
import { buildVideoCompositionProps } from './dist/src/lib/assets/composition-props-builder.js';

async function runSliceDTests() {
  console.log('--- RUNNING SLICE D AUTOMATED TESTS ---');

  const mockPageData = {
    requestedUrl: 'https://linear.app',
    finalUrl: 'https://linear.app/',
    title: 'Linear',
    description: 'Issue tracking for software teams',
    headings: ['Features'],
    text: 'Linear speeds up product development.',
    images: [
      { url: 'http://127.0.0.1/malicious.jpg', source: 'hero-image' }, // Private IP - must be skipped
      { url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1080&h=1920&fit=crop', source: 'og:image' }, // Valid public image
    ],
  };

  const mockProductAnalysis = {
    productName: 'Linear',
    oneLiner: 'Issue tracking for software teams',
    targetAudience: 'Software teams',
    primaryBenefit: 'Speed up development',
    keyFeatures: ['Issues', 'Cycles', 'Roadmaps'],
    tone: 'Professional',
    category: 'Developer Tools',
  };

  const mockCreativePlan = {
    hookText: 'BUILD PRODUCTS FASTER WITH AI',
    bodyText: 'Streamline your product development with AI workflows.',
    ctaText: 'Try Linear free',
    visualKeywords: ['software', 'planning', 'developer'],
    gifSearchQuery: 'fast success reaction',
    gifIntent: 'Show speed of development',
    audioMood: 'energetic',
  };

  console.log('Running Asset Test 1: Malicious/Private image skipped & valid product image selected...');
  const assets = await resolveAssets({
    pageData: mockPageData,
    productAnalysis: mockProductAnalysis,
    creativePlan: mockCreativePlan,
  });

  assert.strictEqual(assets.backgroundSource, 'product-image');
  assert.strictEqual(assets.backgroundUrl, 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1080&h=1920&fit=crop');
  console.log('✓ Asset Test 1 PASS');

  console.log('Running Asset Test 2: Fallback background used when no product images valid...');
  const emptyPageData = { ...mockPageData, images: [] };
  const fallbackAssets = await resolveAssets({
    pageData: emptyPageData,
    productAnalysis: mockProductAnalysis,
    creativePlan: mockCreativePlan,
  });

  assert.strictEqual(fallbackAssets.backgroundSource, 'fallback');
  assert.strictEqual(typeof fallbackAssets.backgroundUrl, 'string');
  assert.strictEqual(fallbackAssets.backgroundUrl.startsWith('https://'), true);
  console.log('✓ Asset Test 2 PASS');

  console.log('Running Asset Test 3: Audio mood mapping and fallback GIF resolution...');
  assert.strictEqual(assets.audioSource, 'bundled');
  assert.strictEqual(assets.gifSource, 'fallback'); // GIPHY key not set in mock test
  assert.strictEqual(assets.gifUrl.startsWith('https://'), true);
  console.log('✓ Asset Test 3 PASS');

  console.log('Running Composition Props Mapping Test 1: VideoCompositionProps construction...');
  const compProps = buildVideoCompositionProps(mockCreativePlan, assets);
  assert.strictEqual(compProps.hookText, mockCreativePlan.hookText);
  assert.strictEqual(compProps.bodyText, mockCreativePlan.bodyText);
  assert.strictEqual(compProps.ctaText, mockCreativePlan.ctaText);
  assert.strictEqual(compProps.backgroundUrl, assets.backgroundUrl);
  assert.strictEqual(compProps.gifUrl, assets.gifUrl);
  assert.strictEqual(compProps.audioUrl, assets.audioUrl);
  assert.strictEqual(compProps.durationInFrames, 210, 'Duration constant 210 frames');
  assert.strictEqual(compProps.fps, 30, 'FPS constant 30');
  console.log('✓ Composition Props Mapping Test 1 PASS');

  console.log('\n==================================================');
  console.log('ALL SLICE D UNIT & ASSET TESTS PASSED!');
  console.log('==================================================\n');
}

runSliceDTests().catch(err => {
  console.error('Slice D test suite failed:', err);
  process.exit(1);
});
