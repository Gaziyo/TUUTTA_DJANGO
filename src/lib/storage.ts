import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { logger } from './logger';
import { FileUpload } from '../types';
import { extractTextFromFile } from './fileProcessor';

export async function uploadFile(
  file: File,
  userId: string,
  storagePath?: string
): Promise<FileUpload> {
  try {
    // Create a unique file path including user ID using Firebase Storage
    const timestamp = Date.now();
    const filePath = storagePath || `files/${userId}/${timestamp}_${file.name}`;
    const storageRef = ref(storage, filePath);

    // Upload file to Firebase Storage
    const snapshot = await uploadBytes(storageRef, file);

    // Get the file URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    // Create FileUpload object
    // Note: content is now the URL, not the base64 string
    const fileObj: FileUpload = {
      id: timestamp.toString(),
      name: file.name,
      type: file.type,
      content: downloadURL,
      size: file.size,
      extractedText: ''
    };

    // Extract text content if possible
    // For text extraction, we still might need the file content. 
    // Since we have the file object here, we can try to extract locally before returning.
    try {
      // We pass a temporary object with base64 for extraction to work seamlessly with existing logic
      // OR better, we refactor extractTextFromFile to accept File object if that's what it needs.
      // Looking at fileProcessor.ts, it expects base64 in 'content'. 
      // Let's quickly convert to base64 just for extraction purposes locally.
      const base64Content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const tempFileObj = { ...fileObj, content: base64Content };
      fileObj.extractedText = await extractTextFromFile(tempFileObj);

    } catch (error) {
      logger.warn('Text extraction failed:', error);
      fileObj.extractedText = `[Text extraction unavailable for ${file.name}]`;
    }

    return fileObj;
  } catch (error) {
    console.error('File upload error:', error);
    throw error;
  }
}

export async function deleteFile(fileUrl: string): Promise<void> {
  try {
    // Basic attempt to extract path from URL or assuming we store paths. 
    // The previous implementation stored "storage_path".
    // If we only have URL, we might need to parse it or change how we store files to include the Ref path.
    // For Firebase Storage URLs, we can create a ref from the URL.
    const fileRef = ref(storage, fileUrl);
    await deleteObject(fileRef);
  } catch (error) {
    console.error('File deletion error:', error);
    throw error;
  }
}
