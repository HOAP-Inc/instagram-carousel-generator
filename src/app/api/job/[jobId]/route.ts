// GET /api/job/[jobId] - ジョブステータス取得API

import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const job = getJob(jobId);

    if (!job) {
      return NextResponse.json(
        { job: null, error: 'ジョブが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error('Job fetch error:', error);
    return NextResponse.json(
      { job: null, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

