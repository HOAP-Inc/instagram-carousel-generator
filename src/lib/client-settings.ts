// お客様ごとの設定管理

import fs from 'fs/promises';
import path from 'path';

const SETTINGS_DIR = path.join(process.cwd(), 'data', 'clients');
const DEFAULT_CLIENT_ID = 'default';

/**
 * クライアント設定の型
 */
export interface ClientSettings {
  id: string;
  name: string;
  // 会社ナレッジ（LLMが参照）
  knowledge: {
    companyDescription: string;  // 会社の説明
    uniqueWords: string[];       // 独自ワード・用語
    tone: string;                // トーン（親しみやすい、フォーマルなど）
    targetAudience: string;      // ターゲット層
    hashtags: string[];          // よく使うハッシュタグ
    ngWords: string[];           // 禁止ワード
    additionalContext: string;   // その他の補足情報
  };
  // デザインテンプレート
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
  backgroundImage: string | null;  // Base64 or path
  primaryColor: string;
  accentColor: string;
  textColor: string;
}

/**
 * デフォルト設定
 */
export function getDefaultSettings(): ClientSettings {
  return {
    id: DEFAULT_CLIENT_ID,
    name: 'デフォルト',
    knowledge: {
      companyDescription: '',
      uniqueWords: [],
      tone: '親しみやすく、温かみのある',
      targetAudience: '医療・介護業界で働きたい方',
      hashtags: ['#採用', '#求人', '#医療', '#介護', '#看護師', '#介護士'],
      ngWords: [],
      additionalContext: '',
    },
    designs: {
      design1: {
        name: 'シアン＆マゼンタ',
        backgroundImage: null,
        primaryColor: '#00D4FF',
        accentColor: '#FF69B4',
        textColor: '#FF1493',
      },
      design2: {
        name: 'ピンク＆ブルー',
        backgroundImage: null,
        primaryColor: '#FFB6C1',
        accentColor: '#87CEEB',
        textColor: '#4169E1',
      },
      design3: {
        name: 'イエロー＆グレー',
        backgroundImage: null,
        primaryColor: '#FFD700',
        accentColor: '#808080',
        textColor: '#FF8C00',
      },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 設定ディレクトリを確保
 */
async function ensureSettingsDir(): Promise<void> {
  try {
    await fs.access(SETTINGS_DIR);
  } catch {
    await fs.mkdir(SETTINGS_DIR, { recursive: true });
  }
}

/**
 * 設定ファイルのパスを取得
 */
function getSettingsPath(clientId: string): string {
  return path.join(SETTINGS_DIR, `${clientId}.json`);
}

/**
 * クライアント設定を取得
 */
export async function getClientSettings(clientId: string = DEFAULT_CLIENT_ID): Promise<ClientSettings> {
  await ensureSettingsDir();
  
  const settingsPath = getSettingsPath(clientId);
  
  try {
    const data = await fs.readFile(settingsPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    // 設定がない場合はデフォルトを返す
    const defaultSettings = getDefaultSettings();
    defaultSettings.id = clientId;
    return defaultSettings;
  }
}

/**
 * クライアント設定を保存
 */
export async function saveClientSettings(settings: ClientSettings): Promise<void> {
  await ensureSettingsDir();
  
  settings.updatedAt = new Date().toISOString();
  
  const settingsPath = getSettingsPath(settings.id);
  await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
}

/**
 * クライアント一覧を取得
 */
export async function listClients(): Promise<{ id: string; name: string }[]> {
  await ensureSettingsDir();
  
  try {
    const files = await fs.readdir(SETTINGS_DIR);
    const clients: { id: string; name: string }[] = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const data = await fs.readFile(path.join(SETTINGS_DIR, file), 'utf-8');
        const settings = JSON.parse(data);
        clients.push({ id: settings.id, name: settings.name });
      }
    }
    
    return clients;
  } catch {
    return [];
  }
}

/**
 * ナレッジをLLMプロンプト用に整形
 */
export function formatKnowledgeForLLM(knowledge: ClientSettings['knowledge']): string {
  const parts: string[] = [];
  
  if (knowledge.companyDescription) {
    parts.push(`【会社・施設について】\n${knowledge.companyDescription}`);
  }
  
  if (knowledge.uniqueWords.length > 0) {
    parts.push(`【独自の用語・ワード】\n${knowledge.uniqueWords.join('、')}`);
  }
  
  if (knowledge.tone) {
    parts.push(`【文章のトーン】\n${knowledge.tone}`);
  }
  
  if (knowledge.targetAudience) {
    parts.push(`【ターゲット層】\n${knowledge.targetAudience}`);
  }
  
  if (knowledge.hashtags.length > 0) {
    parts.push(`【使用するハッシュタグ】\n${knowledge.hashtags.join(' ')}`);
  }
  
  if (knowledge.ngWords.length > 0) {
    parts.push(`【禁止ワード（絶対に使わない）】\n${knowledge.ngWords.join('、')}`);
  }
  
  if (knowledge.additionalContext) {
    parts.push(`【その他の注意点】\n${knowledge.additionalContext}`);
  }
  
  return parts.join('\n\n');
}

