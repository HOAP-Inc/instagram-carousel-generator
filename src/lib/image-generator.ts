// Instagramカルーセル自動生成アプリ - 画像生成

import { createCanvas, loadImage, registerFont, CanvasRenderingContext2D, Image } from 'canvas';
import path from 'path';
import fs from 'fs';
import { DesignNumber, TextPosition } from './types';
import { IMAGE_SIZE, DESIGN_THEMES, TEXT_POSITIONS } from './constants';

// フォント登録（サーバー起動時に一度だけ実行）
let fontRegistered = false;

function ensureFontRegistered() {
  if (fontRegistered) return;
  
  // システムフォントまたはカスタムフォントを使用
  // MVP: システムフォントをフォールバックとして使用
  fontRegistered = true;
}

/**
 * テキスト位置をランダムに選択（顔領域を避ける - MVP簡易版）
 */
function selectTextPosition(): TextPosition {
  // MVP: ランダムに位置を選択
  const positions: TextPosition[] = ['bottom-left', 'bottom-right', 'top-left', 'top-right', 'center'];
  return positions[Math.floor(Math.random() * positions.length)];
}

/**
 * テキスト位置の座標を計算
 */
function getTextCoordinates(
  position: TextPosition,
  canvasWidth: number,
  canvasHeight: number,
  padding: number = 60
): { x: number; y: number; align: CanvasTextAlign; baseline: CanvasTextBaseline } {
  switch (position) {
    case 'top-left':
      return { x: padding, y: padding + 100, align: 'left', baseline: 'top' };
    case 'top-right':
      return { x: canvasWidth - padding, y: padding + 100, align: 'right', baseline: 'top' };
    case 'bottom-left':
      return { x: padding, y: canvasHeight - padding - 150, align: 'left', baseline: 'bottom' };
    case 'bottom-right':
      return { x: canvasWidth - padding, y: canvasHeight - padding - 150, align: 'right', baseline: 'bottom' };
    case 'center':
    default:
      return { x: canvasWidth / 2, y: canvasHeight / 2, align: 'center', baseline: 'middle' };
  }
}

/**
 * テキストサイズを自動調整
 */
function calculateFontSize(text: string, maxWidth: number, minSize: number = 36, maxSize: number = 72): number {
  const charCount = text.length;
  
  // 文字数に応じてサイズを調整
  if (charCount <= 20) return maxSize;
  if (charCount <= 40) return Math.max(minSize, maxSize - 12);
  if (charCount <= 60) return Math.max(minSize, maxSize - 24);
  return minSize;
}

/**
 * テキストを描画（影付き）
 */
function drawTextWithShadow(
  ctx: CanvasRenderingContext2D,
  lines: [string, string],
  position: TextPosition,
  designNumber: DesignNumber
) {
  const theme = DESIGN_THEMES[designNumber];
  const coords = getTextCoordinates(position, ctx.canvas.width, ctx.canvas.height);
  
  ctx.textAlign = coords.align;
  ctx.textBaseline = coords.baseline;
  
  const fullText = lines.join('');
  const fontSize = calculateFontSize(fullText, ctx.canvas.width * 0.8);
  const lineHeight = fontSize * 1.5;
  
  ctx.font = `bold ${fontSize}px "Hiragino Sans", "Noto Sans JP", sans-serif`;
  
  // 各行を描画
  lines.forEach((line, index) => {
    const y = coords.y + (index * lineHeight) - (lines.length - 1) * lineHeight / 2;
    
    // 影
    ctx.shadowColor = theme.shadowColor;
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
    
    // 縁取り（視認性向上）
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = 6;
    ctx.strokeText(line, coords.x, y);
    
    // 本文
    ctx.fillStyle = theme.textColor;
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillText(line, coords.x, y);
  });
}

/**
 * 円形のフレームを描画
 */
function drawCircleFrame(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
  color: string
) {
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 8;
  ctx.stroke();
}

/**
 * グラデーションオーバーレイを描画
 */
function drawGradientOverlay(
  ctx: CanvasRenderingContext2D,
  designNumber: DesignNumber
) {
  const theme = DESIGN_THEMES[designNumber];
  const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
  
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.1)');
  gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

