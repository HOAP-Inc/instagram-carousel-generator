'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { DesignNumber, PersonPosition, TextPosition } from '@/lib/types';

interface GenerationResult {
  slide1: [string, string];
  slide2: [string, string];
  slide3: [string, string];
  caption: string;
  images: [string, string, string];
}

type SlideKey = 'slide1' | 'slide2' | 'slide3';
type PositionOption = 'auto' | PersonPosition;
type TextPositionOption = 'auto' | TextPosition;
type DesignTweak = {
  fontScale: number;
  personPosition: PositionOption;
  textPosition: TextPositionOption;
  offsetX: number;
  offsetY: number;
  textOffsetX: number;
  textOffsetY: number;
};

const createDefaultTweaks = (): DesignTweak[] => ([
  { fontScale: 1, personPosition: 'auto', textPosition: 'auto', offsetX: 0, offsetY: 0, textOffsetX: 0, textOffsetY: 0 },
  { fontScale: 1, personPosition: 'auto', textPosition: 'auto', offsetX: 0, offsetY: 0, textOffsetX: 0, textOffsetY: 0 },
  { fontScale: 1, personPosition: 'auto', textPosition: 'auto', offsetX: 0, offsetY: 0, textOffsetX: 0, textOffsetY: 0 },
]);

const SETTINGS_KEY = 'instagram-carousel-settings';

// 設定からLLM用コンテキストを生成
function formatKnowledgeForLLM(knowledge: any): string {
  const parts: string[] = [];
  
  if (knowledge?.companyDescription) {
    parts.push(`【会社・施設について】\n${knowledge.companyDescription}`);
  }
  if (knowledge?.uniqueWords?.length > 0) {
    parts.push(`【独自の用語・ワード】\n${knowledge.uniqueWords.join('、')}`);
  }
  if (knowledge?.tone) {
    parts.push(`【文章のトーン】\n${knowledge.tone}`);
  }
  if (knowledge?.targetAudience) {
    parts.push(`【ターゲット層】\n${knowledge.targetAudience}`);
  }
  if (knowledge?.hashtags?.length > 0) {
    parts.push(`【使用するハッシュタグ】\n${knowledge.hashtags.join(' ')}`);
  }
  if (knowledge?.ngWords?.length > 0) {
    parts.push(`【禁止ワード（絶対に使わない）】\n${knowledge.ngWords.join('、')}`);
  }
  if (knowledge?.additionalContext) {
    parts.push(`【その他の注意点】\n${knowledge.additionalContext}`);
  }
  
  return parts.join('\n\n');
}

