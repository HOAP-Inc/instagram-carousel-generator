// Instagramカルーセル自動生成アプリ - LLM連携

import OpenAI from 'openai';
import { LLMResponse, LLMInputParams, ValidationResult } from './types';
import { generateSystemPrompt, generateUserPrompt, generateRetryPrompt } from './prompts';
import { validateLLMResponse, parseLLMResponse, isLLMFailureMessage } from './validation';
import { MAX_LLM_RETRIES } from './constants';

// OpenAI クライアントを遅延初期化（ビルド時のエラー回避）
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

/**
 * LLMでコンテンツを生成
 */
export async function generateContent(
  params: LLMInputParams
): Promise<{ success: boolean; data?: LLMResponse; error?: string }> {
  const { surveyText, photosMeta, clientContext } = params;

  const systemPrompt = generateSystemPrompt(clientContext);
  const userPrompt = generateUserPrompt(surveyText, photosMeta);

  let retryCount = 0;
  let lastResponse: string = '';
  let lastValidationErrors: string[] = [];

  while (retryCount <= MAX_LLM_RETRIES) {
    try {
      // LLM呼び出し
      const messages: OpenAI.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      // 再試行時は修正指示を追加
      if (retryCount > 0 && lastValidationErrors.length > 0) {
        const retryPrompt = generateRetryPrompt(lastValidationErrors, lastResponse);
        messages.push({ role: 'assistant', content: lastResponse });
        messages.push({ role: 'user', content: retryPrompt });
      }

      const completion = await getOpenAIClient().chat.completions.create({
        model: 'gpt-4o',
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      });

      const responseText = completion.choices[0]?.message?.content || '';
      lastResponse = responseText;

      // 固定メッセージ（エラー）のチェック
      if (isLLMFailureMessage(responseText)) {
        return {
          success: false,
          error: '生成に失敗しました。アンケート内容を確認してください。',
        };
      }

      // JSONパース
      const parsed = parseLLMResponse(responseText);
      if (!parsed) {
        lastValidationErrors = ['JSONの形式が正しくありません。正しいJSON形式で出力してください。'];
        retryCount++;
        continue;
      }

      // バリデーション
      const validation: ValidationResult = validateLLMResponse(parsed);
      if (validation.isValid) {
        return {
          success: true,
          data: parsed,
        };
      }

      // バリデーションエラーがある場合は再試行
      lastValidationErrors = validation.errors.map(e => e.message);
      retryCount++;
    } catch (error) {
      console.error('LLM API error:', error);
      return {
        success: false,
        error: 'LLM APIエラーが発生しました。',
      };
    }
  }

  // 最大再試行回数を超えた
  return {
    success: false,
    error: `バリデーションエラー: ${lastValidationErrors.join(', ')}`,
  };
}

