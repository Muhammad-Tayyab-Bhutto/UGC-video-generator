"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderUgcVideo = renderUgcVideo;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const url_1 = require("url");
const composition_props_validator_1 = require("../validation/composition-props-validator");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
// Load .env.local manually into process.env if present
const rootEnvPath = path_1.default.resolve(__dirname, '../../../.env.local');
if (fs_1.default.existsSync(rootEnvPath)) {
    const envContent = fs_1.default.readFileSync(rootEnvPath, 'utf-8');
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
async function renderUgcVideo(rawProps) {
    // 1. Validate composition props
    const validatedProps = (0, composition_props_validator_1.validateVideoCompositionProps)(rawProps);
    const region = (process.env.REMOTION_AWS_REGION || process.env.AWS_REGION || 'us-east-1');
    process.env.AWS_REGION = region;
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        throw new Error('AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY) missing from environment.');
    }
    // 2. Import Remotion modules dynamically
    const { bundle } = await import('@remotion/bundler');
    const { deployFunction, deploySiteFromBundle, getOrCreateBucket, renderMediaOnLambda, getRenderProgress, } = await import('@remotion/lambda');
    // 3. Get or create S3 Bucket
    const { bucketName } = await getOrCreateBucket({ region });
    // 4. Deploy Lambda Function
    const { functionName } = await deployFunction({
        region,
        timeoutInSeconds: 120,
        memorySizeInMb: 2048,
        createCloudWatchLogGroup: true,
    });
    // 5. Bundle & Deploy Remotion Site
    const entryPoint = path_1.default.resolve(__dirname, '../../remotion/index.ts');
    const bundleLocation = await bundle({ entryPoint });
    const { siteName, serveUrl } = await deploySiteFromBundle({
        bucketName,
        bundleDir: bundleLocation,
        region,
        siteName: 'ugc-video-generator-site',
        privacy: 'no-acl',
    });
    // 6. Trigger Render on Lambda using framesPerLambda exclusively
    const { renderId, bucketName: renderBucket } = await renderMediaOnLambda({
        region,
        functionName,
        serveUrl,
        composition: 'UGCVideo',
        inputProps: validatedProps,
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
