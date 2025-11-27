// GET/POST /api/settings - クライアント設定API
// 注: 設定はクライアントサイド（localStorage）で管理されるため、
// このAPIは互換性のために残しています

import { NextRequest, NextResponse } from 'next/server';

// デフォルト設定
function getDefaultSettings() {
  return {
    id: 'default',
    name: '',
    knowledge: {
      companyDescription: '',
      uniqueWords: [],
      tone: '親しみやすく、温かみのある',
      targetAudience: '',
      hashtags: ['#採用', '#求人'],
      ngWords: [],
      additionalContext: '',
    },
    designs: {
      design1: {
        name: 'シアン＆マゼンタ',
        backgroundImage: null,
        primaryColor: '#00D4FF',
        accentColor: '#FF69B4',
        textColor: '#FF1493',
      },
      design2: {
        name: 'ピンク＆ブルー',
        backgroundImage: null,
        primaryColor: '#FFB6C1',
        accentColor: '#87CEEB',
        textColor: '#4169E1',
      },
      design3: {
        name: 'イエロー＆グレー',
        backgroundImage: null,
        primaryColor: '#FFD700',
        accentColor: '#808080',
        textColor: '#FF8C00',
      },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// GET: デフォルト設定を返す（実際の設定はlocalStorageで管理）
export async function GET() {
  return NextResponse.json({ 
    success: true, 
    settings: getDefaultSettings(),
    message: '設定はブラウザのlocalStorageで管理されています'
  });
}

// POST: 成功を返す（実際の保存はlocalStorageで行われる）
export async function POST() {
  return NextResponse.json({ 
    success: true,
    message: '設定はブラウザのlocalStorageに保存されています'
  });
}
