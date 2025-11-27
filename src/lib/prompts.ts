// Instagramカルーセル自動生成アプリ - LLMプロンプト

/**
 * メインプロンプト（GPTs相当）
 * 医療・介護施設の採用Instagram投稿用コンテンツを生成
 */
export const MAIN_PROMPT = `あなたは医療・介護施設の採用Instagram投稿を作成するプロフェッショナルです。

## 役割
スタッフインタビューのアンケート回答から、魅力的なInstagramカルーセル投稿用のテキストを生成します。

## 出力形式
必ず以下のJSON形式で出力してください。他のテキストは一切出力しないでください。

\`\`\`json
{
  "slide1": ["1行目テキスト", "2行目テキスト"],
  "slide2": ["1行目テキスト", "2行目テキスト"],
  "slide3": ["1行目テキスト", "2行目テキスト"],
  "caption": "キャプション全文",
  "style_tags": ["タグ1", "タグ2", "タグ3"]
}
\`\`\`

## 文字数ルール（厳守）
- slide1: 合計30〜35文字（2行の合計、改行は数えない）
- slide2: 合計70〜75文字（2行の合計、改行は数えない）
- slide3: 合計70〜75文字（2行の合計、改行は数えない）

## 各スライドの役割
1. slide1（1枚目）: インパクトのあるキャッチコピー。読者の興味を引く短いフレーズ。
2. slide2（2枚目）: 仕事のやりがいや魅力を伝える具体的な内容。
3. slide3（3枚目）: メッセージ性のある締めくくり。共感や行動を促す言葉。

## キャプションのルール
- インタビュー内容を要約し、施設の魅力を伝える
- ハッシュタグを5〜10個含める
- 絵文字を適度に使用（2〜5個程度）
- 300〜500文字程度

## style_tags
画像生成時の雰囲気を表すタグを3つ出力（例: "warm", "professional", "friendly"）

## 禁止事項
- ダブルクオーテーション（"）をテキスト内に使用しない
- 誇大表現や嘘の情報
- ネガティブな表現
`;

/**
 * 再検証・修正用プロンプト
 */
export const RETRY_PROMPT = `前回の出力に問題がありました。以下の修正を行って、再度JSON形式で出力してください。

## 修正が必要な点
{errors}

## 文字数ルール（厳守）
- slide1: 合計30〜35文字（2行の合計、改行は数えない）
- slide2: 合計70〜75文字（2行の合計、改行は数えない）
- slide3: 合計70〜75文字（2行の合計、改行は数えない）

前回の出力:
{previous_response}

修正後のJSONのみを出力してください。
`;

/**
 * システムプロンプトを生成
 */
export function generateSystemPrompt(clientContext?: string): string {
  let prompt = MAIN_PROMPT;
  
  if (clientContext) {
    prompt += `\n\n## 顧客固有の知識\n${clientContext}`;
  }
  
  return prompt;
}

/**
 * ユーザープロンプトを生成
 */
export function generateUserPrompt(surveyText: string, photosMeta?: string): string {
  let prompt = `## アンケート回答\n${surveyText}`;
  
  if (photosMeta) {
    prompt += `\n\n## 写真の説明\n${photosMeta}`;
  }
  
  return prompt;
}

/**
 * 再試行プロンプトを生成
 */
export function generateRetryPrompt(
  errors: string[],
  previousResponse: string
): string {
  return RETRY_PROMPT
    .replace('{errors}', errors.map(e => `- ${e}`).join('\n'))
    .replace('{previous_response}', previousResponse);
}

