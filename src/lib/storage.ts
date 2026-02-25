/**
 * Storage Service
 *
 * Firebase Storage removed. Files are processed locally (base64 / extracted text).
 * A future phase will add Django file upload endpoints.
 */

import { logger } from './logger';
import type { FileUpload } from '../types';
import { extractTextFromFile } from './fileProcessor';

export async function uploadFile(
  file: File,
  _userId: string,
  _storagePath?: string
): Promise<FileUpload> {
  const timestamp = Date.now();

  // Read file as base64 data URL for local storage
  const content = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const fileObj: FileUpload = {
    id: timestamp.toString(),
    name: file.name,
    type: file.type,
    content,
    size: file.size,
    extractedText: '',
    timestamp,
  };

  // Extract text content for non-image files
  try {
    fileObj.extractedText = await extractTextFromFile(fileObj);
  } catch (error) {
    logger.warn('Text extraction failed:', error);
    fileObj.extractedText = `[Text extraction unavailable for ${file.name}]`;
  }

  return fileObj;
}

export async function deleteFile(_fileUrl: string): Promise<void> {
  // No remote storage to delete from — file lives in local Zustand state only.
}
