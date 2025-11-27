// POST /api/notion/save - Notion保存API

import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/storage';
import { updateNotionPageFull } from '@/lib/notion';

export async function POST(request: NextRequest) {
  try {
    const { jobId } = await request.json();

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'jobIdが必要です' },
        { status: 400 }
      );
    }

    const job = getJob(jobId);
    if (!job) {
      return NextResponse.json(
        { success: false, error: 'ジョブが見つかりません' },
        { status: 404 }
      );
    }

    if (job.status !== 'success' || !job.llmResponseJson) {
      return NextResponse.json(
        { success: false, error: 'ジョブが完了していません' },
        { status: 400 }
      );
    }

    // Notion API Keyがない場合はスキップ
    if (!process.env.NOTION_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Notion API Keyが設定されていません。画像はダウンロード可能です。',
      });
    }

    // Notionに保存
    const result = await updateNotionPageFull(
      job.notionPageId,
      {
        title: job.llmResponseJson.slide1.join('\n'),
        slide2Text: job.llmResponseJson.slide2.join('\n'),
        slide3Text: job.llmResponseJson.slide3.join('\n'),
        caption: job.llmResponseJson.caption,
      },
      // 画像URLはNotion APIの制限により、外部URLが必要
      // MVPでは画像添付はスキップ
      undefined
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notion save error:', error);
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

