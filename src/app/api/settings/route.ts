// GET/POST /api/settings - クライアント設定API

import { NextRequest, NextResponse } from 'next/server';
import { getClientSettings, saveClientSettings, listClients, getDefaultSettings } from '@/lib/client-settings';

// GET: 設定を取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId') || 'default';
    const action = searchParams.get('action');
    
    // クライアント一覧を取得
    if (action === 'list') {
      const clients = await listClients();
      return NextResponse.json({ success: true, clients });
    }
    
    // 特定のクライアント設定を取得
    const settings = await getClientSettings(clientId);
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json(
      { success: false, error: '設定の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// POST: 設定を保存
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { settings } = body;
    
    if (!settings) {
      return NextResponse.json(
        { success: false, error: '設定データが必要です' },
        { status: 400 }
      );
    }
    
    // IDがない場合はデフォルトIDを設定
    if (!settings.id) {
      settings.id = 'default';
    }
    
    // createdAtがない場合は設定
    if (!settings.createdAt) {
      settings.createdAt = new Date().toISOString();
    }
    
    await saveClientSettings(settings);
    
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Settings POST error:', error);
    return NextResponse.json(
      { success: false, error: '設定の保存に失敗しました' },
      { status: 500 }
    );
  }
}

