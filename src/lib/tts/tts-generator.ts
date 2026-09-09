import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export interface VoiceoverResult {
  audioUrl: string;
  durationSeconds: number;
  provider: 'polly' | 'google-tts';
}

function parseMp3DurationSeconds(buffer: Buffer): number {
  let offset = 0;
  let totalDuration = 0;

  const bitrates = [
    [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320], // V1, L3
    [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160]      // V2, L3
  ];
  const sampleRates = [
    [44100, 48000, 32000], // V1
    [22050, 24000, 16000], // V2
    [11025, 12000, 8000]   // V2.5
  ];

  while (offset < buffer.length - 4) {
    if (buffer[offset] === 0xFF && (buffer[offset + 1] & 0xE0) === 0xE0) {
      const header = buffer.readUInt32BE(offset);
      const versionBit = (header >> 19) & 3; // 3 = V1, 2 = V2, 0 = V2.5
      const bitrateIdx = (header >> 12) & 15;
      const sampleRateIdx = (header >> 10) & 3;
      const paddingBit = (header >> 9) & 1;

      if (versionBit !== 1 && bitrateIdx > 0 && bitrateIdx < 15 && sampleRateIdx < 3) {
        const verIdx = versionBit === 3 ? 0 : 1;
        const srGroup = versionBit === 3 ? 0 : (versionBit === 2 ? 1 : 2);
        const bitrate = bitrates[verIdx][bitrateIdx] * 1000;
        const sampleRate = sampleRates[srGroup][sampleRateIdx];
        const samplesPerFrame = versionBit === 3 ? 1152 : 576;
        
        const frameSize = Math.floor((samplesPerFrame * bitrate / 8) / sampleRate) + paddingBit;
        if (frameSize > 0) {
          totalDuration += samplesPerFrame / sampleRate;
          offset += frameSize;
          continue;
        }
      }
    }
    offset++;
  }
  return totalDuration > 0 ? totalDuration : 6.0;
}

export async function generateVoiceover(script: string): Promise<VoiceoverResult | null> {
  const cleanScript = script.trim();
  if (!cleanScript) return null;

  const region = (process.env.REMOTION_AWS_REGION || process.env.AWS_REGION || 'us-east-1');
  const bucketName = process.env.REMOTION_AWS_BUCKET || 'remotionlambda-useast1-jwc4yc5wbb';

  // 1. Try Primary Provider: Google Translate TTS endpoint
  try {
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanScript)}&tl=en&client=tw-ob`;
    const res = await fetch(ttsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (res.ok) {
      const audioArrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(audioArrayBuffer);
      const durationSeconds = parseMp3DurationSeconds(buffer);

      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        const s3 = new S3Client({
          region,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          },
        });

        const key = `voiceovers/tts_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.mp3`;
        await s3.send(
          new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: buffer,
            ContentType: 'audio/mpeg',
          })
        );

        const audioUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
        return { audioUrl, durationSeconds, provider: 'google-tts' };
      }
    }
  } catch (googleErr) {
    console.warn('[TTS] Google TTS endpoint request failed, attempting Polly fallback:', googleErr);
  }

  // 2. Secondary Provider: AWS Polly if authorized
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    try {
      const polly = new PollyClient({
        region,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });

      const response = await polly.send(
        new SynthesizeSpeechCommand({
          Engine: 'neural',
          VoiceId: 'Matthew',
          OutputFormat: 'mp3',
          Text: cleanScript,
        })
      );

      if (response.AudioStream) {
        const byteArray = await response.AudioStream.transformToByteArray();
        const buffer = Buffer.from(byteArray);
        const durationSeconds = parseMp3DurationSeconds(buffer);

        const s3 = new S3Client({
          region,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          },
        });

        const key = `voiceovers/polly_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.mp3`;
        await s3.send(
          new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: buffer,
            ContentType: 'audio/mpeg',
          })
        );

        const audioUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
        return { audioUrl, durationSeconds, provider: 'polly' };
      }
    } catch (pollyErr) {
      console.warn('[TTS] AWS Polly synthesis unavailable:', pollyErr);
    }
  }

  return null;
}
