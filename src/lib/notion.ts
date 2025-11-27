// Instagramカルーセル自動生成アプリ - Notion API連携

import { Client } from '@notionhq/client';
import { formatNotionPageId } from './validation';
import { NOTION_CONFIG } from './constants';

// Notion クライアントを遅延初期化（ビルド時のエラー回避）
let notion: Client | null = null;

function getNotionClient(): Client {
  if (!notion) {
    notion = new Client({
      auth: process.env.NOTION_API_KEY,
    });
  }
  return notion;
}

/**
 * Notionページの存在確認とプロパティチェック
 */
export async function verifyNotionPage(pageId: string): Promise<{
  success: boolean;
  error?: string;
  missingProperties?: string[];
}> {
  try {
    const formattedId = formatNotionPageId(pageId);
    const page = await getNotionClient().pages.retrieve({ page_id: formattedId });
    
    if (!page || !('properties' in page)) {
      return {
        success: false,
        error: 'ページが見つかりません',
      };
    }
    
    // 必要なプロパティの存在チェック
    const properties = page.properties;
    const requiredProps = [
      NOTION_CONFIG.propertyNames.title,
      NOTION_CONFIG.propertyNames.slide2,
      NOTION_CONFIG.propertyNames.slide3,
      NOTION_CONFIG.propertyNames.caption,
    ];
    
    const missingProperties = requiredProps.filter(
      prop => !properties[prop]
    );
    
    if (missingProperties.length > 0) {
      return {
        success: false,
        error: 'プロパティが不足しています',
        missingProperties,
      };
    }
    
    return { success: true };
  } catch (error: unknown) {
    console.error('Notion page verification error:', error);
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    return {
      success: false,
      error: `Notionページの取得に失敗しました: ${errorMessage}`,
    };
  }
}

/**
 * Notionページにコンテンツを書き込み
 */
export async function writeToNotionPage(
  pageId: string,
  content: {
    title: string;
    slide2Text: string;
    slide3Text: string;
    caption: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const formattedId = formatNotionPageId(pageId);
    
    // プロパティを更新
    await getNotionClient().pages.update({
      page_id: formattedId,
      properties: {
        [NOTION_CONFIG.propertyNames.title]: {
          title: [
            {
              type: 'text',
              text: { content: content.title },
            },
          ],
        },
        [NOTION_CONFIG.propertyNames.slide2]: {
          rich_text: [
            {
              type: 'text',
              text: { content: content.slide2Text },
            },
          ],
        },
        [NOTION_CONFIG.propertyNames.slide3]: {
          rich_text: [
            {
              type: 'text',
              text: { content: content.slide3Text },
            },
          ],
        },
        [NOTION_CONFIG.propertyNames.caption]: {
          rich_text: [
            {
              type: 'text',
              text: { content: content.caption },
            },
          ],
        },
      },
    });
    
    return { success: true };
  } catch (error: unknown) {
    console.error('Notion write error:', error);
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    return {
      success: false,
      error: `Notionへの書き込みに失敗しました: ${errorMessage}`,
    };
  }
}

/**
 * Notionページに画像ファイルを添付
 * 注意: Notion APIは直接ファイルアップロードをサポートしていないため、
 * 外部URLを使用するか、別のストレージサービスを経由する必要があります。
 */
export async function attachImagesToNotionPage(
  pageId: string,
  imageUrls: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const formattedId = formatNotionPageId(pageId);
    
    // Media & Filesプロパティに外部URLを設定
    // 注意: この機能はNotion APIの制限により、外部URLのみサポート
    await getNotionClient().pages.update({
      page_id: formattedId,
      properties: {
        [NOTION_CONFIG.propertyNames.mediaFiles]: {
          files: imageUrls.map((url, index) => ({
            type: 'external' as const,
            name: `carousel_${index + 1}.png`,
            external: { url },
          })),
        },
      },
    });
    
    return { success: true };
  } catch (error: unknown) {
    console.error('Notion image attach error:', error);
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    return {
      success: false,
      error: `画像の添付に失敗しました: ${errorMessage}`,
    };
  }
}

/**
 * Notionページの全内容を更新
 */
export async function updateNotionPageFull(
  pageId: string,
  content: {
    title: string;
    slide2Text: string;
    slide3Text: string;
    caption: string;
  },
  imageUrls?: string[]
): Promise<{ success: boolean; error?: string }> {
  // テキストコンテンツを更新
  const writeResult = await writeToNotionPage(pageId, content);
  if (!writeResult.success) {
    return writeResult;
  }
  
  // 画像URLがある場合は添付
  if (imageUrls && imageUrls.length > 0) {
    const attachResult = await attachImagesToNotionPage(pageId, imageUrls);
    if (!attachResult.success) {
      return {
        success: false,
        error: `テキストは保存されましたが、${attachResult.error}`,
      };
    }
  }
  
  return { success: true };
}

