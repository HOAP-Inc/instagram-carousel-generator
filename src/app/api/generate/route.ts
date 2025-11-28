// POST /api/generate - コンテンツ生成API

import { NextRequest, NextResponse } from 'next/server';
import { GenerateRequest, DesignNumber } from '@/lib/types';
import { extractNotionPageId } from '@/lib/validation';
import { verifyNotionPage } from '@/lib/notion';
import { generateContent, analyzePhotoLayout } from '@/lib/llm';
import { generateCarouselImages, bufferToBase64 } from '@/lib/image-generator';
import { createJob, updateJob, savePhoto, saveOutputImage } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { notionPageUrl, surveyText, mainTheme = '', designNumber, photos, clientContext = '', logoImage = null, customDesign = null } = body;

    // バリデーション
    if (!surveyText || !designNumber || !photos || photos.length !== 3) {
      return NextResponse.json(
        { success: false, error: '必須項目が不足しています' },
        { status: 400 }
      );
    }

    if (![1, 2, 3].includes(designNumber)) {
      return NextResponse.json(
        { success: false, error: 'デザイン番号は1〜3で指定してください' },
        { status: 400 }
      );
    }

    // NotionページIDを抽出（任意）
    let notionPageId = '';
    if (notionPageUrl && notionPageUrl.trim()) {
      const extractedId = extractNotionPageId(notionPageUrl);
      if (!extractedId) {
        return NextResponse.json(
          { success: false, error: 'NotionページURLが無効です' },
          { status: 400 }
        );
      }
      notionPageId = extractedId;

      // Notionページの存在確認（オプション - API Keyがない場合はスキップ）
      if (process.env.NOTION_API_KEY) {
        const pageVerification = await verifyNotionPage(notionPageId);
        if (!pageVerification.success) {
          return NextResponse.json(
            { 
              success: false, 
              error: pageVerification.error,
              missingProperties: pageVerification.missingProperties,
            },
            { status: 400 }
          );
        }
      }
    }

    // ジョブを作成
    const job = await createJob(
      notionPageId,
      notionPageUrl,
      surveyText,
      designNumber as DesignNumber,
      {
        mainTheme,
        clientContext,
        logoImage,
        customDesign,
      }
    );

    // 写真を保存
    const photoPaths: [string, string, string] = ['', '', ''];
    for (let i = 0; i < 3; i++) {
      const photoPath = await savePhoto(job.id, i as 0 | 1 | 2, photos[i]);
      photoPaths[i] = photoPath;
    }
    updateJob(job.id, { photosPaths: photoPaths, status: 'processing' });

    // LLMでコンテンツ生成（クライアントナレッジと伝えたいテーマを使用）
    const llmResult = await generateContent({
      surveyText,
      photosMeta: '',
      clientContext, // クライアントのナレッジを渡す
      mainTheme, // 一番伝えたいテーマを渡す
    });

    if (!llmResult.success || !llmResult.data) {
      updateJob(job.id, {
        status: 'failed',
        errorMessage: llmResult.error || '生成に失敗しました',
      });
      return NextResponse.json(
        { success: false, error: llmResult.error, jobId: job.id },
        { status: 400 }
      );
    }

    updateJob(job.id, { llmResponseJson: llmResult.data });

    // 写真を分析（Vision API）
    console.log('🔍 写真をAI分析中...');
    const photoAnalyses = await Promise.all([
      analyzePhotoLayout(photos[0]),
      analyzePhotoLayout(photos[1]),
      analyzePhotoLayout(photos[2]),
    ]);
    console.log('✅ 写真分析完了');

    // 画像生成
    try {
      const [image1, image2, image3] = await generateCarouselImages(
        [photos[0], photos[1], photos[2]],
        {
          slide1: llmResult.data.slide1,
          slide2: llmResult.data.slide2,
          slide3: llmResult.data.slide3,
        },
        designNumber as DesignNumber,
        logoImage, // ロゴ画像を渡す
        customDesign, // カスタムデザインを渡す
        photoAnalyses as [any, any, any] // AI分析結果を渡す
      );

      // 画像を保存
      const outputPaths: [string, string, string] = ['', '', ''];
      const outputUrls: [string, string, string] = ['', '', ''];
      
      const [result1, result2, result3] = await Promise.all([
        saveOutputImage(job.id, 0, image1),
        saveOutputImage(job.id, 1, image2),
        saveOutputImage(job.id, 2, image3),
      ]);

      outputPaths[0] = result1.path;
      outputPaths[1] = result2.path;
      outputPaths[2] = result3.path;
      outputUrls[0] = result1.url;
      outputUrls[1] = result2.url;
      outputUrls[2] = result3.url;

      updateJob(job.id, {
        outputPngPaths: outputPaths,
        outputPngUrls: outputUrls,
        status: 'success',
      });

      // 成功レスポンス
      return NextResponse.json({
        success: true,
        jobId: job.id,
        data: {
          slide1: llmResult.data.slide1,
          slide2: llmResult.data.slide2,
          slide3: llmResult.data.slide3,
          caption: llmResult.data.caption,
          images: outputUrls,
        },
      });
    } catch (imageError) {
      console.error('Image generation error:', imageError);
      
      // 画像生成失敗でも、テキストは返す
      updateJob(job.id, {
        status: 'failed',
        errorMessage: '画像生成に失敗しました',
      });

      return NextResponse.json(
        {
          success: false,
          error: '画像生成に失敗しました',
          jobId: job.id,
          data: {
            slide1: llmResult.data.slide1,
            slide2: llmResult.data.slide2,
            slide3: llmResult.data.slide3,
            caption: llmResult.data.caption,
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Generate API error:', error);
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

