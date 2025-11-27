// Instagramカルーセル自動生成アプリ - 画像生成

import { createCanvas, loadImage, CanvasRenderingContext2D, Image, registerFont } from 'canvas';
import { DesignNumber, TextPosition } from './types';
import { IMAGE_SIZE, DESIGN_THEMES } from './constants';
import fs from 'fs';
import path from 'path';

// 日本語フォントを登録
let fontRegistered = false;
try {
  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansJP-Bold.otf');
  if (fs.existsSync(fontPath)) {
    registerFont(fontPath, { family: 'NotoSansJP', weight: 'bold' });
    fontRegistered = true;
    console.log('✅ 日本語フォント登録成功:', fontPath);
  } else {
    console.warn('⚠️ フォントファイルが見つかりません:', fontPath);
  }
} catch (error) {
  console.error('❌ フォント登録エラー:', error);
}

/**
 * 人物の配置位置
 */
type PersonPosition = 'left' | 'center' | 'right';

/**
 * 人物位置をランダムに選択
 */
function selectPersonPosition(): PersonPosition {
  const positions: PersonPosition[] = ['left', 'center', 'right'];
  return positions[Math.floor(Math.random() * positions.length)];
}

/**
 * 人物位置に応じてテキスト位置を決定（被らないように）
 */
function selectTextPositionForPerson(personPos: PersonPosition, textLength: number): TextPosition {
  const preferTop = textLength > 50;
  
  switch (personPos) {
    case 'left':
      return preferTop ? 'top-right' : 'bottom-right';
    case 'right':
      return preferTop ? 'top-left' : 'bottom-left';
    case 'center':
    default:
      return preferTop ? 'top-left' : 'bottom-left';
  }
}

/**
 * 人物の描画座標を計算
 */
function getPersonCoordinates(
  position: PersonPosition,
  personWidth: number,
  personHeight: number,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number; scale: number } {
  const targetHeight = canvasHeight * (0.75 + Math.random() * 0.15);
  const scale = targetHeight / personHeight;
  const scaledWidth = personWidth * scale;
  const scaledHeight = personHeight * scale;
  
  const y = canvasHeight - scaledHeight + (scaledHeight * 0.05);
  
  let x: number;
  switch (position) {
    case 'left':
      x = -scaledWidth * 0.1 + Math.random() * (canvasWidth * 0.1);
      break;
    case 'right':
      x = canvasWidth - scaledWidth + scaledWidth * 0.1 - Math.random() * (canvasWidth * 0.1);
      break;
    case 'center':
    default:
      x = (canvasWidth - scaledWidth) / 2 + (Math.random() - 0.5) * (canvasWidth * 0.1);
      break;
  }
  
  return { x, y, scale };
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
      return { x: padding, y: padding + 80, align: 'left', baseline: 'top' };
    case 'top-right':
      return { x: canvasWidth - padding, y: padding + 80, align: 'right', baseline: 'top' };
    case 'bottom-left':
      return { x: padding, y: canvasHeight - padding - 200, align: 'left', baseline: 'bottom' };
    case 'bottom-right':
      return { x: canvasWidth - padding, y: canvasHeight - padding - 200, align: 'right', baseline: 'bottom' };
    case 'center':
    default:
      return { x: canvasWidth / 2, y: canvasHeight * 0.3, align: 'center', baseline: 'middle' };
  }
}

/**
 * テキストサイズを自動調整（適切なサイズ）
 */
function calculateFontSize(text: string, minSize: number = 90, maxSize: number = 150): number {
  const charCount = text.length;
  
  // 文字数が少ないほど大きく
  if (charCount <= 15) return maxSize; // 150px
  if (charCount <= 25) return Math.max(minSize, 140);
  if (charCount <= 35) return Math.max(minSize, 125);
  if (charCount <= 50) return Math.max(minSize, 110);
  if (charCount <= 70) return Math.max(minSize, 100);
  return minSize; // 90px
}

/**
 * 背景グラデーションを描画
 */
function drawBackground(
  ctx: CanvasRenderingContext2D,
  designNumber: DesignNumber
) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  
  let gradient: CanvasGradient;
  
  switch (designNumber) {
    case 1:
      gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#00D4FF');
      gradient.addColorStop(0.5, '#00A3CC');
      gradient.addColorStop(1, '#FF69B4');
      break;
    case 2:
      gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#FFE4EC');
      gradient.addColorStop(0.4, '#FFB6C1');
      gradient.addColorStop(0.7, '#B0E0E6');
      gradient.addColorStop(1, '#87CEEB');
      break;
    case 3:
    default:
      gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#FFF8DC');
      gradient.addColorStop(0.3, '#FFD700');
      gradient.addColorStop(0.7, '#DAA520');
      gradient.addColorStop(1, '#A0A0A0');
      break;
  }
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  drawBackgroundPattern(ctx, designNumber);
}

