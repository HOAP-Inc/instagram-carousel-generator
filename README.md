# Instagram カルーセル自動生成アプリ

アンケート文と写真3枚を入力するだけで、Instagram投稿用のカルーセル画像とキャプションを自動生成するツールです。

## 機能

- ✅ アンケート文からLLM（GPT-4o）でコンテンツ生成
- ✅ 写真3枚と生成テキストを合成して画像生成
- ✅ 3種類のデザインテーマから選択可能
- ✅ Notion APIで指定ページに自動反映
- ✅ 画像のダウンロード機能

## セットアップ

### 1. 依存関係のインストール

```bash
cd instagram-carousel-generator
npm install
```

### 2. 環境変数の設定

`.env.local`ファイルを作成し、以下の環境変数を設定してください：

```bash
# OpenAI API Key
OPENAI_API_KEY=sk-your-api-key-here

# Notion API Key (Integration Token)
NOTION_API_KEY=secret_your-notion-key-here
```

#### OpenAI API Keyの取得

1. [OpenAI Platform](https://platform.openai.com/api-keys)にアクセス
2. 新しいAPI Keyを作成

#### Notion API Keyの取得

1. [Notion Integrations](https://www.notion.so/my-integrations)にアクセス
2. 新しいIntegrationを作成
3. Integration Tokenをコピー
4. 対象のNotionページで、Integrationに接続を許可

### 3. フォントファイルの配置（オプション）

カスタムフォントを使用する場合は、以下のフォントファイルを `public/fonts/` ディレクトリに配置してください：

- **けいおんフォント**: `K8x12S.ttf`（一般的なファイル名）
- **HGゴシック**: `HGGothicE.ttf`（一般的なファイル名）
- **花鳥風月**: `KachouFuugetsu.ttf`（一般的なファイル名）

**注意**: 実際のフォントファイル名が異なる場合は、`src/lib/image-generator.ts` の `registerCustomFont` 関数内のファイル名を実際のファイル名に変更してください。

### 4. 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000)でアプリにアクセスできます。

## 使い方

### 1. NotionページURLを入力

Instagram進行管理DBの該当レコードのURLを貼り付けます。

### 2. アンケート文を入力

Googleフォームの回答内容をコピー＆ペーストします。

### 3. 写真を3枚アップロード

- 1枚目：タイトル用（インパクトのある写真）
- 2枚目：中間用
- 3枚目：締め用

### 4. デザインを選択

3種類のデザインテーマから選択：
- デザイン①：シアン＆マゼンタ（ポップ）
- デザイン②：ピンク＆ブルー（柔らかい）
- デザイン③：イエロー＆グレー（落ち着いた）

### 5. 生成ボタンをクリック

LLMがテキストを生成し、画像が自動合成されます。

### 6. 結果を確認して保存

- 「Notionに反映」：Notionページにテキストを保存
- 「3枚まとめてダウンロード」：画像をローカルに保存

## Notionプロパティ設定

対象のNotionデータベースには以下のプロパティが必要です：

| プロパティ名 | タイプ | 用途 |
|------------|-------|------|
| タイトル | Title | 1枚目テキスト |
| 2枚目 | Text | 2枚目テキスト |
| 3枚目 | Text | 3枚目テキスト |
| 投稿文 | Text | キャプション |
| Media & Files | Files & media | 生成画像 |

## 文字数ルール

LLMは以下の文字数制限を守ってテキストを生成します：

- 1枚目：30〜35文字
- 2枚目：70〜75文字
- 3枚目：70〜75文字

## 技術スタック

- **フロントエンド**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **バックエンド**: Next.js API Routes
- **LLM**: OpenAI GPT-4o
- **画像生成**: node-canvas
- **Notion連携**: @notionhq/client

## ディレクトリ構造

```
instagram-carousel-generator/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── generate/          # コンテンツ生成API
│   │   │   ├── images/            # 画像配信API
│   │   │   ├── job/               # ジョブステータスAPI
│   │   │   └── notion/            # Notion保存API
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx               # メイン画面
│   └── lib/
│       ├── constants.ts           # 定数定義
│       ├── image-generator.ts     # 画像生成
│       ├── llm.ts                 # LLM連携
│       ├── notion.ts              # Notion API
│       ├── prompts.ts             # プロンプト
│       ├── storage.ts             # ストレージ
│       ├── types.ts               # 型定義
│       └── validation.ts          # バリデーション
├── tmp/                           # 一時ファイル（git管理外）
├── public/
│   ├── fonts/                     # フォントファイル
│   │   ├── NotoSansJP-Bold.otf   # デフォルトフォント（必須）
│   │   ├── K8x12S.ttf            # けいおんフォント（オプション）
│   │   ├── HGGothicE.ttf         # HGゴシック（オプション）
│   │   └── KachouFuugetsu.ttf    # 花鳥風月（オプション）
│   └── backgrounds/               # 背景パターン画像
└── README.md
```

## 将来の拡張予定

- [ ] スプレッドシートからの自動取込
- [ ] Notion新規レコード作成
- [ ] 顧客PDFからの知識抽出
- [ ] 外部販売用テナント管理
- [ ] 管理画面（禁止語、フォント、背景パターン設定）

## ライセンス

© 2024 HOAP Inc. All rights reserved.
