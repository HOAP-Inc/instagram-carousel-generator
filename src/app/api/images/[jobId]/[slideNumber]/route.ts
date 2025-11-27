// GET /api/images/[jobId]/[slideNumber] - 生成画像取得API

import { NextRequest, NextResponse } from 'next/server';
import { getOutputImage } from '@/lib/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string; slideNumber: string }> }
) {
  try {
    const { jobId, slideNumber } = await params;
    const slideNum = parseInt(slideNumber, 10) as 1 | 2 | 3;

    if (![1, 2, 3].includes(slideNum)) {
      return NextResponse.json(
        { error: 'Invalid slide number' },
        { status: 400 }
      );
    }

    const imageBuffer = await getOutputImage(jobId, slideNum);
    
    if (!imageBuffer) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    return new NextResponse(new Uint8Array(imageBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Image fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