export default function Home() {
  // フォーム状態
  const [notionUrl, setNotionUrl] = useState('');
  const [surveyText, setSurveyText] = useState('');
  const [mainTheme, setMainTheme] = useState(''); // 一番伝えたいテーマ
  const [designNumber, setDesignNumber] = useState<DesignNumber>(1);
  const [photos, setPhotos] = useState<(File | null)[]>([null, null, null]);
  const [photoPreviews, setPhotoPreviews] = useState<(string | null)[]>([null, null, null]);
  const [clientContext, setClientContext] = useState('');
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [customDesign, setCustomDesign] = useState<any>(null);
  const [designNames, setDesignNames] = useState<{ [key: number]: string }>({
    1: 'デザイン 1',
    2: 'デザイン 2',
    3: 'デザイン 3',
  });
  const [designPreviews, setDesignPreviews] = useState<{ [key: number]: any }>({});
  
  // 生成状態
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [editableSlides, setEditableSlides] = useState({
    slide1: '',
    slide2: '',
    slide3: '',
    caption: '',
  });
  const [designTweaks, setDesignTweaks] = useState(createDefaultTweaks);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenMessage, setRegenMessage] = useState<string | null>(null);
  
  // Notion保存状態
  const [isSavingToNotion, setIsSavingToNotion] = useState(false);
  const [notionSaveSuccess, setNotionSaveSuccess] = useState(false);
  
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null]);
  const autoRegenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasUserAdjustedDesignTweaksRef = useRef(false);

  const tupleFromText = (text: string): [string, string] => [text.trim(), ''];

  const handleSlideTextChange = (key: SlideKey, value: string) => {
    setEditableSlides((prev) => ({ ...prev, [key]: value }));
  };

  const handleCaptionChange = (value: string) => {
    setEditableSlides((prev) => ({ ...prev, caption: value }));
  };

  const handleApplyTextEdits = () => {
    if (!result) {
      setError('まずコンテンツを生成してください');
      return;
    }
    setResult((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        slide1: tupleFromText(editableSlides.slide1),
        slide2: tupleFromText(editableSlides.slide2),
        slide3: tupleFromText(editableSlides.slide3),
        caption: editableSlides.caption,
      };
    });
    setRegenMessage('テキストを更新しました');
  };

  const handleDesignTweakChange = <K extends keyof DesignTweak>(index: number, field: K, value: DesignTweak[K]) => {
    hasUserAdjustedDesignTweaksRef.current = true;
    setDesignTweaks((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const resetDesignTweaks = () => {
    hasUserAdjustedDesignTweaksRef.current = false;
    setDesignTweaks(createDefaultTweaks);
  };

  const handleRegenerateImages = async () => {
    if (!jobId) {
      setError('ジョブ情報がないため再描画できません。最初から生成してください。');
      return;
    }
    if (isRegenerating) {
      return;
    }
    
    console.log('🔄 再描画開始:', { jobId, designTweaks });
    
    setIsRegenerating(true);
    setError(null);
    setRegenMessage(null);
    
    try {
      const requestBody = {
        jobId,
        slides: {
          slide1: editableSlides.slide1,
          slide2: editableSlides.slide2,
          slide3: editableSlides.slide3,
        },
        caption: editableSlides.caption,
        overrides: designTweaks.map((tweak) => ({
          fontScale: tweak.fontScale,
          personPosition: tweak.personPosition === 'auto' ? undefined : tweak.personPosition,
          textPosition: tweak.textPosition === 'auto' ? undefined : tweak.textPosition,
          personOffsetX: tweak.offsetX,
          personOffsetY: tweak.offsetY,
          textOffsetX: tweak.textOffsetX,
          textOffsetY: tweak.textOffsetY,
        })),
      };
      
      console.log('📤 再描画リクエスト:', requestBody);
      
      const response = await fetch('/api/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      
      const data = await response.json();
      console.log('📥 再描画レスポンス:', data);
      
      if (!data.success) {
        setError(data.error || '画像の再描画に失敗しました');
        return;
      }
      
      setResult((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          slide1: data.data.slide1,
          slide2: data.data.slide2,
          slide3: data.data.slide3,
          caption: data.data.caption,
          images: data.data.images,
        };
      });
      
      setEditableSlides({
        slide1: data.data.slide1.filter(Boolean).join('\n') || data.data.slide1[0] || '',
        slide2: data.data.slide2.filter(Boolean).join('\n') || data.data.slide2[0] || '',
        slide3: data.data.slide3.filter(Boolean).join('\n') || data.data.slide3[0] || '',
        caption: data.data.caption,
      });
      setRegenMessage('画像を再描画しました');
    } catch (err) {
      console.error(err);
      setError('再描画中にエラーが発生しました');
    } finally {
      setIsRegenerating(false);
    }
  };

  // デザイン微調整が変更されたら、自動で画像を再描画（デバウンス）
  useEffect(() => {
    if (!result || !jobId) return;
    // ユーザーがまだ微調整を触っていない場合は自動再描画しない
    if (!hasUserAdjustedDesignTweaksRef.current) return;

    if (autoRegenTimeoutRef.current) {
      clearTimeout(autoRegenTimeoutRef.current);
    }

    autoRegenTimeoutRef.current = setTimeout(() => {
      // スライダー連続操作中に前回の再描画がまだ終わっている場合はスキップ
      if (!isRegenerating) {
        handleRegenerateImages();
      }
    }, 700);

    return () => {
      if (autoRegenTimeoutRef.current) {
        clearTimeout(autoRegenTimeoutRef.current);
      }
    };
  }, [designTweaks, jobId, result, isRegenerating]);

  // 生成結果に合わせて編集フォームを同期
  useEffect(() => {
    if (result) {
      setEditableSlides({
        slide1: result.slide1.filter(Boolean).join('\n') || result.slide1[0] || '',
        slide2: result.slide2.filter(Boolean).join('\n') || result.slide2[0] || '',
        slide3: result.slide3.filter(Boolean).join('\n') || result.slide3[0] || '',
        caption: result.caption,
      });
      // 新しい結果が来たタイミングでは自動再描画フラグをリセット
      hasUserAdjustedDesignTweaksRef.current = false;
      setDesignTweaks(createDefaultTweaks);
      setRegenMessage(null);
    }
  }, [result]);

  // localStorageから設定を読み込み
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const settings = JSON.parse(saved);
        const context = formatKnowledgeForLLM(settings.knowledge);
        setClientContext(context);
        setLogoImage(settings.logoImage || null);
        
        // デザイン名とプレビューを取得
        if (settings.designs) {
          const names: { [key: number]: string } = {};
          const previews: { [key: number]: any } = {};
          
          names[1] = settings.designs.design1?.name || 'デザイン 1';
          names[2] = settings.designs.design2?.name || 'デザイン 2';
          names[3] = settings.designs.design3?.name || 'デザイン 3';
          
          previews[1] = settings.designs.design1;
          previews[2] = settings.designs.design2;
          previews[3] = settings.designs.design3;
          
          setDesignNames(names);
          setDesignPreviews(previews);
          
          // デザインテンプレートを取得
          if (designNumber) {
            const designKey = `design${designNumber}` as 'design1' | 'design2' | 'design3';
            setCustomDesign(settings.designs[designKey]);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }, [designNumber]);

  // 写真選択ハンドラー
  const handlePhotoSelect = useCallback((index: number, file: File | null) => {
    const newPhotos = [...photos];
    newPhotos[index] = file;
    setPhotos(newPhotos);
    
    // プレビュー生成
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newPreviews = [...photoPreviews];
        newPreviews[index] = e.target?.result as string;
        setPhotoPreviews(newPreviews);
      };
      reader.readAsDataURL(file);
    } else {
      const newPreviews = [...photoPreviews];
      newPreviews[index] = null;
      setPhotoPreviews(newPreviews);
    }
  }, [photos, photoPreviews]);

  // ファイルを圧縮してBase64に変換
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Canvasで圧縮
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1920;
          const MAX_HEIGHT = 1920;
          let width = img.width;
          let height = img.height;
          
          // アスペクト比を保ちながらリサイズ
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // JPEG形式で圧縮（品質70%）
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // 生成実行
  const handleGenerate = async () => {
    setError(null);
    setResult(null);
    setNotionSaveSuccess(false);
    resetDesignTweaks();
    setRegenMessage(null);
    
    // バリデーション
    if (!surveyText.trim()) {
      setError('アンケート文を入力してください');
      return;
    }
    if (!mainTheme.trim()) {
      setError('一番伝えたいテーマを入力してください');
      return;
    }
    if (photos.some(p => !p)) {
      setError('写真を3枚すべてアップロードしてください');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // 写真をBase64に変換
      const photoBase64s = await Promise.all(
        photos.map(p => fileToBase64(p!))
      );
      
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notionPageUrl: notionUrl || '', // 任意
          surveyText,
          mainTheme, // 一番伝えたいテーマを追加
          designNumber,
          photos: photoBase64s,
          clientContext, // 設定から読み込んだナレッジを送信
          logoImage, // ロゴ画像を送信
          customDesign, // カスタムデザインを送信
        }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        setError(data.error || '生成に失敗しました');
        return;
      }
      
      setJobId(data.jobId);
      setResult({
        slide1: data.data.slide1,
        slide2: data.data.slide2,
        slide3: data.data.slide3,
        caption: data.data.caption,
        images: data.data.images,
      });
    } catch (err) {
      setError('エラーが発生しました。もう一度お試しください。');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Notion保存
  const handleSaveToNotion = async () => {
    if (!jobId) return;
    
    setIsSavingToNotion(true);
    setError(null);
    
    try {
      const response = await fetch('/api/notion/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        setError(data.error || 'Notion保存に失敗しました');
        return;
      }
      
      setNotionSaveSuccess(true);
    } catch (err) {
      setError('Notion保存中にエラーが発生しました');
      console.error(err);
    } finally {
      setIsSavingToNotion(false);
    }
  };

  // 画像ダウンロード
  const handleDownloadAll = async () => {
    if (!result?.images) return;
    
    for (let i = 0; i < result.images.length; i++) {
      const response = await fetch(result.images[i]);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `carousel_slide_${i + 1}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // リセット
  const handleReset = () => {
    setResult(null);
    setJobId(null);
    setNotionSaveSuccess(false);
    setError(null);
    setEditableSlides({ slide1: '', slide2: '', slide3: '', caption: '' });
    resetDesignTweaks();
    setRegenMessage(null);
  };

  return (
    <div className="min-h-screen">
      {/* ヘッダー */}
      <header className="app-header sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background: 'linear-gradient(135deg, #ec4899, #3b82f6)'}}>
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-extrabold gradient-text">
                Instagram Carousel Generator
              </h1>
              <p className="text-xs text-[var(--text-light)]">採用Instagram投稿を自動生成</p>
            </div>
          </div>
          <Link href="/settings" className="btn-secondary text-sm">
            ⚙️ 設定
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {!result ? (
          /* 入力フォーム */
          <div className="animate-fade-in space-y-6">
            {/* NotionページURL */}
            <section className="card">
              <div className="section-header">
                <span className="section-number">1</span>
                <h2 className="section-title">NotionページURL</h2>
              </div>
              <input
                type="url"
                className="input-field"
                placeholder="https://www.notion.so/hoap-inc/..."
                value={notionUrl}
                onChange={(e) => setNotionUrl(e.target.value)}
              />
              <p className="text-sm text-[var(--text-light)] mt-2">
                Instagram進行管理DBの該当レコードのURLを貼り付けてください
              </p>
            </section>

            {/* アンケート文 */}
            <section className="card">
              <div className="section-header">
                <span className="section-number">2</span>
                <h2 className="section-title">アンケート文</h2>
              </div>
              <textarea
                className="textarea-field"
                placeholder="Googleフォームの回答をここにコピペしてください..."
                value={surveyText}
                onChange={(e) => setSurveyText(e.target.value)}
              />
              <p className="text-sm text-[var(--text-light)] mt-2">
                スタッフインタビューのアンケート回答全文を入力
              </p>
            </section>

            {/* 一番伝えたいテーマ */}
            <section className="card">
              <div className="section-header">
                <span className="section-number">3</span>
                <h2 className="section-title">この投稿で一番伝えたいテーマ</h2>
              </div>
              <input
                type="text"
                className="input-field"
                placeholder="例：チームワークの良さ、働きやすい環境、スタッフの成長..."
                value={mainTheme}
                onChange={(e) => setMainTheme(e.target.value)}
              />
              <p className="text-sm text-[var(--text-light)] mt-2">
                このコンテンツで最も強調したいポイントを一言で入力してください
              </p>
            </section>

            {/* 写真アップロード */}
            <section className="card">
              <div className="section-header">
                <span className="section-number">4</span>
                <h2 className="section-title">写真アップロード（3枚）</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[0, 1, 2].map((index) => (
                  <div key={index}>
                    <input
                      type="file"
                      accept="image/*"
                      ref={(el) => { fileInputRefs.current[index] = el; }}
                      className="hidden"
                      onChange={(e) => handlePhotoSelect(index, e.target.files?.[0] || null)}
                    />
                    <div
                      className={`file-upload ${photoPreviews[index] ? 'has-file' : ''}`}
                      onClick={() => fileInputRefs.current[index]?.click()}
                    >
                      {photoPreviews[index] ? (
                        <img
                          src={photoPreviews[index]!}
                          alt={`Photo ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      ) : (
                        <>
                          <svg className="w-8 h-8 text-[var(--accent-purple)] mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <span className="text-sm text-[var(--text-light)]">写真 {index + 1}</span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-center text-[var(--text-light)] mt-2">
                      {index === 0 && '1枚目（タイトル用）'}
                      {index === 1 && '2枚目（中間）'}
                      {index === 2 && '3枚目（締め）'}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* デザイン選択 */}
            <section className="card">
              <div className="section-header">
                <span className="section-number">5</span>
                <h2 className="section-title">デザイン選択</h2>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map((num) => (
                  <label key={num} className="cursor-pointer">
                    <input
                      type="radio"
                      name="design"
                      value={num}
                      checked={designNumber === num}
                      onChange={() => setDesignNumber(num as DesignNumber)}
                      className="design-radio"
                    />
                    <div className={`design-label ${designNumber === num ? 'border-transparent' : ''}`}
                      style={designNumber === num ? {
                        backgroundClip: 'padding-box, border-box',
                        backgroundOrigin: 'border-box',
                        backgroundImage: 'linear-gradient(white, white), linear-gradient(90deg, #ec4899, #8b5cf6, #3b82f6)',
                        border: '2px solid transparent'
                      } : {}}>
                      <div 
                        className="w-16 h-16 rounded-lg mb-2 relative overflow-hidden"
                        style={
                          designPreviews[num]?.backgroundImage
                            ? {
                                backgroundImage: `url(${designPreviews[num].backgroundImage})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                              }
                            : {
                                background: designPreviews[num]
                                  ? `linear-gradient(135deg, ${designPreviews[num].primaryColor} 0%, ${designPreviews[num].accentColor} 100%)`
                                  : num === 1 
                                  ? 'linear-gradient(135deg, #00D4FF 0%, #FF69B4 100%)'
                                  : num === 2
                                  ? 'linear-gradient(135deg, #FFB6C1 0%, #87CEEB 100%)'
                                  : 'linear-gradient(135deg, #FFD700 0%, #808080 100%)'
                              }
                        }
                      />
                      <span className="font-semibold text-[var(--text)]">{designNames[num]}</span>
                    </div>
                  </label>
                ))}
              </div>
            </section>

            {/* エラー表示 */}
            {error && (
              <div className="alert-error">
                ⚠️ {error}
              </div>
            )}

            {/* 生成ボタン */}
            <button
              className="btn-primary w-full py-4 text-lg"
              onClick={handleGenerate}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="loading-spinner w-5 h-5" />
                  生成中...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  カルーセル画像を生成
                </>
              )}
            </button>
          </div>
        ) : (
          /* 結果プレビュー */
          <div className="animate-fade-in space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-extrabold gradient-text">生成結果</h2>
              <button className="btn-secondary" onClick={handleReset}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                新規作成
              </button>
            </div>

            {/* 画像プレビュー & デザイン微調整（スライドごとに横並び） */}
            <section className="card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-[var(--text)]">カルーセル画像 & デザイン微調整</h3>
                  <p className="text-xs text-[var(--text-light)]">
                    各スライドごとに、画像を見ながらテキストサイズ・人物位置・テキスト位置を調整できます。
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="btn-secondary text-sm" onClick={resetDesignTweaks}>
                    リセット
                  </button>
                  <button
                    className="btn-primary text-sm"
                    onClick={handleRegenerateImages}
                    disabled={isRegenerating}
                  >
                    {isRegenerating ? (
                      <>
                        <div className="loading-spinner w-4 h-4" />
                        再描画中...
                      </>
                    ) : (
                      '画像を再描画'
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                {result.images.map((url, index) => {
                  const tweak = designTweaks[index];
                  return (
                    <div
                      key={index}
                      className="bg-[var(--bg-via)] rounded-lg p-4 md:grid md:grid-cols-2 gap-4 items-start"
                    >
                      <div className="relative mb-4 md:mb-0">
                        <img
                          src={url}
                          alt={`Slide ${index + 1}`}
                          className="preview-image w-full object-cover"
                          style={{ aspectRatio: '1080 / 1350' }}
                        />
                        <span className="absolute top-2 left-2 badge">
                          {index + 1}枚目
                        </span>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-[var(--text)]">{index + 1}枚目の微調整</span>
                        </div>
                        <div>
                          <label className="text-xs text-[var(--text-light)]">人物配置</label>
                          <select
                            className="input-field mt-1"
                            value={tweak.personPosition}
                            onChange={(e) =>
                              handleDesignTweakChange(index, 'personPosition', e.target.value as PositionOption)
                            }
                          >
                            {(['auto', 'left', 'center', 'right'] as PositionOption[]).map((option) => (
                              <option key={option} value={option}>
                                {option === 'auto'
                                  ? '自動'
                                  : option === 'left'
                                  ? '左寄せ'
                                  : option === 'right'
                                  ? '右寄せ'
                                  : '中央'}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-[var(--text-light)]">テキスト配置</label>
                          <select
                            className="input-field mt-1"
                            value={tweak.textPosition}
                            onChange={(e) =>
                              handleDesignTweakChange(index, 'textPosition', e.target.value as TextPositionOption)
                            }
                          >
                            {([
                              'auto',
                              'top-left',
                              'top-right',
                              'bottom-left',
                              'bottom-right',
                              'center',
                            ] as TextPositionOption[]).map((option) => (
                              <option key={option} value={option}>
                                {option === 'auto' ? '自動' : option}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-[var(--text-light)]">
                            テキストサイズ倍率: {tweak.fontScale.toFixed(2)}x
                          </label>
                          <input
                            type="range"
                            min={0.7}
                            max={1.4}
                            step={0.02}
                            value={tweak.fontScale}
                            onChange={(e) =>
                              handleDesignTweakChange(index, 'fontScale', parseFloat(e.target.value))
                            }
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-[var(--text-light)]">
                            人物 横位置微調整: {tweak.offsetX}px
                          </label>
                          <input
                            type="range"
                            min={-200}
                            max={200}
                            step={5}
                            value={tweak.offsetX}
                            onChange={(e) =>
                              handleDesignTweakChange(index, 'offsetX', parseInt(e.target.value))
                            }
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-[var(--text-light)]">
                            人物 縦位置微調整: {tweak.offsetY}px
                          </label>
                          <input
                            type="range"
                            min={-80}
                            max={80}
                            step={5}
                            value={tweak.offsetY}
                            onChange={(e) =>
                              handleDesignTweakChange(index, 'offsetY', parseInt(e.target.value))
                            }
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {regenMessage && (
                <p className="text-sm text-green-500 mt-4">{regenMessage}</p>
              )}
            </section>

            {/* テキストプレビュー */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: '1枚目テキスト', lines: result.slide1 },
                { title: '2枚目テキスト', lines: result.slide2 },
                { title: '3枚目テキスト', lines: result.slide3 },
              ].map((slide, index) => (
                <section key={index} className="card">
                  <h3 className="font-semibold mb-2 text-[var(--text)]">{slide.title}</h3>
                  <div className="bg-[var(--bg-via)] rounded-lg p-3 text-sm">
                    {slide.lines.map((line, i) => (
                      <p key={i} className="text-[var(--text)]">{line}</p>
                    ))}
                  </div>
                  <p className="text-xs text-[var(--text-light)] mt-2">
                    {slide.lines.join('').length}文字
                  </p>
                </section>
              ))}
        </div>

            {/* キャプション */}
            <section className="card">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-[var(--text)]">キャプション</h3>
                <button
                  className="text-sm text-[var(--accent-purple)] hover:underline font-medium"
                  onClick={() => navigator.clipboard.writeText(result.caption)}
                >
                  📋 コピー
                </button>
              </div>
              <div className="bg-[var(--bg-via)] rounded-lg p-4 text-sm whitespace-pre-wrap max-h-64 overflow-y-auto text-[var(--text)]">
                {result.caption}
              </div>
            </section>

            {/* コンテンツ修正フォーム */}
            <section className="card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-[var(--text)]">コンテンツ内容を修正</h3>
                  <p className="text-xs text-[var(--text-light)]">テキストを編集して即座に反映できます</p>
                </div>
                <button className="btn-secondary text-sm" onClick={handleApplyTextEdits}>
                  テキストに反映
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['slide1', 'slide2', 'slide3'] as SlideKey[]).map((key, index) => (
                  <div key={key}>
                    <label className="block text-sm font-semibold mb-2 text-[var(--text)]">
                      {index + 1}枚目テキスト
                    </label>
                    <textarea
                      className="textarea-field min-h-[140px]"
                      value={editableSlides[key]}
                      onChange={(e) => handleSlideTextChange(key, e.target.value)}
                      placeholder="テキストを編集してください"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <label className="block text-sm font-semibold mb-2 text-[var(--text)]">キャプション</label>
                <textarea
                  className="textarea-field min-h-[120px]"
                  value={editableSlides.caption}
                  onChange={(e) => handleCaptionChange(e.target.value)}
                  placeholder="投稿文を編集してください"
                />
              </div>
            </section>


            {/* エラー表示 */}
            {error && (
              <div className="alert-error">
                ⚠️ {error}
              </div>
            )}

            {/* 成功メッセージ */}
            {notionSaveSuccess && (
              <div className="alert-success">
                ✅ Notionに保存しました
              </div>
            )}

            {/* アクションボタン */}
            <div className="flex gap-4">
              <button
                className="btn-primary flex-1"
                onClick={handleSaveToNotion}
                disabled={isSavingToNotion || notionSaveSuccess}
              >
                {isSavingToNotion ? (
                  <>
                    <div className="loading-spinner w-5 h-5" />
                    保存中...
                  </>
                ) : notionSaveSuccess ? (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    保存完了
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Notionに反映
                  </>
                )}
              </button>
              <button className="btn-secondary flex-1" onClick={handleDownloadAll}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                3枚まとめてダウンロード
              </button>
            </div>
        </div>
        )}
      </main>

      {/* フッター */}
      <footer className="app-footer mt-16">
        <div className="max-w-4xl mx-auto px-6 py-6 text-center text-sm text-[var(--text-light)]">
          <p>© 2025 HOAP Inc. - Instagram Carousel Generator</p>
        </div>
      </footer>
    </div>
  );
}
