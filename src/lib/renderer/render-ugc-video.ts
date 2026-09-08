import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { VideoCompositionProps, VideoResult } from '../../types';
import { validateVideoCompositionProps } from '../validation/composition-props-validator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local manually into process.env if present
const rootEnvPath = path.resolve(__dirname, '../../../.env.local');
if (fs.existsSync(rootEnvPath)) {
  const envContent = fs.readFileSync(rootEnvPath, 'utf-8');
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

export async function renderUgcVideo(rawProps: unknown): Promise<VideoResult> {
  // 1. Validate composition props
  const validatedProps = validateVideoCompositionProps(rawProps);

  const region = (process.env.REMOTION_AWS_REGION || process.env.AWS_REGION || 'us-east-1') as import('@remotion/lambda').AwsRegion;
  process.env.AWS_REGION = region;

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY) missing from environment.');
  }

  // 2. Import Remotion modules dynamically
  const { bundle } = await import('@remotion/bundler');
  const {
    deployFunction,
    deploySiteFromBundle,
    getOrCreateBucket,
    renderMediaOnLambda,
    getRenderProgress,
  } = await import('@remotion/lambda');

  // 3. Get or create S3 Bucket
  const { bucketName } = await getOrCreateBucket({ region });

  // 4. Deploy Lambda Function
  const { functionName } = await deployFunction({
    region,
    timeoutInSeconds: 120,
    memorySizeInMb: 2048,
    createCloudWatchLogGroup: true,
  });

  // 5. Serve URL resolution (Use existing deployed site if available, fallback to deploySiteFromBundle)
  let serveUrl = process.env.REMOTION_SERVE_URL;
  if (!serveUrl) {
    // Standard Remotion Lambda S3 site URL format for us-east-1 / remotionlambda-useast1-jwc4yc5wbb
    serveUrl = `https://${bucketName}.s3.${region}.amazonaws.com/sites/ugc-video-generator-site/index.html`;
  }

  // Fallback to bundler if static URL check fails locally in dev
  if (process.env.NODE_ENV === 'development' && process.env.REMOTION_FORCE_BUNDLE === 'true') {
    const entryPoint = path.resolve(process.cwd(), 'src/remotion/index.ts');
    const bundleLocation = await bundle({ entryPoint });
    const deployed = await deploySiteFromBundle({
      bucketName,
      bundleDir: bundleLocation,
      region,
      siteName: 'ugc-video-generator-site',
      privacy: 'no-acl',
    });
    serveUrl = deployed.serveUrl;
  }

  // 6. Trigger Render on Lambda using framesPerLambda exclusively
  const { renderId, bucketName: renderBucket } = await renderMediaOnLambda({
    region,
    functionName,
    serveUrl,
    composition: 'UGCVideo',
    inputProps: validatedProps as unknown as Record<string, unknown>,
    codec: 'h264',
    framesPerLambda: 120,
    downloadBehavior: {
      type: 'play-in-browser',
    },
  });

  // 7. Poll until complete
  let completed = false;
  let finalUrl = '';

  while (!completed) {
    await new Promise(r => setTimeout(r, 3000));
    const progress = await getRenderProgress({
      renderId,
      bucketName: renderBucket,
      functionName,
      region,
    });

    if (progress.fatalErrorEncountered) {
      const errorMsg = progress.errors.map(e => e.message).join('; ');
      throw new Error(`Lambda render failed: ${errorMsg}`);
    }

    if (progress.done) {
      completed = true;
      finalUrl = progress.outputFile || '';
    }
  }

  return {
    jobId: renderId,
    videoUrl: finalUrl,
    durationSeconds: Math.round((validatedProps.durationInFrames || 210) / (validatedProps.fps || 30)),
    title: `${validatedProps.hookText} - UGC Video`,
  };
}
