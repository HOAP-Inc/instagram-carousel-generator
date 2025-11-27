'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface DesignTemplate {
  name: string;
  backgroundImage: string | null;
  primaryColor: string;
  accentColor: string;
  textColor: string;
}

interface ClientSettings {
  id: string;
  name: string;
  knowledge: {
    companyDescription: string;
    uniqueWords: string[];
    tone: string;
    targetAudience: string;
    hashtags: string[];
    ngWords: string[];
    additionalContext: string;
  };
  designs: {
    design1: DesignTemplate;
    design2: DesignTemplate;
    design3: DesignTemplate;
  };
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'instagram-carousel-settings';

function getDefaultSettings(): ClientSettings {
  return {
    id: 'default',
    name: '',
    knowledge: {
      companyDescription: '',
      uniqueWords: [],
      tone: '親しみやすく、温かみのある',
      targetAudience: '',
      hashtags: ['#採用', '#求人'],
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

export default function SettingsPage() {
  const [settings, setSettings] = useState<ClientSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'knowledge' | 'designs'>('knowledge');
  
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // localStorageから設定を読み込み
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setSettings(JSON.parse(saved));
      } else {
        setSettings(getDefaultSettings());
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      setSettings(getDefaultSettings());
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 設定を保存
  const handleSave = async () => {
    if (!settings) return;
    
    setIsSaving(true);
    setMessage(null);
    
    try {
      const updatedSettings = {
        ...settings,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSettings));
      setSettings(updatedSettings);
      setMessage({ type: 'success', text: '設定を保存しました！' });
    } catch (error) {
      setMessage({ type: 'error', text: '保存に失敗しました' });
    } finally {
      setIsSaving(false);
    }
  };

  // ナレッジの更新
  const updateKnowledge = (field: keyof ClientSettings['knowledge'], value: string | string[]) => {
    if (!settings) return;
    setSettings({
      ...settings,
      knowledge: {
        ...settings.knowledge,
        [field]: value,
      },
    });
  };

  // 配列フィールドの更新（カンマ区切りテキストから）
  const updateArrayField = (field: keyof ClientSettings['knowledge'], text: string) => {
    const items = text.split(/[,、\n]/).map(s => s.trim()).filter(s => s);
    updateKnowledge(field, items);
  };

  // デザインの更新
  const updateDesign = (designKey: 'design1' | 'design2' | 'design3', field: keyof DesignTemplate, value: string | null) => {
    if (!settings) return;
    setSettings({
      ...settings,
      designs: {
        ...settings.designs,
        [designKey]: {
          ...settings.designs[designKey],
          [field]: value,
        },
      },
    });
  };

  // 背景画像のアップロード
  const handleImageUpload = (designKey: 'design1' | 'design2' | 'design3', file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      updateDesign(designKey, 'backgroundImage', e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>設定の読み込みに失敗しました</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* ヘッダー */}
      <header className="app-header sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-[var(--accent-purple)] hover:underline">
              ← 戻る
            </Link>
            <h1 className="text-xl font-extrabold gradient-text">
              クライアント設定
            </h1>
          </div>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? '保存中...' : '💾 保存'}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* メッセージ */}
        {message && (
          <div className={`mb-6 ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
            {message.text}
          </div>
        )}

        {/* 注意書き */}
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm">
          💡 設定はこのブラウザに保存されます。別のデバイスでは引き継がれません。
        </div>

        {/* タブ */}
        <div className="flex gap-2 mb-6">
          <button
            className={`px-6 py-3 rounded-full font-semibold transition-all ${
              activeTab === 'knowledge'
                ? 'bg-gradient-to-r from-[var(--accent-pink)] to-[var(--accent-blue)] text-white'
                : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text)]'
            }`}
            onClick={() => setActiveTab('knowledge')}
          >
            📚 会社ナレッジ
          </button>
          <button
            className={`px-6 py-3 rounded-full font-semibold transition-all ${
              activeTab === 'designs'
                ? 'bg-gradient-to-r from-[var(--accent-pink)] to-[var(--accent-blue)] text-white'
                : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text)]'
            }`}
            onClick={() => setActiveTab('designs')}
          >
            🎨 デザインテンプレート
          </button>
        </div>

        {/* ナレッジタブ */}
        {activeTab === 'knowledge' && (
          <div className="space-y-6 animate-fade-in">
            {/* 会社名 */}
            <section className="card">
              <h3 className="font-semibold mb-3 text-[var(--text)]">会社・施設名</h3>
              <input
                type="text"
                className="input-field"
                placeholder="例: ウォームハート介護施設"
                value={settings.name}
                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
              />
            </section>

            {/* 会社説明 */}
            <section className="card">
              <h3 className="font-semibold mb-3 text-[var(--text)]">会社・施設の説明</h3>
              <textarea
                className="textarea-field"
                placeholder="会社の特徴、理念、雰囲気などを記入してください..."
                value={settings.knowledge.companyDescription}
                onChange={(e) => updateKnowledge('companyDescription', e.target.value)}
                rows={4}
              />
              <p className="text-sm text-[var(--text-light)] mt-2">
                LLMがコンテンツ生成時に参照します
              </p>
            </section>

            {/* 独自ワード */}
            <section className="card">
              <h3 className="font-semibold mb-3 text-[var(--text)]">独自のワード・用語</h3>
              <textarea
                className="textarea-field"
                placeholder="例: ほーぷちゃん、ウォームハートファミリー、寄り添いケア..."
                value={settings.knowledge.uniqueWords.join('、')}
                onChange={(e) => updateArrayField('uniqueWords', e.target.value)}
                rows={2}
              />
              <p className="text-sm text-[var(--text-light)] mt-2">
                カンマまたは読点で区切ってください
              </p>
            </section>

            {/* トーン */}
            <section className="card">
              <h3 className="font-semibold mb-3 text-[var(--text)]">文章のトーン</h3>
              <input
                type="text"
                className="input-field"
                placeholder="例: 親しみやすく、温かみのある"
                value={settings.knowledge.tone}
                onChange={(e) => updateKnowledge('tone', e.target.value)}
              />
            </section>

            {/* ターゲット層 */}
            <section className="card">
              <h3 className="font-semibold mb-3 text-[var(--text)]">ターゲット層</h3>
              <input
                type="text"
                className="input-field"
                placeholder="例: 20〜40代の看護師・介護士志望の方"
                value={settings.knowledge.targetAudience}
                onChange={(e) => updateKnowledge('targetAudience', e.target.value)}
              />
            </section>

            {/* ハッシュタグ */}
            <section className="card">
              <h3 className="font-semibold mb-3 text-[var(--text)]">よく使うハッシュタグ</h3>
              <textarea
                className="textarea-field"
                placeholder="#採用 #求人 #医療 #介護..."
                value={settings.knowledge.hashtags.join(' ')}
                onChange={(e) => {
                  const tags = e.target.value.split(/[\s,、]/).filter(s => s);
                  updateKnowledge('hashtags', tags);
                }}
                rows={2}
              />
            </section>

            {/* 禁止ワード */}
            <section className="card">
              <h3 className="font-semibold mb-3 text-[var(--text)]">禁止ワード（NGワード）</h3>
              <textarea
                className="textarea-field"
                placeholder="使ってほしくない言葉を入力..."
                value={settings.knowledge.ngWords.join('、')}
                onChange={(e) => updateArrayField('ngWords', e.target.value)}
                rows={2}
              />
            </section>

            {/* その他 */}
            <section className="card">
              <h3 className="font-semibold mb-3 text-[var(--text)]">その他の補足情報</h3>
              <textarea
                className="textarea-field"
                placeholder="コンテンツ作成時に考慮してほしいことがあれば..."
                value={settings.knowledge.additionalContext}
                onChange={(e) => updateKnowledge('additionalContext', e.target.value)}
                rows={3}
              />
            </section>
          </div>
        )}

        {/* デザインタブ */}
        {activeTab === 'designs' && (
          <div className="space-y-6 animate-fade-in">
            {(['design1', 'design2', 'design3'] as const).map((designKey, index) => {
              const design = settings.designs[designKey];
              return (
                <section key={designKey} className="card">
                  <h3 className="font-semibold mb-4 text-[var(--text)]">
                    デザイン {index + 1}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 背景画像 */}
                    <div>
                      <label className="block text-sm font-medium mb-2 text-[var(--text)]">
                        背景画像
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        ref={(el) => { fileInputRefs.current[designKey] = el; }}
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(designKey, file);
                        }}
                      />
                      <div
                        className="file-upload h-40 cursor-pointer"
                        onClick={() => fileInputRefs.current[designKey]?.click()}
                      >
                        {design.backgroundImage ? (
                          <img
                            src={design.backgroundImage}
                            alt={`Design ${index + 1}`}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <div className="text-center">
                            <span className="text-3xl">🖼️</span>
                            <p className="text-sm text-[var(--text-light)] mt-2">
                              クリックして画像をアップロード
                            </p>
                          </div>
                        )}
                      </div>
                      {design.backgroundImage && (
                        <button
                          className="text-sm text-red-500 mt-2"
                          onClick={() => updateDesign(designKey, 'backgroundImage', null)}
                        >
                          画像を削除
                        </button>
                      )}
                    </div>

                    {/* カラー設定 */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2 text-[var(--text)]">
                          デザイン名
                        </label>
                        <input
                          type="text"
                          className="input-field"
                          value={design.name}
                          onChange={(e) => updateDesign(designKey, 'name', e.target.value)}
                        />
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium mb-1 text-[var(--text-light)]">
                            メイン色
                          </label>
                          <input
                            type="color"
                            className="w-full h-10 rounded-lg cursor-pointer"
                            value={design.primaryColor}
                            onChange={(e) => updateDesign(designKey, 'primaryColor', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1 text-[var(--text-light)]">
                            アクセント色
                          </label>
                          <input
                            type="color"
                            className="w-full h-10 rounded-lg cursor-pointer"
                            value={design.accentColor}
                            onChange={(e) => updateDesign(designKey, 'accentColor', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1 text-[var(--text-light)]">
                            文字色
                          </label>
                          <input
                            type="color"
                            className="w-full h-10 rounded-lg cursor-pointer"
                            value={design.textColor}
                            onChange={(e) => updateDesign(designKey, 'textColor', e.target.value)}
                          />
                        </div>
                      </div>

                      {/* プレビュー */}
                      <div
                        className="h-20 rounded-lg flex items-center justify-center"
                        style={{
                          background: `linear-gradient(135deg, ${design.primaryColor}, ${design.accentColor})`,
                        }}
                      >
                        <span
                          className="font-bold text-lg"
                          style={{ color: design.textColor }}
                        >
                          サンプルテキスト
                        </span>
                      </div>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      {/* フッター */}
      <footer className="app-footer mt-16">
        <div className="max-w-4xl mx-auto px-6 py-6 text-center text-sm text-[var(--text-light)]">
          <p>© 2024 HOAP Inc. - Instagram Carousel Generator</p>
        </div>
      </footer>
    </div>
  );
}
