// Instagramカルーセル自動生成アプリ - 定数定義

import { TextPosition, ImageGenerationConfig } from './types';

/**
 * 画像サイズ（Instagram縦長 4:5）
 */
export const IMAGE_SIZE = {
  width: 1080,
  height: 1350,
} as const;

/**
 * 文字数制限
 */
export const CHAR_LIMITS = {
  slide1: { min: 30, max: 35 },
  slide2: { min: 70, max: 75 },
  slide3: { min: 70, max: 75 },
} as const;

/**
 * LLM再試行回数
 */
export const MAX_LLM_RETRIES = 2;

/**
 * 禁止表記
 */
export const FORBIDDEN_PATTERNS = [
  '"', // ダブルクオーテーション
  '「」', // NGワード例（後で追加可能）
] as const;

/**
 * テキスト位置候補
 */
export const TEXT_POSITIONS: TextPosition[] = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
  'center',
];

/**
 * デフォルト画像生成設定
 */
export const DEFAULT_IMAGE_CONFIG: ImageGenerationConfig = {
  width: IMAGE_SIZE.width,
  height: IMAGE_SIZE.height,
  textPosition: 'bottom-left',
  fontSizeMin: 36,
  fontSizeMax: 72,
};

/**
 * 背景パターンファイルパス
 */
export const BACKGROUND_PATTERNS = {
  1: '/backgrounds/pattern1.png',
  2: '/backgrounds/pattern2.png',
  3: '/backgrounds/pattern3.png',
} as const;

/**
 * デザインテーマカラー
 */
export const DESIGN_THEMES = {
  1: {
    name: 'シアン＆マゼンタ',
    primaryColor: '#00D4FF',
    accentColor: '#FF69B4',
    textColor: '#FFFFFF',
    shadowColor: 'rgba(0, 0, 0, 0.5)',
  },
  2: {
    name: 'ピンク＆ブルー',
    primaryColor: '#FFB6C1',
    accentColor: '#87CEEB',
    textColor: '#333333',
    shadowColor: 'rgba(0, 0, 0, 0.3)',
  },
  3: {
    name: 'イエロー＆グレー',
    primaryColor: '#FFD700',
    accentColor: '#808080',
    textColor: '#333333',
    shadowColor: 'rgba(0, 0, 0, 0.3)',
  },
} as const;

/**
 * フォント設定
 */
export const FONT_CONFIG = {
  primary: 'Noto Sans JP',
  fallback: 'Hiragino Sans, sans-serif',
  weights: {
    normal: 400,
    bold: 700,
  },
} as const;

/**
 * LLM固定メッセージ（生成失敗判定用）
 */
export const LLM_FAILURE_MESSAGES = [
  '申し訳ございませんが',
  'エラーが発生しました',
  '生成できませんでした',
] as const;

/**
 * Notion API設定
 */
export const NOTION_CONFIG = {
  propertyNames: {
    title: 'タイトル',
    slide2: '2枚目',
    slide3: '3枚目',
    caption: '投稿文',
    mediaFiles: 'Media & Files',
    survey: 'アンケート',
    usedPhotos: '使用写真',
  },
} as const;

