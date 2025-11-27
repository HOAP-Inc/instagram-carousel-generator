// Instagramカルーセル自動生成アプリ - ストレージ（MVP: インメモリ + ファイルシステム）

import { GenerationJob, DesignNumber, LLMResponse, JobStatus } from './types';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

// インメモリストレージ（MVP用、本番ではDBを使用）
const jobStore = new Map<string, GenerationJob>();

// 一時ファイル保存ディレクトリ
const TEMP_DIR = path.join(process.cwd(), 'tmp', 'uploads');
const OUTPUT_DIR = path.join(process.cwd(), 'tmp', 'outputs');

/**
 * ディレクトリを確保
 */
async function ensureDir(dir: string): Promise<void> {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

/**
 * 新しいジョブを作成
 */
export async function createJob(
  notionPageId: string,
  notionPageUrl: string,
  surveyText: string,
  designNumber: DesignNumber
): Promise<GenerationJob> {
  const id = uuidv4();
  const now = new Date().toISOString();
  
  const job: GenerationJob = {
    id,
    notionPageId,
    notionPageUrl,
    surveyText,
    photosPaths: ['', '', ''],
    designNumber,
    llmResponseJson: null,
    outputPngPaths: null,
    outputPngUrls: null,
    status: 'pending',
    errorMessage: null,
    createdAt: now,
    updatedAt: now,
  };
  
  jobStore.set(id, job);
  return job;
}

/**
 * ジョブを取得
 */
export function getJob(jobId: string): GenerationJob | null {
  return jobStore.get(jobId) || null;
}

/**
 * ジョブを更新
 */
export function updateJob(jobId: string, updates: Partial<GenerationJob>): GenerationJob | null {
  const job = jobStore.get(jobId);
  if (!job) return null;
  
  const updatedJob = {
    ...job,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  jobStore.set(jobId, updatedJob);
  return updatedJob;
}

/**
 * 写真を保存
 */
export async function savePhoto(
  jobId: string,
  photoIndex: 0 | 1 | 2,
  base64Data: string
): Promise<string> {
  await ensureDir(TEMP_DIR);
  
  // Base64データからファイルを作成
  const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Content, 'base64');
  
  const filename = `${jobId}_photo_${photoIndex + 1}.png`;
  const filepath = path.join(TEMP_DIR, filename);
  
  await fs.writeFile(filepath, buffer);
  
  return filepath;
}

/**
 * 出力画像を保存
 */
export async function saveOutputImage(
  jobId: string,
  slideIndex: 0 | 1 | 2,
  buffer: Buffer
): Promise<{ path: string; url: string }> {
  await ensureDir(OUTPUT_DIR);
  
  const filename = `${jobId}_slide_${slideIndex + 1}.png`;
  const filepath = path.join(OUTPUT_DIR, filename);
  
  await fs.writeFile(filepath, buffer);
  
  // クライアント用URL
  const url = `/api/images/${jobId}/${slideIndex + 1}`;
  
  return { path: filepath, url };
}

/**
 * 画像ファイルを読み込み
 */
export async function readImageFile(filepath: string): Promise<Buffer> {
  return await fs.readFile(filepath);
}

/**
 * 出力画像を取得
 */
export async function getOutputImage(jobId: string, slideNumber: 1 | 2 | 3): Promise<Buffer | null> {
  const filename = `${jobId}_slide_${slideNumber}.png`;
  const filepath = path.join(OUTPUT_DIR, filename);
  
  try {
    return await fs.readFile(filepath);
  } catch {
    return null;
  }
}

/**
 * ジョブ一覧を取得（最新順）
 */
export function listJobs(limit: number = 50): GenerationJob[] {
  const jobs = Array.from(jobStore.values());
  return jobs
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

/**
 * 古いジョブとファイルをクリーンアップ（24時間以上前）
 */
export async function cleanupOldJobs(): Promise<void> {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  
  for (const [jobId, job] of jobStore.entries()) {
    if (new Date(job.createdAt).getTime() < cutoff) {
      // ファイルを削除
      if (job.photosPaths) {
        for (const photoPath of job.photosPaths) {
          if (photoPath) {
            try {
              await fs.unlink(photoPath);
            } catch {}
          }
        }
      }
      
      if (job.outputPngPaths) {
        for (const outputPath of job.outputPngPaths) {
          if (outputPath) {
            try {
              await fs.unlink(outputPath);
            } catch {}
          }
        }
      }
      
      // ジョブを削除
      jobStore.delete(jobId);
    }
  }
}

