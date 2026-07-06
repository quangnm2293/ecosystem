import { mkdir, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import path from 'path';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'generated-videos');

export type VeoAspectRatio = '9:16' | '16:9';
export type VeoDuration = 4 | 6 | 8;

export type VeoInlineImage = {
  mimeType: string;
  data: string;
};

export type VeoGenerateRequest = {
  prompt: string;
  model?: string;
  aspectRatio?: VeoAspectRatio;
  durationSeconds?: VeoDuration;
  resolution?: '720p' | '1080p';
  image?: VeoInlineImage;
  video?: { mimeType: string; data: string };
  personGeneration?: 'allow_all' | 'allow_adult';
};

export type VeoOperationResult = {
  videoUri: string;
  videoBytes: Buffer;
  raiFiltered?: string[];
};

export const VEO_MODEL_IDS = {
  standard: 'veo-3.1-generate-preview',
  fast: 'veo-3.1-fast-generate-preview',
} as const;

export type VeoModelPreset = keyof typeof VEO_MODEL_IDS;

export function resolveVeoModel(presetOrId?: string): string {
  if (!presetOrId) return process.env.VEO_MODEL ?? VEO_MODEL_IDS.fast;
  if (presetOrId in VEO_MODEL_IDS) {
    return VEO_MODEL_IDS[presetOrId as VeoModelPreset];
  }
  if (presetOrId.startsWith('veo-')) return presetOrId;
  return process.env.VEO_MODEL ?? VEO_MODEL_IDS.fast;
}

export function getVeoModel(): string {
  return resolveVeoModel();
}

export function isVeoConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY chưa được cấu hình — Veo 3 yêu cầu Gemini API key (paid tier).');
  return key;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type VeoInstance = {
  prompt: string;
  image?: { inlineData: VeoInlineImage };
  video?: { inlineData: { mimeType: string; data: string } };
};

type VeoParameters = {
  aspectRatio: string;
  durationSeconds: number;
  resolution: string;
  personGeneration: string;
};

async function startGeneration(
  model: string,
  instance: VeoInstance,
  parameters: VeoParameters,
): Promise<string> {
  const res = await fetch(`${BASE_URL}/models/${model}:predictLongRunning`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': getApiKey(),
    },
    body: JSON.stringify({ instances: [instance], parameters }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Veo start failed (${res.status}): ${err.slice(0, 400)}`);
  }

  const data = (await res.json()) as { name?: string };
  if (!data.name) throw new Error('Veo không trả về operation name');
  return data.name;
}

async function pollOperation(
  operationName: string,
  maxWaitMs = 420_000,
  intervalMs = 10_000,
): Promise<{
  videoUri: string;
  raiFiltered?: string[];
}> {
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    const res = await fetch(`${BASE_URL}/${operationName}`, {
      headers: { 'x-goog-api-key': getApiKey() },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Veo poll failed (${res.status}): ${err.slice(0, 300)}`);
    }

    const data = (await res.json()) as {
      done?: boolean;
      error?: { message?: string };
      response?: {
        generateVideoResponse?: {
          generatedSamples?: { video?: { uri?: string } }[];
          raiMediaFilteredReasons?: string[];
        };
      };
    };

    if (data.error?.message) {
      throw new Error(`Veo generation error: ${data.error.message}`);
    }

    if (data.done) {
      const sample = data.response?.generateVideoResponse?.generatedSamples?.[0];
      const uri = sample?.video?.uri;
      if (!uri) throw new Error('Veo hoàn thành nhưng không có video URI');
      return {
        videoUri: uri,
        raiFiltered: data.response?.generateVideoResponse?.raiMediaFilteredReasons,
      };
    }

    await sleep(intervalMs);
  }

  throw new Error('Veo timeout — video chưa sẵn sàng trong thời gian chờ');
}

async function downloadVideoBytes(uri: string): Promise<Buffer> {
  const res = await fetch(uri, {
    headers: { 'x-goog-api-key': getApiKey() },
    redirect: 'follow',
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Veo download failed (${res.status}): ${err.slice(0, 300)}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

export async function fetchImageAsBase64(
  url: string,
): Promise<VeoInlineImage | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(12_000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EcosystemBot/1.0)' },
    });
    if (!res.ok) return null;

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength < 100 || buf.byteLength > 8_000_000) return null;

    const contentType = res.headers.get('content-type') ?? 'image/jpeg';
    const mimeType = contentType.split(';')[0].trim() || 'image/jpeg';
    return { mimeType, data: buf.toString('base64') };
  } catch {
    return null;
  }
}

export async function generateVeoVideo(
  request: VeoGenerateRequest,
): Promise<VeoOperationResult> {
  const model = resolveVeoModel(request.model);
  const instance: VeoInstance = { prompt: request.prompt };

  if (request.image) {
    instance.image = { inlineData: request.image };
  }
  if (request.video) {
    instance.video = { inlineData: request.video };
  }

  const durationSeconds = Number(request.durationSeconds ?? 8) as VeoDuration;
  const parameters: VeoParameters = {
    aspectRatio: request.aspectRatio ?? '9:16',
    durationSeconds,
    resolution: request.resolution ?? '720p',
    personGeneration: request.personGeneration ?? (request.image ? 'allow_adult' : 'allow_all'),
  };

  const operationName = await startGeneration(model, instance, parameters);
  const { videoUri, raiFiltered } = await pollOperation(operationName);
  const videoBytes = await downloadVideoBytes(videoUri);

  return { videoUri, videoBytes, raiFiltered };
}

export async function saveVeoVideoToPublic(videoBytes: Buffer): Promise<string> {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const fileName = `${randomUUID()}.mp4`;
  await writeFile(path.join(OUTPUT_DIR, fileName), videoBytes);
  return `/generated-videos/${fileName}`;
}
