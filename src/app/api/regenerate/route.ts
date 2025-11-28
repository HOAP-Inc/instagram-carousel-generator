import { NextRequest, NextResponse } from 'next/server';
import { analyzePhotoLayout } from '@/lib/llm';
import { bufferToBase64, generateCarouselImages } from '@/lib/image-generator';
import { getJob, readImageFile, saveOutputImage, updateJob } from '@/lib/storage';
import { RegenerateImagesRequest, SlideManualOverride, LLMResponse } from '@/lib/types';

function textToTuple(text: string): [string, string] {
  const trimmed = (text ?? '').trim();
  return [trimmed, ''];
}

function normalizeOverride(raw?: SlideManualOverride | null): SlideManualOverride | null {
  if (!raw) return null;
  const normalized: SlideManualOverride = {};

  if (raw.personPosition && ['left', 'center', 'right'].includes(raw.personPosition)) {
    normalized.personPosition = raw.personPosition;
  }
  if (raw.textPosition && ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'].includes(raw.textPosition)) {
    normalized.textPosition = raw.textPosition;
  }
  if (typeof raw.fontScale === 'number' && !Number.isNaN(raw.fontScale)) {
    normalized.fontScale = raw.fontScale;
  }
  if (typeof raw.personOffsetX === 'number' && !Number.isNaN(raw.personOffsetX)) {
    normalized.personOffsetX = raw.personOffsetX;
  }
  if (typeof raw.personOffsetY === 'number' && !Number.isNaN(raw.personOffsetY)) {
    normalized.personOffsetY = raw.personOffsetY;
  }
  if (typeof raw.personScale === 'number' && !Number.isNaN(raw.personScale)) {
    normalized.personScale = raw.personScale;
  }
  if (typeof raw.textYOffset === 'number' && !Number.isNaN(raw.textYOffset)) {
    normalized.textYOffset = raw.textYOffset;
  }
  if (typeof raw.textAreaRatio === 'number' && !Number.isNaN(raw.textAreaRatio)) {
    normalized.textAreaRatio = raw.textAreaRatio;
  }
  if (typeof raw.textOffsetX === 'number' && !Number.isNaN(raw.textOffsetX)) {
    normalized.textOffsetX = raw.textOffsetX;
  }
  if (typeof raw.textOffsetY === 'number' && !Number.isNaN(raw.textOffsetY)) {
    normalized.textOffsetY = raw.textOffsetY;
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
}

export async function POST(request: NextRequest) {
  try {
    const body: RegenerateImagesRequest = await request.json();
    const { jobId, slides, caption, overrides = [] } = body;

    if (!jobId || !slides) {
      return NextResponse.json(
        { success: false, error: 'jobId とスライド内容は必須です' },
        { status: 400 }
      );
    }

    const job = getJob(jobId);
    if (!job) {
      console.error(`❌ ジョブが見つかりません: ${jobId}`);
      return NextResponse.json(
        { 
          success: false, 
          error: '該当するジョブが見つかりません。サーバーが再起動された可能性があります。最初から生成し直してください。' 
        },
        { status: 404 }
      );
    }

    if (!job.photosPaths?.every((path) => Boolean(path))) {
      return NextResponse.json(
        { success: false, error: '写真データが不足しているため再描画できません' },
        { status: 400 }
      );
    }

    const photoBuffers = await Promise.all(
      job.photosPaths.map((path) => readImageFile(path))
    );

    const base64Photos = photoBuffers.map((buffer) => bufferToBase64(buffer));
    const photoAnalyses = await Promise.all(
      base64Photos.map((photo) => analyzePhotoLayout(photo).catch(() => null))
    );

    const manualOverrides: [SlideManualOverride | null, SlideManualOverride | null, SlideManualOverride | null] = [
      normalizeOverride(overrides[0]),
      normalizeOverride(overrides[1]),
      normalizeOverride(overrides[2]),
    ];

    const slideTuples = {
      slide1: textToTuple(slides.slide1),
      slide2: textToTuple(slides.slide2),
      slide3: textToTuple(slides.slide3),
    };

    const [image1, image2, image3] = await generateCarouselImages(
      [photoBuffers[0], photoBuffers[1], photoBuffers[2]],
      slideTuples,
      job.designNumber,
      job.logoImage ?? null,
      job.customDesign ?? null,
      photoAnalyses as [any, any, any],
      manualOverrides
    );

    const [result1, result2, result3] = await Promise.all([
      saveOutputImage(job.id, 0, image1),
      saveOutputImage(job.id, 1, image2),
      saveOutputImage(job.id, 2, image3),
    ]);

    const llmResponse: LLMResponse = {
      slide1: slideTuples.slide1,
      slide2: slideTuples.slide2,
      slide3: slideTuples.slide3,
      caption,
      style_tags: job.llmResponseJson?.style_tags ?? [],
    };

    updateJob(job.id, {
      llmResponseJson: llmResponse,
      outputPngPaths: [result1.path, result2.path, result3.path],
      outputPngUrls: [result1.url, result2.url, result3.url],
    });

    return NextResponse.json({
      success: true,
      data: {
        images: [result1.url, result2.url, result3.url],
        slide1: slideTuples.slide1,
        slide2: slideTuples.slide2,
        slide3: slideTuples.slide3,
        caption,
      },
    });
  } catch (error) {
    console.error('Regenerate API error:', error);
    return NextResponse.json(
      { success: false, error: '画像の再生成に失敗しました' },
      { status: 500 }
    );
  }
}

