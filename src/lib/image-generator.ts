// Instagramカルーセル自動生成アプリ - 画像生成

import { createCanvas, loadImage, CanvasRenderingContext2D, Image, registerFont } from 'canvas';
import { DesignNumber, TextPosition, SlideManualOverride, PersonPosition } from './types';
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

type LayoutDecision = {
  personPosition: PersonPosition;
  textPosition: TextPosition;
  textYOffset: number;
  textAreaRatio: number;
};

type SlideNumber = 1 | 2 | 3;

const SLIDE_PERSON_PROFILES: Record<SlideNumber, PersonPosition[]> = {
  1: ['left', 'center', 'right'],
  2: ['center', 'right', 'left'],
  3: ['right', 'left', 'center'],
};

const TEXT_POSITION_SAFE_MAP: Record<PersonPosition, TextPosition[]> = {
  left: ['top-right', 'center', 'top-left'],
  center: ['top-left', 'top-right', 'center'],
  right: ['top-left', 'center', 'top-right'],
};

interface TextLayoutOptions {
  yOffset?: number;
  maxHeightRatio?: number;
  fontScale?: number;
  textOffsetX?: number;
  textOffsetY?: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function uniqueArray<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function pickWithBias<T>(options: T[]): T {
  if (options.length === 0) {
    throw new Error('候補が空です');
  }
  if (options.length === 1) return options[0];
  const biasProbability = 0.65;
  if (Math.random() < biasProbability) {
    return options[0];
  }
  return options[Math.floor(Math.random() * options.length)];
}

function convertSpaceToTextPosition(space?: string | null): TextPosition | null {
  if (!space) return null;
  const normalized = space.toLowerCase();
  if (normalized.includes('top-left')) return 'top-left';
  if (normalized.includes('top-right')) return 'top-right';
  if (normalized.includes('bottom-left')) return 'bottom-left';
  if (normalized.includes('bottom-right')) return 'bottom-right';
  if (normalized.includes('center')) return 'center';
  return null;
}

function determineSlideLayout(slideNumber: SlideNumber, photoAnalysis?: any): LayoutDecision {
  const basePersonOptions = SLIDE_PERSON_PROFILES[slideNumber];
  let personCandidates = [...basePersonOptions];
  
  const analysisPos = photoAnalysis?.personPosition;
  if (analysisPos && ['left', 'center', 'right'].includes(analysisPos)) {
    personCandidates = uniqueArray<PersonPosition>([analysisPos as PersonPosition, ...personCandidates]);
  }
  
  const personPosition = pickWithBias(personCandidates);
  
  let textCandidates = [...TEXT_POSITION_SAFE_MAP[personPosition]];
  const recommended = convertSpaceToTextPosition(photoAnalysis?.recommendedTextPosition);
  
  if (recommended && textCandidates.includes(recommended)) {
    textCandidates = uniqueArray<TextPosition>([recommended, ...textCandidates]);
  } else if (Array.isArray(photoAnalysis?.emptySpaces)) {
    const emptySpaces: string[] = photoAnalysis.emptySpaces;
    const mapped = emptySpaces
      .map((space: string) => convertSpaceToTextPosition(space))
      .filter((pos): pos is TextPosition => Boolean(pos))
      .filter((pos) => textCandidates.includes(pos));
    if (mapped.length > 0) {
      textCandidates = uniqueArray<TextPosition>([...mapped, ...textCandidates]);
    }
  }
  
  const textPosition = pickWithBias(textCandidates);
  
  const baseOffsets: Record<SlideNumber, number> = {
    1: -10,
    2: 5,
    3: 15,
  };
  const jitter = Math.floor(Math.random() * 30) - 10; // -10〜+19px
  const textYOffset = baseOffsets[slideNumber] + jitter;
  
  const textAreaRatio = slideNumber === 2 ? 0.32 : slideNumber === 3 ? 0.36 : 0.38;
  
  return {
    personPosition,
    textPosition,
    textYOffset,
    textAreaRatio,
  };
}

/**
 * 人物の描画座標を計算
 */
function getPersonCoordinates(
  position: PersonPosition,
  personWidth: number,
  personHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  slideNumber: number = 1,
  override?: SlideManualOverride | null
): { x: number; y: number; scale: number } {
  // 人物を下部エリアに配置（上部はテキスト用）
  const personAreaHeight = canvasHeight * 0.65;
  const sizeMultiplier = slideNumber === 1 ? 0.9 : slideNumber === 2 ? 1.0 : 0.95;
  const targetHeight = personAreaHeight * sizeMultiplier * (override?.personScale ?? 1);
  const scale = targetHeight / personHeight;
  const scaledWidth = personWidth * scale;
  const scaledHeight = personHeight * scale;
  
  // 下部に配置（少しだけ上下に揺らす）
  const verticalJitter = Math.floor(Math.random() * 20) - 10 + (override?.personOffsetY || 0);
  const y = canvasHeight - scaledHeight + 40 + verticalJitter;
  
  let x: number;
  switch (position) {
    case 'left':
      // 左寄せ（スライドごとに位置を変える）
      const leftOffset = slideNumber === 1 ? 0.05 : slideNumber === 2 ? 0.08 : 0.06;
      x = canvasWidth * leftOffset;
      break;
    case 'right':
      // 右寄せ（スライドごとに位置を変える）
      const rightOffset = slideNumber === 1 ? 0.95 : slideNumber === 2 ? 0.92 : 0.94;
      x = canvasWidth * rightOffset - scaledWidth;
      break;
    case 'center':
    default:
      // 中央配置（スライドごとに微妙にずらす）
      const centerOffset = slideNumber === 1 ? 0 : slideNumber === 2 ? -30 : 20;
      x = (canvasWidth - scaledWidth) / 2 + centerOffset;
      break;
  }
  
  const horizontalJitter = Math.floor(Math.random() * 40) - 20 + (override?.personOffsetX || 0);
  const safeX = clamp(x + horizontalJitter, 40, canvasWidth - scaledWidth - 40);
  
  return { x: safeX, y, scale };
}

/**
 * テキスト位置の座標を計算（写真に被らない上部のみ）
 */
function getTextCoordinates(
  position: TextPosition,
  canvasWidth: number,
  canvasHeight: number,
  padding: number = 80,
  yOffset: number = 0
): { x: number; y: number; align: CanvasTextAlign; baseline: CanvasTextBaseline } {
  const topY = clamp(padding + 60 + yOffset, 40, canvasHeight * 0.45);
  
  switch (position) {
    case 'top-left':
      return { x: padding, y: topY, align: 'left', baseline: 'top' };
    case 'top-right':
      return { x: canvasWidth - padding, y: topY, align: 'right', baseline: 'top' };
    case 'bottom-left':
      return { x: padding, y: topY + 20, align: 'left', baseline: 'top' };
    case 'bottom-right':
      return { x: canvasWidth - padding, y: topY + 20, align: 'right', baseline: 'top' };
    case 'center':
    default:
      return { x: canvasWidth / 2, y: topY, align: 'center', baseline: 'top' };
  }
}

/**
 * テキストを自動改行（指定幅に収まるように）
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split('');
  const wrappedLines: string[] = [];
  let currentLine = '';
  
  for (const char of words) {
    const testLine = currentLine + char;
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && currentLine.length > 0) {
      wrappedLines.push(currentLine);
      currentLine = char;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine.length > 0) {
    wrappedLines.push(currentLine);
  }
  
  return wrappedLines;
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
 * テキストを自動改行して描画（全ての文字を表示）
 */
function drawTextWithShadow(
  ctx: CanvasRenderingContext2D,
  lines: [string, string],
  position: TextPosition,
  designNumber: DesignNumber,
  customTextColor: string | null = null,
  customFontFamily: string | null = null,
  layoutOptions: TextLayoutOptions = {}
) {
  const canvasWidth = ctx.canvas.width;
  const canvasHeight = ctx.canvas.height;
  const padding = 80;
  
  const coords = getTextCoordinates(
    position,
    canvasWidth,
    canvasHeight,
    padding,
    layoutOptions.yOffset || 0
  );
  const textOffsetX = clamp(layoutOptions.textOffsetX ?? 0, -320, 320);
  const textOffsetY = clamp(layoutOptions.textOffsetY ?? 0, -200, 200);
  
  ctx.textAlign = coords.align;
  ctx.textBaseline = coords.baseline;
  
  // 全てのテキストを結合
  const fullText = lines.join('');
  const baseFont = 180 * (layoutOptions.fontScale ?? 1);
  let fontSize = clamp(baseFont, 110, 260);
  const maxWidth = canvasWidth - (padding * 2);
  const maxTextHeight = canvasHeight * (layoutOptions.maxHeightRatio || 0.35); // 写真に被らないように高さ制限
  
  // フォントファミリーを決定
  const fontFamily = customFontFamily || 'NotoSansJP';
  let fontString = `bold ${fontSize}px "NotoSansJP", "Hiragino Sans", sans-serif`;
  ctx.font = fontString;
  
  // 自動改行してテキストを分割
  let wrappedLines = wrapText(ctx, fullText, maxWidth);
  let lineHeight = fontSize * 1.3;
  let totalHeight = wrappedLines.length * lineHeight;
  
  // テキストが高さ制限を超える場合、フォントサイズを縮小
  while (totalHeight > maxTextHeight && fontSize > 100) {
    fontSize -= 10;
    fontString = `bold ${fontSize}px "NotoSansJP", "Hiragino Sans", sans-serif`;
    ctx.font = fontString;
    wrappedLines = wrapText(ctx, fullText, maxWidth);
    lineHeight = fontSize * 1.3;
    totalHeight = wrappedLines.length * lineHeight;
  }
  
  console.log(`📝 フォント: ${fontSize}px, 行数: ${wrappedLines.length}`);
  
  // テキストカラーを決定
  let textColor: string;
  if (customTextColor) {
    textColor = customTextColor;
  } else {
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
  }
  
  // 各行を描画
  wrappedLines.forEach((line, index) => {
    let lineY = coords.y + textOffsetY + (index * lineHeight);
    if (coords.baseline === 'bottom') {
      lineY = coords.y + textOffsetY - ((wrappedLines.length - 1 - index) * lineHeight);
    } else if (coords.baseline === 'middle') {
      lineY = coords.y + textOffsetY + (index * lineHeight) - (wrappedLines.length - 1) * lineHeight / 2;
    }
    const lineX = coords.x + textOffsetX;
    
    // 黒い縁取り
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(15, fontSize * 0.12);
    ctx.lineJoin = 'round';
    ctx.strokeText(line, lineX, lineY);
    
    // 白い縁取り
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = Math.max(8, fontSize * 0.06);
    ctx.strokeText(line, lineX, lineY);
    
    // 本文
    ctx.fillStyle = textColor;
    ctx.fillText(line, lineX, lineY);
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
 * スライド画像を生成（人物切り抜き版 + AI レイアウト）
 */
export async function generateSlideImage(
  photoData: Buffer | string,
  lines: [string, string],
  designNumber: DesignNumber,
  slideNumber: 1 | 2 | 3,
  logoImage: string | null = null,
  customDesign: any = null,
  photoAnalysis: any = null, // Vision APIの分析結果
  manualOverride: SlideManualOverride | null = null
): Promise<Buffer> {
  // フォント登録を確実に行う
  if (!fontRegistered) {
    try {
      const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansJP-Bold.otf');
      if (fs.existsSync(fontPath)) {
        registerFont(fontPath, { family: 'NotoSansJP', weight: 'bold' });
        fontRegistered = true;
        console.log(`✅ スライド${slideNumber}: フォント登録成功`);
      }
    } catch (error) {
      console.error(`❌ スライド${slideNumber}: フォント登録エラー:`, error);
    }
  }
  
  const canvas = createCanvas(IMAGE_SIZE.width, IMAGE_SIZE.height);
  const ctx = canvas.getContext('2d');
  
  // 1. 背景を描画（カスタムデザインがあれば使用）
  if (customDesign && customDesign.backgroundImage) {
    // カスタム背景画像を使用
    try {
      const bgBuffer = base64ToBuffer(customDesign.backgroundImage);
      const bgImage = await loadImage(bgBuffer);
      ctx.drawImage(bgImage, 0, 0, IMAGE_SIZE.width, IMAGE_SIZE.height);
    } catch (error) {
      console.warn('⚠️ カスタム背景画像の読み込みに失敗、デフォルトを使用:', error);
      drawBackground(ctx, designNumber);
    }
  } else {
    drawBackground(ctx, designNumber);
  }
  
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
  
  // 4. レイアウトを決定（Vision API + ランダムバリエーション）
  let layoutDecision = determineSlideLayout(slideNumber as SlideNumber, photoAnalysis);
  if (manualOverride?.personPosition) {
    layoutDecision = { ...layoutDecision, personPosition: manualOverride.personPosition };
  }
  if (manualOverride?.textPosition) {
    layoutDecision = { ...layoutDecision, textPosition: manualOverride.textPosition };
  }
  if (typeof manualOverride?.textYOffset === 'number') {
    layoutDecision = { ...layoutDecision, textYOffset: manualOverride.textYOffset };
  }
  if (typeof manualOverride?.textAreaRatio === 'number') {
    layoutDecision = { ...layoutDecision, textAreaRatio: manualOverride.textAreaRatio };
  }

  const personPosition = layoutDecision.personPosition;
  const personCoords = getPersonCoordinates(
    personPosition,
    personImage.width,
    personImage.height,
    IMAGE_SIZE.width,
    IMAGE_SIZE.height,
    slideNumber,
    manualOverride
  );
  
  const textPosition = layoutDecision.textPosition;
  
  console.log(
    `📍 スライド${slideNumber}: 人物=${personPosition}, テキスト=${textPosition}, yOffset=${layoutDecision.textYOffset}`
  );
  
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
  
  // 8. テキストを描画（カスタムテキストカラーとフォントを使用）
  const customTextColor = customDesign?.textColor || null;
  const customFontFamily = customDesign?.fontFamily || null;
  drawTextWithShadow(
    ctx,
    lines,
    textPosition,
    designNumber,
    customTextColor,
    customFontFamily,
    {
      yOffset: layoutDecision.textYOffset,
      maxHeightRatio: layoutDecision.textAreaRatio,
      fontScale: manualOverride?.fontScale,
      textOffsetX: manualOverride?.textOffsetX,
      textOffsetY: manualOverride?.textOffsetY,
    }
  );
  
  // 9. ロゴを描画（1枚目のみ）
  if (slideNumber === 1 && logoImage) {
    try {
      const logoBuffer = base64ToBuffer(logoImage);
      const logo = await loadImage(logoBuffer);
      
      // ロゴのサイズを計算（最大200x200、アスペクト比維持）
      const maxLogoSize = 200;
      let logoWidth = logo.width;
      let logoHeight = logo.height;
      
      if (logoWidth > maxLogoSize || logoHeight > maxLogoSize) {
        const ratio = Math.min(maxLogoSize / logoWidth, maxLogoSize / logoHeight);
        logoWidth = logoWidth * ratio;
        logoHeight = logoHeight * ratio;
      }
      
      // ロゴを右上に配置
      const logoPadding = 40;
      const logoX = IMAGE_SIZE.width - logoWidth - logoPadding;
      const logoY = logoPadding;
      
      // 白い背景を追加（ロゴが見やすくなるように）
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.roundRect(logoX - 10, logoY - 10, logoWidth + 20, logoHeight + 20, 10);
      ctx.fill();
      
      // ロゴを描画
      ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
      console.log('✅ ロゴを描画しました');
    } catch (error) {
      console.error('⚠️ ロゴ描画エラー:', error);
    }
  }
  
  // 10. スライド番号インジケーター
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
 * 3枚のカルーセル画像を生成（AI レイアウト対応）
 */
export async function generateCarouselImages(
  photos: [Buffer | string, Buffer | string, Buffer | string],
  slides: {
    slide1: [string, string];
    slide2: [string, string];
    slide3: [string, string];
  },
  designNumber: DesignNumber,
  logoImage: string | null = null,
  customDesign: any = null,
  photoAnalyses: [any, any, any] | null = null, // 各写真の分析結果
  manualOverrides: [SlideManualOverride | null, SlideManualOverride | null, SlideManualOverride | null] = [null, null, null]
): Promise<[Buffer, Buffer, Buffer]> {
  console.log('🖼️ カルーセル画像生成開始...');
  
  const image1 = await generateSlideImage(photos[0], slides.slide1, designNumber, 1, logoImage, customDesign, photoAnalyses?.[0], manualOverrides[0]);
  const image2 = await generateSlideImage(photos[1], slides.slide2, designNumber, 2, null, customDesign, photoAnalyses?.[1], manualOverrides[1]);
  const image3 = await generateSlideImage(photos[2], slides.slide3, designNumber, 3, null, customDesign, photoAnalyses?.[2], manualOverrides[2]);
  
  console.log('🎉 カルーセル画像生成完了！');
  return [image1, image2, image3];
}

/**
 * 画像をBase64エンコード
 */
export function bufferToBase64(buffer: Buffer, mimeType: string = 'image/png'): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}