/**
 * 背景の装飾パターン
 */
function drawBackgroundPattern(
  ctx: CanvasRenderingContext2D,
  designNumber: DesignNumber
) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  
  ctx.globalAlpha = 0.15;
  
  switch (designNumber) {
    case 1:
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(
          Math.random() * width,
          Math.random() * height,
          50 + Math.random() * 150,
          0,
          Math.PI * 2
        );
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      break;
    case 2:
      for (let x = 0; x < width; x += 60) {
        for (let y = 0; y < height; y += 60) {
          ctx.beginPath();
          ctx.arc(x + Math.random() * 20, y + Math.random() * 20, 8, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
        }
      }
      break;
    case 3:
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      for (let i = -height; i < width + height; i += 80) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + height, height);
        ctx.stroke();
      }
      break;
  }
  
  ctx.globalAlpha = 1;
}

/**
 * けいおん風フォントでテキストを描画
 */
function drawTextWithShadow(
  ctx: CanvasRenderingContext2D,
  lines: [string, string],
  position: TextPosition,
  designNumber: DesignNumber
) {
  const coords = getTextCoordinates(position, ctx.canvas.width, ctx.canvas.height);
  
  ctx.textAlign = coords.align;
  ctx.textBaseline = coords.baseline;
  
  const fullText = lines.join('');
  const fontSize = calculateFontSize(fullText);
  const lineHeight = fontSize * 1.5;
  
  // 日本語フォント（Noto Sans JP）
  ctx.font = `bold ${fontSize}px "NotoSansJP", "Hiragino Maru Gothic ProN", "Rounded Mplus 1c", sans-serif`;
  
  lines.forEach((line, index) => {
    if (!line) return;
    
    const y = coords.y + (index * lineHeight) - (lines.length - 1) * lineHeight / 2;
    
    // 黒い縁取り（超太く）
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(30, fontSize * 0.18);
    ctx.lineJoin = 'round';
    ctx.strokeText(line, coords.x, y);
    
    // 白い縁取り（超太く）
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = Math.max(15, fontSize * 0.1);
    ctx.strokeText(line, coords.x, y);
    
    // 本文（デザイン別カラー）
    let textColor: string;
    switch (designNumber) {
      case 1:
        textColor = '#FF1493';
        break;
      case 2:
        textColor = '#4169E1';
        break;
      case 3:
        textColor = '#FF8C00';
        break;
      default:
        textColor = '#FF1493';
    }
    
    ctx.fillStyle = textColor;
    ctx.fillText(line, coords.x, y);
  });
}

/**
 * 人物の影を描画
 */
function drawPersonShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number
) {
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.ellipse(
    x + width / 2,
    y + height - 20,
    width * 0.35,
    30,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.restore();
}

/**
 * Base64画像データからBufferを取得
 */
function base64ToBuffer(base64Data: string): Buffer {
  const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64Content, 'base64');
}

/**
 * 画像を圧縮（22MB以下に）
 */
async function compressImage(imageBuffer: Buffer): Promise<Buffer> {
  const sharp = (await import('sharp')).default;
  
  // 22MB以下ならそのまま返す
  if (imageBuffer.length < 22 * 1024 * 1024) {
    return imageBuffer;
  }
  
  console.log(`📏 画像が大きいため圧縮中... (${(imageBuffer.length / 1024 / 1024).toFixed(1)}MB)`);
  
  // 圧縮: 最大幅2000px、品質80%
  const compressed = await sharp(imageBuffer)
    .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
  
  console.log(`📦 圧縮完了: ${(compressed.length / 1024 / 1024).toFixed(1)}MB`);
  return compressed;
}

/**
 * Remove.bg APIで背景を除去
 */