/**
 * 装飾的な要素を描画
 */
function drawDecorations(
  ctx: CanvasRenderingContext2D,
  designNumber: DesignNumber,
  position: TextPosition
) {
  const theme = DESIGN_THEMES[designNumber];
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  
  // デザインに応じた装飾
  switch (designNumber) {
    case 1:
      // シアン＆マゼンタ: 円形フレーム
      drawCircleFrame(ctx, width * 0.3, height * 0.4, 280, theme.accentColor);
      break;
    case 2:
      // ピンク＆ブルー: 角の装飾
      ctx.fillStyle = theme.primaryColor + '40'; // 半透明
      ctx.fillRect(0, 0, 150, 150);
      ctx.fillRect(width - 150, height - 150, 150, 150);
      break;
    case 3:
      // イエロー＆グレー: 線の装飾
      ctx.strokeStyle = theme.primaryColor;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(50, 50);
      ctx.lineTo(200, 50);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(width - 50, height - 50);
      ctx.lineTo(width - 200, height - 50);
      ctx.stroke();
      break;
  }
}

/**
 * スライド画像を生成
 */
export async function generateSlideImage(
  photoData: Buffer | string,
  lines: [string, string],
  designNumber: DesignNumber,
  slideNumber: 1 | 2 | 3
): Promise<Buffer> {
  ensureFontRegistered();
  
  const canvas = createCanvas(IMAGE_SIZE.width, IMAGE_SIZE.height);
  const ctx = canvas.getContext('2d');
  
  // 写真を読み込み
  let photo: Image;
  if (typeof photoData === 'string') {
    // Base64またはパス
    if (photoData.startsWith('data:')) {
      const base64Data = photoData.replace(/^data:image\/\w+;base64,/, '');
      photo = await loadImage(Buffer.from(base64Data, 'base64'));
    } else {
      photo = await loadImage(photoData);
    }
  } else {
    photo = await loadImage(photoData);
  }
  
  // 写真を中央基準でトリミングして描画
  const scale = Math.max(IMAGE_SIZE.width / photo.width, IMAGE_SIZE.height / photo.height);
  const scaledWidth = photo.width * scale;
  const scaledHeight = photo.height * scale;
  const x = (IMAGE_SIZE.width - scaledWidth) / 2;
  const y = (IMAGE_SIZE.height - scaledHeight) / 2;
  
  ctx.drawImage(photo, x, y, scaledWidth, scaledHeight);
  
  // グラデーションオーバーレイ
  drawGradientOverlay(ctx, designNumber);
  
  // テキスト位置を選択
  const textPosition = selectTextPosition();
  
  // 装飾を描画
  drawDecorations(ctx, designNumber, textPosition);
  
  // テキストを描画
  drawTextWithShadow(ctx, lines, textPosition, designNumber);
  
  // スライド番号インジケーター
  const indicatorY = IMAGE_SIZE.height - 40;
  const indicatorSpacing = 30;
  const startX = (IMAGE_SIZE.width - (2 * indicatorSpacing)) / 2;
  
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.arc(startX + (i - 1) * indicatorSpacing, indicatorY, 6, 0, Math.PI * 2);
    if (i === slideNumber) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
    } else {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  
  return canvas.toBuffer('image/png');
}

/**
 * 3枚のカルーセル画像を生成
 */
export async function generateCarouselImages(
  photos: [Buffer | string, Buffer | string, Buffer | string],
  slides: {
    slide1: [string, string];
    slide2: [string, string];
    slide3: [string, string];
  },
  designNumber: DesignNumber
): Promise<[Buffer, Buffer, Buffer]> {
  const [image1, image2, image3] = await Promise.all([
    generateSlideImage(photos[0], slides.slide1, designNumber, 1),
    generateSlideImage(photos[1], slides.slide2, designNumber, 2),
    generateSlideImage(photos[2], slides.slide3, designNumber, 3),
  ]);
  
  return [image1, image2, image3];
}

/**
 * 画像をBase64エンコード
 */
export function bufferToBase64(buffer: Buffer, mimeType: string = 'image/png'): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

