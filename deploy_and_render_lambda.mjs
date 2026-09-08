import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local manually into process.env
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.substring(0, eqIdx).trim();
        const val = trimmed.substring(eqIdx + 1).trim();
        process.env[key] = val;
      }
    }
  });
}

async function main() {
  console.log('--- REMOTION LAMBDA PRODUCTION RENDER PROOF ---');
  const region = process.env.REMOTION_AWS_REGION || process.env.AWS_REGION || 'us-east-1';
  process.env.AWS_REGION = region;

  console.log('Importing @remotion/lambda and @remotion/bundler...');
  const { bundle } = await import('@remotion/bundler');
  const {
    deployFunction,
    deploySite,
    getOrCreateBucket,
    renderMediaOnLambda,
    getRenderProgress,
  } = await import('@remotion/lambda/deploy');

  console.log('1. Ensuring S3 Bucket exists in region:', region);
  const { bucketName } = await getOrCreateBucket({ region });
  console.log('S3 Bucket confirmed:', bucketName);

  console.log('2. Deploying Remotion Lambda Function...');
  const { functionName } = await deployFunction({
    region,
    timeoutInSeconds: 120,
    memorySizeInMb: 2048,
    createCloudWatchLogGroup: true,
  });
  console.log('Lambda Function deployed:', functionName);

  console.log('3. Bundling and Deploying Remotion Site to S3...');
  const entryPoint = path.join(__dirname, 'src/remotion/index.ts');
  const bundleLocation = await bundle({ entryPoint });

  const { siteName } = await deploySite({
    bucketName,
    entryPoint,
    region,
    siteName: 'ugc-video-generator-site',
  });
  console.log('Remotion Site deployed to S3:', siteName);

  console.log('4. Triggering Production Render on Lambda...');
  const inputProps = {
    hookText: 'CALORIES TRACKED FROM A PHOTO.',
    bodyText: 'Snap your meal & get full breakdown.',
    ctaText: 'TRY CALAI FREE',
    backgroundUrl: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=1080&h=1920&fit=crop',
    backgroundType: 'image',
    gifUrl: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
    audioUrl: '',
    durationInFrames: 210,
    fps: 30,
  };

  const { renderId, bucketName: renderBucket } = await renderMediaOnLambda({
    region,
    functionName,
    serveUrl: siteName,
    composition: 'UGCVideo',
    inputProps,
    codec: 'h264',
    downloadBehavior: {
      type: 'public',
      fileName: 'output.mp4',
    },
  });

  console.log(`Render dispatched! Render ID: ${renderId}`);

  console.log('5. Polling Render Progress...');
  let completed = false;
  let finalUrl = '';
  let renderStats = null;

  while (!completed) {
    await new Promise(r => setTimeout(r, 3000));
    const progress = await getRenderProgress({
      renderId,
      bucketName: renderBucket,
      functionName,
      region,
    });

    console.log(`Progress: ${Math.round((progress.overallProgress || 0) * 100)}% - Status: ${progress.fatalErrorEncountered ? 'FAILED' : progress.done ? 'DONE' : 'RENDERING'}`);

    if (progress.fatalErrorEncountered) {
      console.error('Fatal error encountered during Lambda render:', progress.errors);
      throw new Error(`Render failed: ${JSON.stringify(progress.errors)}`);
    }

    if (progress.done) {
      completed = true;
      finalUrl = progress.outputFile;
      renderStats = progress;
    }
  }

  console.log('\n==================================================');
  console.log('PRODUCTION AWS LAMBDA RENDER SUCCESSFUL!');
  console.log('Render ID:', renderId);
  console.log('Public HTTPS MP4 URL:', finalUrl);
  console.log('==================================================\n');
}

main().catch(err => {
  console.error('Production render failed:', err);
  process.exit(1);
});