async function removeBackgroundWithRemoveBg(imageBuffer: Buffer): Promise<Buffer> {
  const apiKey = process.env.REMOVEBG_API_KEY;
  
  if (!apiKey) {
    throw new Error('REMOVEBG_API_KEY is not set');
  }
  
  const formData = new FormData();
  formData.append('image_file', new Blob([new Uint8Array(imageBuffer)]), 'image.png');
  formData.append('size', 'auto');
  formData.append('format', 'png');
  
  console.log('🔄 Remove.bg APIを呼び出し中...');
  
  const response = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: {
      'X-Api-Key': apiKey,
    },
    body: formData,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Remove.bg API error:', response.status, errorText);
    throw new Error(`Remove.bg API error: ${response.status}`);
  }
  
  const resultBuffer = Buffer.from(await response.arrayBuffer());
  console.log(`✂️ 背景除去成功! 出力サイズ: ${resultBuffer.length} bytes`);
  
  return resultBuffer;
}

/**
 * 背景を除去して人物を切り抜き
 */
async function removeBackgroundFromImage(imageData: Buffer | string): Promise<Buffer> {
  let inputBuffer: Buffer;
  
  if (typeof imageData === 'string') {
    if (imageData.startsWith('data:')) {
      inputBuffer = base64ToBuffer(imageData);
    } else {
      inputBuffer = fs.readFileSync(imageData);
    }
  } else {
    inputBuffer = imageData;
  }
  
  console.log(`📦 入力画像サイズ: ${(inputBuffer.length / 1024 / 1024).toFixed(1)}MB`);
  
  // 22MB以上なら圧縮
  const compressedBuffer = await compressImage(inputBuffer);
  
  // Remove.bg APIで背景除去
  return await removeBackgroundWithRemoveBg(compressedBuffer);
}

/**
 * スライド画像を生成（人物切り抜き版）
 */
export async function generateSlideImage(
  photoData: Buffer | string,
  lines: [string, string],
  designNumber: DesignNumber,
  slideNumber: 1 | 2 | 3
): Promise<Buffer> {
  const canvas = createCanvas(IMAGE_SIZE.width, IMAGE_SIZE.height);
  const ctx = canvas.getContext('2d');
  
  // 1. 背景を描画
  drawBackground(ctx, designNumber);
  
  // 2. 人物の背景を除去
  console.log(`🎭 スライド${slideNumber}: 背景除去中...`);
  let personBuffer: Buffer;
  try {
    personBuffer = await removeBackgroundFromImage(photoData);
  } catch (error) {
    console.warn('⚠️ 背景除去に失敗、元画像を使用します:', error);
    if (typeof photoData === 'string') {
      if (photoData.startsWith('data:')) {
        personBuffer = base64ToBuffer(photoData);
      } else {
        personBuffer = fs.readFileSync(photoData);
      }
    } else {
      personBuffer = photoData;
    }
  }
  
  // 3. 人物画像を読み込み
  const personImage = await loadImage(personBuffer);
  
  // 4. 人物の位置を決定（ランダム）
  const personPosition = selectPersonPosition();
  const personCoords = getPersonCoordinates(
    personPosition,
    personImage.width,
    personImage.height,
    IMAGE_SIZE.width,
    IMAGE_SIZE.height
  );
  
  // 5. テキスト位置を決定（人物と被らないように）
  const textLength = lines.join('').length;
  const textPosition = selectTextPositionForPerson(personPosition, textLength);
  
  // 6. 人物の影を描画
  const scaledWidth = personImage.width * personCoords.scale;
  const scaledHeight = personImage.height * personCoords.scale;
  drawPersonShadow(ctx, personCoords.x, personCoords.y, scaledWidth, scaledHeight);
  
  // 7. 人物を描画
  ctx.drawImage(
    personImage,
    personCoords.x,
    personCoords.y,
    scaledWidth,
    scaledHeight
  );
  
  // 8. テキストを描画
  drawTextWithShadow(ctx, lines, textPosition, designNumber);
  
  // 9. スライド番号インジケーター
  const indicatorY = IMAGE_SIZE.height - 50;
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
  
  console.log(`✅ スライド${slideNumber}: 生成完了 (人物: ${personPosition}, テキスト: ${textPosition})`);
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
  console.log('🖼️ カルーセル画像生成開始...');
  
  const image1 = await generateSlideImage(photos[0], slides.slide1, designNumber, 1);
  const image2 = await generateSlideImage(photos[1], slides.slide2, designNumber, 2);
  const image3 = await generateSlideImage(photos[2], slides.slide3, designNumber, 3);
  
  console.log('🎉 カルーセル画像生成完了！');
  return [image1, image2, image3];
}

/**
 * 画像をBase64エンコード
 */
export function bufferToBase64(buffer: Buffer, mimeType: string = 'image/png'): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}
