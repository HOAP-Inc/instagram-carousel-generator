// Instagramカルーセル自動生成アプリ - LLM連携

import OpenAI from 'openai';
import { LLMResponse, LLMInputParams, ValidationResult } from './types';
import { generateSystemPrompt, generateUserPrompt, generateRetryPrompt } from './prompts';
import { validateLLMResponse, parseLLMResponse, isLLMFailureMessage } from './validation';
import { MAX_LLM_RETRIES } from './constants';

/**
 * 写真分析結果
 */
export interface PhotoAnalysis {
  personPosition: 'left' | 'center' | 'right'; // 人物の位置
  facePosition: { x: number; y: number } | null; // 顔の位置（相対座標 0-1）
  emptySpaces: ('top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center')[]; // 空きスペース
  brightness: 'dark' | 'medium' | 'bright'; // 明るさ
  recommendedTextPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'; // 推奨テキスト位置
}

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
 * デモ用モックレスポンス（APIキーなしで動作確認用）
 */
function generateMockResponse(surveyText: string): LLMResponse {
  return {
    slide1: ['働きやすさNo.1', '私たちの職場へ'],
    slide2: ['スタッフ同士の仲が良く', '困った時はすぐに助け合える環境です'],
    slide3: ['あなたも一緒に', '温かいチームで働きませんか？'],
    caption: `✨ スタッフインタビュー ✨

${surveyText.slice(0, 100)}...

当施設では、スタッフ一人ひとりが輝ける環境づくりを大切にしています。

📍 詳しくはプロフィールのリンクから！

#採用 #求人 #医療 #介護 #看護師 #介護士 #働きやすい職場 #チームワーク`,
    style_tags: ['warm', 'professional', 'friendly'],
  };
}

/**
 * LLMでコンテンツを生成
 */
export async function generateContent(
  params: LLMInputParams
): Promise<{ success: boolean; data?: LLMResponse; error?: string }> {
  const { surveyText, photosMeta, clientContext, mainTheme } = params;

  // APIキーがない場合はデモモード
  if (!process.env.OPENAI_API_KEY) {
    console.log('🎭 デモモード: APIキーが未設定のため、モックデータを返します');
    return {
      success: true,
      data: generateMockResponse(surveyText),
    };
  }

  const systemPrompt = generateSystemPrompt(clientContext);
  const userPrompt = generateUserPrompt(surveyText, photosMeta, mainTheme);

  let retryCount = 0;
  let lastResponse: string = '';
  let lastValidationErrors: string[] = [];
  let lastParsedData: LLMResponse | null = null;

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

      console.log(`🔄 LLM呼び出し (試行 ${retryCount + 1}/${MAX_LLM_RETRIES + 1})`);

      const completion = await getOpenAIClient().chat.completions.create({
        model: 'gpt-4o',
        messages,
        temperature: 0.8,
        max_tokens: 3000,
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

      // パース成功したら保存
      lastParsedData = parsed;

      // バリデーション
      const validation: ValidationResult = validateLLMResponse(parsed);
      if (validation.isValid) {
        console.log('✅ バリデーション成功！');
        return {
          success: true,
          data: parsed,
        };
      }

      // バリデーションエラーがある場合は再試行
      console.log(`⚠️ バリデーションエラー: ${validation.errors.map(e => e.message).join(', ')}`);
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

  // 最大再試行回数を超えた場合はエラーを返す（文字数不足は許容しない）
  console.error('❌ 最大再試行回数を超えました。文字数を満たせませんでした。');
  return {
    success: false,
    error: `文字数の条件を満たせませんでした。以下の問題があります：\n${lastValidationErrors.join('\n')}\n\nアンケート内容をもう少し詳しく記入して、再度お試しください。`,
  };
}

/**
 * Vision APIで写真を分析し、最適なレイアウトを決定
 */
export async function analyzePhotoLayout(photoBase64: string): Promise<PhotoAnalysis> {
  // APIキーがない場合はデフォルト値を返す
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️ OPENAI_API_KEY が設定されていません。デフォルトレイアウトを使用します。');
    return {
      personPosition: 'center',
      facePosition: { x: 0.5, y: 0.3 },
      emptySpaces: ['top-left', 'top-right'],
      brightness: 'medium',
      recommendedTextPosition: 'top-left',
    };
  }

  try {
    const client = getOpenAIClient();
    
    console.log('🔍 Vision APIで写真を分析中...');
    
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `あなたは画像レイアウトの専門家です。写真を分析し、テキストを配置するのに最適な位置を判断してください。

以下の情報を JSON 形式で返してください：
{
  "personPosition": "left" | "center" | "right",
  "facePosition": { "x": 0-1, "y": 0-1 } | null,
  "emptySpaces": ["top-left", "top-right", "bottom-left", "bottom-right", "center"],
  "brightness": "dark" | "medium" | "bright",
  "recommendedTextPosition": "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center"
}

判断基準：
1. personPosition: 人物が画像の左/中央/右のどこにいるか
2. facePosition: 顔の位置（相対座標、顔がない場合はnull）
3. emptySpaces: テキストを配置できる空きスペース（複数可）
4. brightness: 画像全体の明るさ
5. recommendedTextPosition: 最もテキストが読みやすい位置（1つ）

重要：
- 人物や顔と重ならない位置を推奨
- 明るすぎる/暗すぎる場所は避ける
- 視線誘導を考慮（上→下、左→右）`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'この写真を分析して、テキストを配置するのに最適な位置を教えてください。',
            },
            {
              type: 'image_url',
              image_url: {
                url: photoBase64.startsWith('data:') ? photoBase64 : `data:image/jpeg;base64,${photoBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Vision APIからレスポンスがありません');
    }

    console.log('📊 Vision API レスポンス:', content);

    // JSONを抽出
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('JSONが見つかりません');
    }

    const analysis: PhotoAnalysis = JSON.parse(jsonMatch[0]);
    console.log('✅ 写真分析完了:', analysis);

    return analysis;
  } catch (error) {
    console.error('❌ Vision API エラー:', error);
    // エラー時はデフォルト値を返す
    return {
      personPosition: 'center',
      facePosition: { x: 0.5, y: 0.3 },
      emptySpaces: ['top-left', 'top-right'],
      brightness: 'medium',
      recommendedTextPosition: 'top-left',
    };
  }
}

