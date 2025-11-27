'use client';

import { useState, useRef, useCallback } from 'react';
import { DesignNumber, LLMResponse } from '@/lib/types';

interface GenerationResult {
  slide1: [string, string];
  slide2: [string, string];
  slide3: [string, string];
  caption: string;
  images: [string, string, string];
}

export default function Home() {
  // フォーム状態
  const [notionUrl, setNotionUrl] = useState('');
  const [surveyText, setSurveyText] = useState('');
  const [designNumber, setDesignNumber] = useState<DesignNumber>(1);
  const [photos, setPhotos] = useState<(File | null)[]>([null, null, null]);
  const [photoPreviews, setPhotoPreviews] = useState<(string | null)[]>([null, null, null]);
  
  // 生成状態
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  
  // Notion保存状態
  const [isSavingToNotion, setIsSavingToNotion] = useState(false);
  const [notionSaveSuccess, setNotionSaveSuccess] = useState(false);
  
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null]);

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

  // ファイルをBase64に変換
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // 生成実行
  const handleGenerate = async () => {
    setError(null);
    setResult(null);
    setNotionSaveSuccess(false);
    
    // バリデーション
    if (!notionUrl.trim()) {
      setError('NotionページURLを入力してください');
      return;
    }
    if (!surveyText.trim()) {
      setError('アンケート文を入力してください');
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
          notionPageUrl: notionUrl,
          surveyText,
          designNumber,
          photos: photoBase64s,
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
  };

  return (
    <div className="gradient-bg min-h-screen">
      {/* ヘッダー */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-pink-500 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Instagram Carousel Generator
              </h1>
              <p className="text-xs text-gray-500">採用Instagram投稿を自動生成</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {!result ? (
          /* 入力フォーム */
          <div className="animate-fade-in space-y-8">
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
              <p className="text-sm text-gray-500 mt-2">
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
              <p className="text-sm text-gray-500 mt-2">
                スタッフインタビューのアンケート回答全文を入力
              </p>
            </section>

            {/* 写真アップロード */}
            <section className="card">
              <div className="section-header">
                <span className="section-number">3</span>
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
                          <svg className="w-8 h-8 text-gray-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <span className="text-sm text-gray-500">写真 {index + 1}</span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-center text-gray-500 mt-2">
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
                <span className="section-number">4</span>
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
                    <div className={`design-label ${designNumber === num ? 'border-[var(--accent)] bg-[rgba(99,102,241,0.1)]' : ''}`}>
                      <div 
                        className="w-16 h-16 rounded-lg mb-2"
                        style={{
                          background: num === 1 
                            ? 'linear-gradient(135deg, #00D4FF 0%, #FF69B4 100%)'
                            : num === 2
                            ? 'linear-gradient(135deg, #FFB6C1 0%, #87CEEB 100%)'
                            : 'linear-gradient(135deg, #FFD700 0%, #808080 100%)'
                        }}
                      />
                      <span className="font-medium">デザイン {num}</span>
                      <span className="text-xs text-gray-500">
                        {num === 1 && 'シアン＆マゼンタ'}
                        {num === 2 && 'ピンク＆ブルー'}
                        {num === 3 && 'イエロー＆グレー'}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </section>

            {/* エラー表示 */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
                {error}
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
          <div className="animate-fade-in space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">生成結果</h2>
              <button className="btn-secondary" onClick={handleReset}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                新規作成
              </button>
            </div>

            {/* 画像プレビュー */}
            <section className="card">
              <h3 className="font-semibold mb-4">カルーセル画像</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {result.images.map((url, index) => (
                  <div key={index} className="relative">
                    <img
                      src={url}
                      alt={`Slide ${index + 1}`}
                      className="preview-image w-full aspect-square object-cover"
                    />
                    <span className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {index + 1}枚目
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* テキストプレビュー */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: '1枚目テキスト', lines: result.slide1 },
                { title: '2枚目テキスト', lines: result.slide2 },
                { title: '3枚目テキスト', lines: result.slide3 },
              ].map((slide, index) => (
                <section key={index} className="card">
                  <h3 className="font-semibold mb-2">{slide.title}</h3>
                  <div className="bg-[var(--background)] rounded-lg p-3 text-sm">
                    {slide.lines.map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {slide.lines.join('').length}文字
                  </p>
                </section>
              ))}
            </div>

            {/* キャプション */}
            <section className="card">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">キャプション</h3>
                <button
                  className="text-sm text-[var(--accent)] hover:underline"
                  onClick={() => navigator.clipboard.writeText(result.caption)}
                >
                  コピー
                </button>
              </div>
              <div className="bg-[var(--background)] rounded-lg p-4 text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
                {result.caption}
              </div>
            </section>

            {/* エラー表示 */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
                {error}
              </div>
            )}

            {/* 成功メッセージ */}
            {notionSaveSuccess && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-green-400">
                ✓ Notionに保存しました
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
      <footer className="border-t border-[var(--border)] mt-16">
        <div className="max-w-6xl mx-auto px-6 py-6 text-center text-sm text-gray-500">
          <p>© 2024 HOAP Inc. - Instagram Carousel Generator</p>
        </div>
      </footer>
    </div>
  );
}
