// Instagramカルーセル自動生成アプリ - バリデーション

import { LLMResponse, ValidationResult, ValidationError } from './types';
import { CHAR_LIMITS, FORBIDDEN_PATTERNS, LLM_FAILURE_MESSAGES } from './constants';

/**
 * スライドテキストの文字数を計算（改行は数えない）
 */
export function countCharacters(lines: [string, string]): number {
  return lines[0].replace(/\n/g, '').length + lines[1].replace(/\n/g, '').length;
}

/**
 * LLMレスポンスのバリデーション
 */
export function validateLLMResponse(response: LLMResponse): ValidationResult {
  const errors: ValidationError[] = [];

  // slide1の文字数チェック
  const slide1Count = countCharacters(response.slide1);
  if (slide1Count < CHAR_LIMITS.slide1.min || slide1Count > CHAR_LIMITS.slide1.max) {
    errors.push({
      slide: 'slide1',
      type: 'char_count',
      message: `1枚目の文字数が範囲外です（${slide1Count}文字、許容: ${CHAR_LIMITS.slide1.min}〜${CHAR_LIMITS.slide1.max}文字）`,
      actualValue: slide1Count,
      expectedRange: CHAR_LIMITS.slide1,
    });
  }

  // slide2の文字数チェック
  const slide2Count = countCharacters(response.slide2);
  if (slide2Count < CHAR_LIMITS.slide2.min || slide2Count > CHAR_LIMITS.slide2.max) {
    errors.push({
      slide: 'slide2',
      type: 'char_count',
      message: `2枚目の文字数が範囲外です（${slide2Count}文字、許容: ${CHAR_LIMITS.slide2.min}〜${CHAR_LIMITS.slide2.max}文字）`,
      actualValue: slide2Count,
      expectedRange: CHAR_LIMITS.slide2,
    });
  }

  // slide3の文字数チェック
  const slide3Count = countCharacters(response.slide3);
  if (slide3Count < CHAR_LIMITS.slide3.min || slide3Count > CHAR_LIMITS.slide3.max) {
    errors.push({
      slide: 'slide3',
      type: 'char_count',
      message: `3枚目の文字数が範囲外です（${slide3Count}文字、許容: ${CHAR_LIMITS.slide3.min}〜${CHAR_LIMITS.slide3.max}文字）`,
      actualValue: slide3Count,
      expectedRange: CHAR_LIMITS.slide3,
    });
  }

  // 禁止表記チェック
  const allText = [
    ...response.slide1,
    ...response.slide2,
    ...response.slide3,
    response.caption,
  ].join('');

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (allText.includes(pattern)) {
      errors.push({
        slide: 'slide1', // 全体に対するエラー
        type: 'forbidden_word',
        message: `禁止表記「${pattern}」が含まれています`,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * LLMが固定メッセージ（エラー）を返したかチェック
 */
export function isLLMFailureMessage(text: string): boolean {
  return LLM_FAILURE_MESSAGES.some(msg => text.includes(msg));
}

/**
 * JSONレスポンスをパース
 */
export function parseLLMResponse(text: string): LLMResponse | null {
  try {
    // JSONブロックを抽出（```json ... ``` または直接JSON）
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonString = jsonMatch ? jsonMatch[1] : text;
    
    // パース
    const parsed = JSON.parse(jsonString.trim());
    
    // 必須フィールドのチェック
    if (
      !parsed.slide1 ||
      !parsed.slide2 ||
      !parsed.slide3 ||
      !parsed.caption ||
      !Array.isArray(parsed.slide1) ||
      !Array.isArray(parsed.slide2) ||
      !Array.isArray(parsed.slide3) ||
      parsed.slide1.length !== 2 ||
      parsed.slide2.length !== 2 ||
      parsed.slide3.length !== 2
    ) {
      console.error('Invalid LLM response structure:', parsed);
      return null;
    }
    
    return {
      slide1: [parsed.slide1[0], parsed.slide1[1]],
      slide2: [parsed.slide2[0], parsed.slide2[1]],
      slide3: [parsed.slide3[0], parsed.slide3[1]],
      caption: parsed.caption,
      style_tags: parsed.style_tags || [],
    };
  } catch (error) {
    console.error('Failed to parse LLM response:', error);
    return null;
  }
}

/**
 * NotionページURLからpage_idを抽出
 */
export function extractNotionPageId(url: string): string | null {
  try {
    // 形式: https://www.notion.so/hoap-inc/2b8079f873ee80a79749c17e50d9ab72
    // または: https://www.notion.so/2b8079f873ee80a79749c17e50d9ab72
    // または: https://notion.so/hoap-inc/ページタイトル-2b8079f873ee80a79749c17e50d9ab72
    
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // パスの最後の部分を取得
    const parts = pathname.split('/').filter(Boolean);
    const lastPart = parts[parts.length - 1];
    
    // ページIDは32文字のハイフンなし形式、または36文字のハイフン付き形式
    // タイトル-ID形式の場合、最後の32文字を取得
    const idMatch = lastPart.match(/([a-f0-9]{32})$/i) || lastPart.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
    
    if (idMatch) {
      // ハイフンなしの形式に統一
      return idMatch[1].replace(/-/g, '');
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * ページIDをハイフン付き形式に変換
 */
export function formatNotionPageId(pageId: string): string {
  // 既にハイフン付きの場合はそのまま返す
  if (pageId.includes('-')) {
    return pageId;
  }
  
  // 8-4-4-4-12 形式に変換
  return `${pageId.slice(0, 8)}-${pageId.slice(8, 12)}-${pageId.slice(12, 16)}-${pageId.slice(16, 20)}-${pageId.slice(20)}`;
}

