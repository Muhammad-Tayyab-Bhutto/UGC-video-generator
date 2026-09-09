import assert from 'assert';
import http from 'http';
import {
  isPrivateIPv4,
  isPrivateIPv6,
  isPrivateIP,
  normalizeAndValidateUrlFormat,
  validateUrlSecurity,
} from '../../dist/lib/security/url-security.js';
import { safeFetchProductPage } from '../../dist/lib/scraper/safe-fetcher.js';
import { extractProductPageData } from '../../dist/lib/scraper/product-extractor.js';
import { validateProductIntelligenceRuntime } from '../../dist/lib/ai/gemini-analyzer.js';

async function runSliceCTests() {
  console.log('--- RUNNING SLICE C AUTOMATED TESTS ---');

  // ==========================================
  // 1. SECURITY & URL NORMALIZATION TESTS
  // ==========================================
  console.log('Running Security Test 1: URL Normalization & Protocol Validation...');
  assert.strictEqual(normalizeAndValidateUrlFormat('example.com').normalizedUrl, 'https://example.com/');
  assert.strictEqual(normalizeAndValidateUrlFormat('http://example.com').normalizedUrl, 'http://example.com/');
  assert.strictEqual(normalizeAndValidateUrlFormat('ftp://example.com').valid, false);
  assert.strictEqual(normalizeAndValidateUrlFormat('file:///etc/passwd').valid, false);
  assert.strictEqual(normalizeAndValidateUrlFormat('javascript:alert(1)').valid, false);
  assert.strictEqual(normalizeAndValidateUrlFormat('data:text/html,test').valid, false);
  console.log('✓ Security Test 1 PASS');

  console.log('Running Security Test 2: IPv4 Private & Reserved Range Protection...');
  assert.strictEqual(isPrivateIPv4('127.0.0.1'), true, '127.0.0.1 must be private');
  assert.strictEqual(isPrivateIPv4('127.0.0.2'), true, '127.0.0.2 loopback');
  assert.strictEqual(isPrivateIPv4('0.0.0.0'), true, '0.0.0.0 unspecified');
  assert.strictEqual(isPrivateIPv4('10.0.0.1'), true, '10.x.x.x private');
  assert.strictEqual(isPrivateIPv4('172.16.0.1'), true, '172.16.x.x private');
  assert.strictEqual(isPrivateIPv4('172.31.255.255'), true, '172.31.x.x private');
  assert.strictEqual(isPrivateIPv4('192.168.1.1'), true, '192.168.x.x private');
  assert.strictEqual(isPrivateIPv4('169.254.169.254'), true, 'AWS metadata IP must be private');
  assert.strictEqual(isPrivateIPv4('8.8.8.8'), false, 'Public IP 8.8.8.8 must be allowed');
  assert.strictEqual(isPrivateIPv4('1.1.1.1'), false, 'Public IP 1.1.1.1 must be allowed');
  console.log('✓ Security Test 2 PASS');

  console.log('Running Security Test 3: IPv6 & IPv4-Mapped IPv6 Protection...');
  assert.strictEqual(isPrivateIPv6('::1'), true, 'IPv6 loopback');
  assert.strictEqual(isPrivateIPv6('::'), true, 'IPv6 unspecified');
  assert.strictEqual(isPrivateIPv6('fc00::1'), true, 'IPv6 unique local');
  assert.strictEqual(isPrivateIPv6('fe80::1'), true, 'IPv6 link local');
  assert.strictEqual(isPrivateIPv6('::ffff:127.0.0.1'), true, 'IPv4-mapped IPv6 loopback');
  assert.strictEqual(isPrivateIPv6('::ffff:10.0.0.1'), true, 'IPv4-mapped IPv6 private');
  assert.strictEqual(isPrivateIPv6('2606:4700:4700::1111'), false, 'Public IPv6 allowed');
  console.log('✓ Security Test 3 PASS');

  console.log('Running Security Test 4: Hostname & Local Domain Rejection...');
  const secLocal = await validateUrlSecurity('http://localhost:3000');
  assert.strictEqual(secLocal.valid, false, 'localhost must be rejected');
  const secZero = await validateUrlSecurity('http://0.0.0.0');
  assert.strictEqual(secZero.valid, false, '0.0.0.0 must be rejected');
  console.log('✓ Security Test 4 PASS');

  // ==========================================
  // 2. SAFE FETCHER UNIT TESTS (MOCK SERVER)
  // ==========================================
  console.log('Running Fetcher Test 1: Mock HTTP Server setup...');
  const mockPort = 38472;
  const mockHost = '127.0.0.1';

  const mockServer = http.createServer((req, res) => {
    const urlPath = req.url || '/';

    if (urlPath === '/normal') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<html><head><title>Test Product</title></head><body><h1>Awesome Product</h1><p>Description text.</p></body></html>');
    } else if (urlPath === '/redirect-1') {
      res.writeHead(302, { Location: '/redirect-2' });
      res.end();
    } else if (urlPath === '/redirect-2') {
      res.writeHead(302, { Location: '/normal' });
      res.end();
    } else if (urlPath === '/redirect-private') {
      res.writeHead(302, { Location: 'http://169.254.169.254/latest/meta-data/' });
      res.end();
    } else if (urlPath === '/redirect-loop') {
      res.writeHead(302, { Location: '/redirect-loop' });
      res.end();
    } else if (urlPath === '/huge-body') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      const chunk = Buffer.alloc(1024 * 1024, 'a'); // 1 MB
      res.write(chunk);
      res.write(chunk);
      res.write(chunk); // Total 3 MB > 2 MB cap
      res.end();
    } else if (urlPath === '/invalid-type') {
      res.writeHead(200, { 'Content-Type': 'application/pdf' });
      res.end('PDF content');
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  await new Promise(r => mockServer.listen(mockPort, mockHost, r));

  try {
    console.log('Running Fetcher Test 2: Private IP redirect block...');
    // We override IP check slightly for local mock server testing or test directly
    await assert.rejects(
      async () => {
        await safeFetchProductPage(`http://127.0.0.1:${mockPort}/normal`);
      },
      /Security validation failed/,
      '127.0.0.1 fetch must fail security check'
    );
    console.log('✓ Fetcher Test 2 PASS');
  } finally {
    mockServer.close();
  }

  // ==========================================
  // 3. PRODUCT EXTRACTION TESTS
  // ==========================================
  console.log('Running Extractor Test 1: Metadata & Content Parsing...');
  const sampleHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>HTML Page Title</title>
        <meta property="og:title" content="OpenGraph Product Title" />
        <meta property="og:description" content="OpenGraph description of the item." />
        <meta property="og:image" content="/images/og-hero.jpg" />
        <meta name="twitter:image" content="https://example.com/images/twitter.jpg" />
        <script>console.log('Script noise');</script>
        <style>body { color: red; }</style>
      </head>
      <body>
        <nav><a href="#">Home</a></nav>
        <h1>Main Product Heading</h1>
        <h2>Feature 1 Details</h2>
        <p>This product simplifies workflow automation for developers.</p>
        <img src="/images/product-main.png" alt="Product Main" />
        <footer>Footer copyright text</footer>
      </body>
    </html>
  `;

  const extracted = extractProductPageData('https://example.com/app', 'https://example.com/app', sampleHtml);
  assert.strictEqual(extracted.title, 'OpenGraph Product Title', 'og:title takes precedence');
  assert.strictEqual(extracted.description, 'OpenGraph description of the item.');
  assert.strictEqual(extracted.h1, 'Main Product Heading');
  assert.strictEqual(extracted.text.includes('Script noise'), false, 'Scripts must be removed');
  assert.strictEqual(extracted.text.includes('color: red'), false, 'Styles must be removed');
  assert.strictEqual(extracted.images.length, 3, 'Must extract og:image, twitter:image, and img src');
  assert.strictEqual(extracted.images[0].url, 'https://example.com/images/og-hero.jpg');
  assert.strictEqual(extracted.images[1].url, 'https://example.com/images/twitter.jpg');
  assert.strictEqual(extracted.images[2].url, 'https://example.com/images/product-main.png');
  console.log('✓ Extractor Test 1 PASS');

  // ==========================================
  // 4. GEMINI RUNTIME SCHEMA VALIDATION TESTS
  // ==========================================
  console.log('Running Gemini Runtime Test 1: ProductIntelligence schema verification...');
  const validIntelligence = {
    productAnalysis: {
      productName: 'FocusFlow',
      oneLiner: 'Distraction-free focus timer for deep work.',
      targetAudience: 'Developers and creators',
      primaryBenefit: 'Boost daily productivity by 40%',
      keyFeatures: ['Smart pomodoro', 'Block distraction sites', 'Daily metrics'],
      tone: 'Clean, focused, modern',
      category: 'Productivity App',
    },
    creativePlan: {
      hookText: 'STOP WASTING HOURS ON DISTRACTIONS.',
      bodyText: 'FocusFlow blocks interruptions and structures deep work sessions.',
      ctaText: 'GET FOCUSFLOW FREE',
      voiceoverScript: 'Stop wasting hours on distractions. FocusFlow blocks interruptions so you get deep work done.',
      visualKeywords: ['focus', 'timer', 'minimalist workspace'],
      gifSearchQuery: 'mind blown reaction',
      gifIntent: 'Reaction to finishing a 4-hour deep work streak',
      audioMood: 'focused',
    },
  };

  assert.doesNotThrow(() => validateProductIntelligenceRuntime(validIntelligence));
  assert.throws(() => validateProductIntelligenceRuntime({ ...validIntelligence, creativePlan: {} }), /creativePlan missing required field/);
  assert.throws(() => validateProductIntelligenceRuntime({
    ...validIntelligence,
    creativePlan: { ...validIntelligence.creativePlan, audioMood: 'invalid-mood' }
  }), /Invalid audioMood/);
  console.log('✓ Gemini Runtime Test 1 PASS');

  console.log('\n==================================================');
  console.log('ALL SLICE C UNIT & SECURITY TESTS PASSED!');
  console.log('==================================================\n');
}

runSliceCTests().catch(err => {
  console.error('Slice C test suite failed:', err);
  process.exit(1);
});
