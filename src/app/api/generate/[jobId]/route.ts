import { NextRequest, NextResponse } from 'next/server';
import { checkUgcVideoRenderStatus } from '@/lib/renderer/render-ugc-video';

export const runtime = 'nodejs';
export const maxDuration = 15;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    if (!jobId || typeof jobId !== 'string' || !/^[a-zA-Z0-9_-]{5,50}$/.test(jobId)) {
      return NextResponse.json({ error: 'Invalid or malformed render jobId' }, { status: 400 });
    }

    const searchParams = req.nextUrl.searchParams;
    const bucketName = searchParams.get('bucket') || undefined;
    const functionName = searchParams.get('function') || undefined;

    const statusResult = await checkUgcVideoRenderStatus(jobId, bucketName, functionName);

    if (statusResult.status === 'failed') {
      return NextResponse.json({
        jobId,
        status: 'failed',
        error: statusResult.error || 'Video rendering failed on AWS Lambda.',
      }, { status: 422 });
    }

    if (statusResult.status === 'completed') {
      return NextResponse.json({
        jobId,
        status: 'completed',
        progressPercent: 100,
        videoUrl: statusResult.videoUrl,
      });
    }

    return NextResponse.json({
      jobId,
      status: 'rendering',
      progressPercent: statusResult.progressPercent || 0,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[status-route-error]', msg);
    return NextResponse.json({ error: 'Failed to retrieve render status.' }, { status: 500 });
  }
}
