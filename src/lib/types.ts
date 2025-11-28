// Instagramカルーセル自動生成アプリ - 型定義

/**
 * LLMが返す固定フォーマット
 */
export interface LLMResponse {
  slide1: [string, string]; // 各2行
  slide2: [string, string];
  slide3: [string, string];
  caption: string; // 投稿文全文
  style_tags: string[]; // 画像側の部品選択用タグ
}

/**
 * デザイン番号（1-3）
 */
export type DesignNumber = 1 | 2 | 3;

/**
 * 生成ジョブのステータス
 */
export type JobStatus = 'pending' | 'processing' | 'success' | 'failed';

/**
 * 生成ジョブ
 */
export interface GenerationJob {
  id: string;
  notionPageId: string;
  notionPageUrl: string;
  surveyText: string;
  photosPaths: [string, string, string]; // 3枚のパス
  designNumber: DesignNumber;
  llmResponseJson: LLMResponse | null;
  outputPngPaths: [string, string, string] | null; // 生成後の3枚
  outputPngUrls: [string, string, string] | null; // クライアント用URL
  status: JobStatus;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * LLM入力パラメータ
 */
export interface LLMInputParams {
  surveyText: string; // アンケート全文
  photosMeta: string; // 写真3枚の簡単な説明（MVPは空でOK）
  clientContext: string; // 顧客の登録知識（MVPは空でOK）
}

/**
 * 文字数検証結果
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  slide: 'slide1' | 'slide2' | 'slide3';
  type: 'char_count' | 'forbidden_word';
  message: string;
  actualValue?: number;
  expectedRange?: { min: number; max: number };
}

/**
 * テキスト位置候補
 */
export type TextPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';

/**
 * 画像生成設定
 */
export interface ImageGenerationConfig {
  width: number;
  height: number;
  textPosition: TextPosition;
  fontSizeMin: number;
  fontSizeMax: number;
}

/**
 * API リクエスト/レスポンス型
 */
export interface GenerateRequest {
  notionPageUrl: string;
  surveyText: string;
  designNumber: DesignNumber;
  photos: string[]; // Base64エンコード済み画像データ
}

export interface GenerateResponse {
  success: boolean;
  jobId?: string;
  error?: string;
}

export interface JobStatusResponse {
  job: GenerationJob | null;
  error?: string;
}

export interface NotionSaveRequest {
  jobId: string;
}

export interface NotionSaveResponse {
  success: boolean;
  error?: string;
}

/**
 * Notionページプロパティ
 */
export interface NotionPageProperties {
  title: string;
  slide2Text: string;
  slide3Text: string;
  caption: string;
  mediaFiles: string[];
}

/**
 * 顧客コンテキスト（将来の外部販売用）
 */
export interface ClientContext {
  id: string;
  tenantId: string;
  knowledgeBase: string;
  forbiddenWords: string[];
  customFonts: string[];
  backgroundPatterns: string[];
  textPositionCandidates: TextPosition[];
  createdAt: string;
  updatedAt: string;
}

/**
 * クライアント設定（localStorage保存用）
 */
export interface ClientSettings {
  id: string;
  name: string;
  logoImage: string | null; // ロゴマーク画像（Base64）
  knowledge: {
    companyDescription: string;
    uniqueWords: string[];
    tone: string;
    targetAudience: string;
    ngWords: string[];
    additionalContext: string;
    pdfFiles: Array<{ name: string; data: string }>;
  };
  designs: {
    design1: DesignTemplate;
    design2: DesignTemplate;
    design3: DesignTemplate;
  };
  createdAt: string;
  updatedAt: string;
}

export interface DesignTemplate {
  name: string;
  backgroundImage: string | null;
  primaryColor: string;
  accentColor: string;
  textColor: string;
  fontFamily: string; // フォント選択
}

