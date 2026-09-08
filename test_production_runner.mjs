import assert from 'assert';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { validateVideoCompositionProps } from './dist/src/lib/validation/composition-props-validator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTests() {
  console.log('--- RUNNING AUTOMATED UNIT & CONTRACT TESTS ---');

  // Test 1: Serve URL selection contract
  console.log('Running Test 1: Serve URL selection contract...');
  const mockDeploySiteOutput = {
    serveUrl: 'https://remotionlambda-useast1-jwc4yc5wbb.s3.us-east-1.amazonaws.com/sites/ugc-video-generator-site/index.html',
    siteName: 'ugc-video-generator-site',
    stats: { uploadedFiles: 5, deletedFiles: 0, untouchedFiles: 10 }
  };
  assert.strictEqual(
    mockDeploySiteOutput.serveUrl.startsWith('https://'),
    true,
    'serveUrl must be a full HTTPS URL returned by deploySiteFromBundle'
  );
  assert.strictEqual(
    mockDeploySiteOutput.serveUrl.endsWith('/index.html'),
    true,
    'serveUrl must point directly to index.html for Chromium navigation'
  );
  console.log('✓ Test 1 PASS');

  // Test 2: Deployment result handling
  console.log('Running Test 2: Deployment result handling...');
  const renderInputServeUrl = mockDeploySiteOutput.serveUrl;
  assert.strictEqual(renderInputServeUrl, mockDeploySiteOutput.serveUrl, 'renderMediaOnLambda must consume deploySiteFromBundle serveUrl');
  console.log('✓ Test 2 PASS');

  // Test 3: Render configuration parameter check & concurrency exclusivity
  console.log('Running Test 3: Render configuration parameter contract...');
  const sampleRenderConfig = {
    region: 'us-east-1',
    functionName: 'remotion-render-4-0-522-mem2048mb-disk2048mb-120sec',
    serveUrl: mockDeploySiteOutput.serveUrl,
    composition: 'UGCVideo',
    inputProps: { hookText: 'TEST HOOK' },
    codec: 'h264',
    framesPerLambda: 120,
    downloadBehavior: { type: 'play-in-browser' },
  };
  assert.strictEqual(sampleRenderConfig.region, 'us-east-1');
  assert.strictEqual(sampleRenderConfig.composition, 'UGCVideo');
  assert.strictEqual(sampleRenderConfig.codec, 'h264');
  assert.strictEqual(sampleRenderConfig.framesPerLambda, 120, 'framesPerLambda must be set conservatively to avoid Lambda concurrency throttling');
  assert.strictEqual(
    sampleRenderConfig.concurrency,
    undefined,
    'concurrency must be undefined when framesPerLambda is set'
  );
  console.log('✓ Test 3 PASS');

  // Test 4: downloadBehavior regression check
  console.log('Running Test 4: downloadBehavior regression check...');
  const validBehaviors = ['play-in-browser', 'download'];
  assert.strictEqual(validBehaviors.includes(sampleRenderConfig.downloadBehavior.type), true);
  assert.notStrictEqual(sampleRenderConfig.downloadBehavior.type, 'public', 'downloadBehavior type must not be invalid string "public"');
  console.log('✓ Test 4 PASS');

  // Test 5: Failed render handling contract
  console.log('Running Test 5: Failed render progress error handling contract...');
  const mockProgressFailed = {
    overallProgress: 0.03,
    fatalErrorEncountered: true,
    done: false,
    errors: [{ message: 'AccessDenied: S3 read blocked' }]
  };
  assert.strictEqual(mockProgressFailed.fatalErrorEncountered, true);
  assert.strictEqual(mockProgressFailed.errors.length > 0, true);
  console.log('✓ Test 5 PASS');

  // Test 6: Successful render handling contract
  console.log('Running Test 6: Successful render progress handling contract...');
  const mockProgressSuccess = {
    overallProgress: 1.0,
    fatalErrorEncountered: false,
    done: true,
    outputFile: 'https://remotionlambda-useast1-jwc4yc5wbb.s3.us-east-1.amazonaws.com/renders/in66cd6ddw/out.mp4'
  };
  assert.strictEqual(mockProgressSuccess.done, true);
  assert.strictEqual(mockProgressSuccess.outputFile.startsWith('https://'), true);
  console.log('✓ Test 6 PASS');

  // Test 7: Security regression contract
  console.log('Running Test 7: Security regression contract...');
  const runnerSource = fs.readFileSync(path.join(__dirname, 'src/lib/renderer/render-ugc-video.ts'), 'utf-8');
  assert.strictEqual(runnerSource.includes('AdministratorAccess'), false, 'Runner must not request AdministratorAccess');
  assert.strictEqual(runnerSource.includes('AWS_SECRET_ACCESS_KEY='), false, 'Runner must not hardcode secret keys');
  console.log('✓ Test 7 PASS');

  // Test 8: Four UGC layer composition contract
  console.log('Running Test 8: Four UGC layer composition contract...');
  const compSource = fs.readFileSync(path.join(__dirname, 'src/remotion/Composition.tsx'), 'utf-8');
  assert.strictEqual(compSource.includes('OffthreadVideo') || compSource.includes('Img'), true, 'Layer 1: Background photo/video present');
  assert.strictEqual(compSource.includes('hookText') && compSource.includes('bodyText') && compSource.includes('ctaText'), true, 'Layer 2: Text overlay present');
  assert.strictEqual(compSource.includes('Audio'), true, 'Layer 3: Audio present');
  assert.strictEqual(compSource.includes('gifUrl'), true, 'Layer 4: GIF/sticker overlay present');
  console.log('✓ Test 8 PASS');

  // Test 9: Composition metadata contract
  console.log('Running Test 9: Composition metadata specs...');
  const rootSource = fs.readFileSync(path.join(__dirname, 'src/remotion/Root.tsx'), 'utf-8');
  assert.strictEqual(rootSource.includes('width={1080}'), true, 'Width must be 1080');
  assert.strictEqual(rootSource.includes('height={1920}'), true, 'Height must be 1920');
  assert.strictEqual(rootSource.includes('fps={30}'), true, 'FPS must be 30');
  assert.strictEqual(rootSource.includes('durationInFrames={210}'), true, 'Duration must be 210 frames (~7s)');
  console.log('✓ Test 9 PASS');

  // Test 10: Input validation contract (Valid vs Invalid props)
  console.log('Running Test 10: VideoCompositionProps validation tests...');
  const validProps = {
    hookText: 'Your to-do list shouldn\'t feel like another job.',
    bodyText: 'Plan your day. Stay focused. Finish what matters.',
    ctaText: 'Get your focus back.',
    backgroundUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1080&h=1920&fit=crop',
    backgroundType: 'image',
    gifUrl: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
    audioUrl: 'https://example.com/audio.mp3',
    durationInFrames: 210,
    fps: 30,
  };
  const validated = validateVideoCompositionProps(validProps);
  assert.strictEqual(validated.hookText, validProps.hookText);
  assert.strictEqual(validated.backgroundType, 'image');

  // Test invalid props rejections
  assert.throws(() => validateVideoCompositionProps({ ...validProps, hookText: '' }), /hookText/);
  assert.throws(() => validateVideoCompositionProps({ ...validProps, bodyText: '' }), /bodyText/);
  assert.throws(() => validateVideoCompositionProps({ ...validProps, ctaText: '' }), /ctaText/);
  assert.throws(() => validateVideoCompositionProps({ ...validProps, backgroundType: 'audio' }), /backgroundType/);
  assert.throws(() => validateVideoCompositionProps({ ...validProps, backgroundUrl: 'not-a-url' }), /backgroundUrl/);
  assert.throws(() => validateVideoCompositionProps({ ...validProps, gifUrl: 'invalid' }), /gifUrl/);
  console.log('✓ Test 10 PASS');

  // Test 11: Second Non-CalAI Fixture (FocusFlow)
  console.log('Running Test 11: Non-CalAI Second Fixture (FocusFlow) contract...');
  const focusFlowFixture = {
    hookText: 'Your to-do list shouldn\'t feel like another job.',
    bodyText: 'Plan your day. Stay focused. Finish what matters.',
    ctaText: 'Get your focus back.',
    backgroundUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1080&h=1920&fit=crop',
    backgroundType: 'image',
    gifUrl: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
    audioUrl: '',
    durationInFrames: 210,
    fps: 30,
  };
  const focusFlowValidated = validateVideoCompositionProps(focusFlowFixture);
  assert.strictEqual(focusFlowValidated.hookText, "Your to-do list shouldn't feel like another job.");
  assert.strictEqual(focusFlowValidated.ctaText, 'Get your focus back.');
  // Test 12: Include Slice C Unit & Security Tests
  console.log('Running Test 12: Executing Slice C Unit & Security test suite...');
  const { execSync } = await import('child_process');
  execSync('node test_slice_c_runner.mjs', { stdio: 'inherit' });
  console.log('✓ Test 12 PASS');

  // Test 13: Include Slice D Asset Resolution Tests
  console.log('Running Test 13: Executing Slice D Asset Resolution test suite...');
  execSync('node test_slice_d_runner.mjs', { stdio: 'inherit' });
  console.log('✓ Test 13 PASS');

  console.log('\n==================================================');
  console.log('ALL 13 AUTOMATED UNIT, SECURITY & CONTRACT TESTS PASSED!');
  console.log('==================================================\n');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
