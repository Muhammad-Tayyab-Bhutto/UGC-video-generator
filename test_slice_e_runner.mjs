import assert from 'assert';
import { classifyIntent, extractUrlFromText } from './dist/src/lib/ai/intent-router.js';

async function runSliceETests() {
  console.log('--- RUNNING SLICE E AUTOMATED TESTS ---');

  // 1. URL Extraction Unit Tests
  console.log('Running Intent Test 1: URL Extraction heuristics...');
  assert.strictEqual(extractUrlFromText('Check out linear.app!'), 'https://linear.app/');
  assert.strictEqual(extractUrlFromText('Make a video for https://raycast.com'), 'https://raycast.com/');
  assert.strictEqual(extractUrlFromText('I am building CalAI at calai.app.'), 'https://calai.app/');
  assert.strictEqual(extractUrlFromText('Hello there'), undefined);
  console.log('✓ Intent Test 1 PASS');

  // 2. Casual Intent Classification Tests
  console.log('Running Intent Test 2: Casual Conversation classification...');
  const casual1 = await classifyIntent('hi');
  assert.strictEqual(casual1.intent, 'CASUAL_CONVERSATION');
  assert.strictEqual(casual1.replyText?.includes('Send me any product URL'), true);

  const casual2 = await classifyIntent('hello');
  assert.strictEqual(casual2.intent, 'CASUAL_CONVERSATION');
  console.log('✓ Intent Test 2 PASS');

  // 3. Capability Intent Classification Tests
  console.log('Running Intent Test 3: Capability Question classification...');
  const cap1 = await classifyIntent('what can you do?');
  assert.strictEqual(cap1.intent, 'CAPABILITY_QUESTION');
  assert.strictEqual(cap1.replyText?.includes('7-second UGC-style videos'), true);

  const cap2 = await classifyIntent('how does this work');
  assert.strictEqual(cap2.intent, 'CAPABILITY_QUESTION');
  console.log('✓ Intent Test 3 PASS');

  // 4. Product Video Request Intent Classification Tests
  console.log('Running Intent Test 4: Product Video Request classification...');
  const req1 = await classifyIntent('create a UGC video for linear.app');
  assert.strictEqual(req1.intent, 'PRODUCT_VIDEO_REQUEST');
  assert.strictEqual(req1.extractedUrl, 'https://linear.app/');

  const req2 = await classifyIntent("I'm building CalAI, calorie tracking app. Here's calai.app.");
  assert.strictEqual(req2.intent, 'PRODUCT_VIDEO_REQUEST');
  assert.strictEqual(req2.extractedUrl, 'https://calai.app/');
  console.log('✓ Intent Test 4 PASS');

  // 5. False-Positive Prevention Test
  console.log('Running Intent Test 5: Off-topic / non-video sentence handling...');
  const casualText = await classifyIntent('Tell me a joke about dogs.');
  assert.notStrictEqual(casualText.intent, 'PRODUCT_VIDEO_REQUEST', 'Non-product sentence must not trigger video request');
  console.log('✓ Intent Test 5 PASS');

  console.log('\n==================================================');
  console.log('ALL SLICE E INTENT & ROUTING TESTS PASSED!');
  console.log('==================================================\n');
}

runSliceETests().catch(err => {
  console.error('Slice E test suite failed:', err);
  process.exit(1);
});
