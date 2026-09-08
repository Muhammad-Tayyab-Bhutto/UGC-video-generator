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

export interface StartRenderResult {
  renderId: string;
  bucketName: string;
  functionName: string;
  region: import('@remotion/lambda').AwsRegion;
}

export interface RenderStatusResult {
  status: 'rendering' | 'completed' | 'failed';
  progressPercent?: number;
  videoUrl?: string;
  error?: string;
}

export async function startUgcVideoRender(rawProps: unknown): Promise<StartRenderResult> {
  const validatedProps = validateVideoCompositionProps(rawProps);

  const region = (process.env.REMOTION_AWS_REGION || process.env.AWS_REGION || 'us-east-1') as import('@remotion/lambda').AwsRegion;
  process.env.AWS_REGION = region;

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY) missing from environment.');
  }

  const { bundle } = await import('@remotion/bundler');
  const {
    deployFunction,
    deploySiteFromBundle,
    getOrCreateBucket,
    renderMediaOnLambda,
  } = await import('@remotion/lambda');

  const { bucketName } = await getOrCreateBucket({ region });

  const { functionName } = await deployFunction({
    region,
    timeoutInSeconds: 120,
    memorySizeInMb: 2048,
    createCloudWatchLogGroup: true,
  });

  let serveUrl = process.env.REMOTION_SERVE_URL;
  if (!serveUrl) {
    serveUrl = `https://${bucketName}.s3.${region}.amazonaws.com/sites/ugc-video-generator-site/index.html`;
  }

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

  return {
    renderId,
    bucketName: renderBucket,
    functionName,
    region,
  };
}

export async function checkUgcVideoRenderStatus(
  renderId: string,
  bucketName?: string,
  functionName?: string,
  regionParam?: string
): Promise<RenderStatusResult> {
  const region = (regionParam || process.env.REMOTION_AWS_REGION || process.env.AWS_REGION || 'us-east-1') as import('@remotion/lambda').AwsRegion;
  process.env.AWS_REGION = region;

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS credentials missing from environment.');
  }

  const { getOrCreateBucket, deployFunction, getRenderProgress } = await import('@remotion/lambda');

  const resolvedBucket = bucketName || (await getOrCreateBucket({ region })).bucketName;
  const resolvedFunction = functionName || (await deployFunction({
    region,
    timeoutInSeconds: 120,
    memorySizeInMb: 2048,
    createCloudWatchLogGroup: true,
  })).functionName;

  const progress = await getRenderProgress({
    renderId,
    bucketName: resolvedBucket,
    functionName: resolvedFunction,
    region,
  });

  if (progress.fatalErrorEncountered) {
    const errorMsg = progress.errors.map(e => e.message).join('; ');
    return {
      status: 'failed',
      error: `Lambda render failed: ${errorMsg}`,
    };
  }

  if (progress.done) {
    return {
      status: 'completed',
      progressPercent: 100,
      videoUrl: progress.outputFile || '',
    };
  }

  const overallProgress = Math.round((progress.overallProgress || 0) * 100);

  return {
    status: 'rendering',
    progressPercent: overallProgress,
  };
}

export async function renderUgcVideo(rawProps: unknown): Promise<VideoResult> {
  const validatedProps = validateVideoCompositionProps(rawProps);
  const startResult = await startUgcVideoRender(validatedProps);

  let completed = false;
  let finalUrl = '';

  while (!completed) {
    await new Promise(r => setTimeout(r, 3000));
    const statusResult = await checkUgcVideoRenderStatus(
      startResult.renderId,
      startResult.bucketName,
      startResult.functionName,
      startResult.region
    );

    if (statusResult.status === 'failed') {
      throw new Error(statusResult.error || 'Lambda render failed');
    }

    if (statusResult.status === 'completed') {
      completed = true;
      finalUrl = statusResult.videoUrl || '';
    }
  }

  return {
    jobId: startResult.renderId,
    videoUrl: finalUrl,
    durationSeconds: Math.round((validatedProps.durationInFrames || 210) / (validatedProps.fps || 30)),
    title: `${validatedProps.hookText} - UGC Video`,
  };
}
