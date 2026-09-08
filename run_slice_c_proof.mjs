import { processProductUrl } from './dist/src/lib/intelligence/pipeline.js';

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error('Usage: node run_slice_c_proof.mjs <URL>');
    process.exit(1);
  }

  console.log(`\n==================================================`);
  console.log(`PROCESSING PRODUCT URL INTELLIGENCE FOR: ${url}`);
  console.log(`==================================================\n`);

  try {
    const result = await processProductUrl(url);

    console.log('--- EXTRACTION RESULTS ---');
    console.log('REQUESTED URL:', result.pageData.requestedUrl);
    console.log('FINAL URL:    ', result.pageData.finalUrl);
    console.log('TITLE:        ', result.pageData.title);
    console.log('DESCRIPTION:  ', result.pageData.description);
    console.log('IMAGES COUNT: ', result.pageData.images.length);

    console.log('\n--- PRODUCT ANALYSIS ---');
    console.log(JSON.stringify(result.intelligence.productAnalysis, null, 2));

    console.log('\n--- CREATIVE PLAN ---');
    console.log(JSON.stringify(result.intelligence.creativePlan, null, 2));
    console.log(`\n==================================================\n`);
  } catch (err) {
    console.error('Slice C proof failed:', err.message || err);
    process.exit(1);
  }
}

main();
