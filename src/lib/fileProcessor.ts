import { FileUpload } from '../types';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { logger } from './logger';
// Import worker using Vite's ?url feature
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { createWorker } from 'tesseract.js';

let cachedPdfJs: any | null = null;
let pdfWorkerConfigured = false;

const loadPdfJs = async () => {
  if (cachedPdfJs) return cachedPdfJs;
  const isNode = typeof window === 'undefined' || typeof document === 'undefined';
  const pdfjsLib = isNode
    ? await import('pdfjs-dist/legacy/build/pdf')
    : await import('pdfjs-dist');

  if (!isNode && !pdfWorkerConfigured && (pdfjsLib as any).GlobalWorkerOptions) {
    (pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfWorkerSrc;
    pdfWorkerConfigured = true;
  }

  cachedPdfJs = pdfjsLib;
  return pdfjsLib;
};

export async function extractTextFromFile(file: FileUpload): Promise<string> {
  try {
    // If text is already extracted, return it
    if (file.extractedText) {
      return file.extractedText;
    }

    if (!file.content) {
      return `[Error Processing File: ${file.name}]\nFile content is undefined. Please ensure the file was uploaded correctly.`;
    }

    // Extract base64 content
    const base64Match = file.content.match(/^data:[^;]+;base64,(.+)$/);
    if (!base64Match) {
      return `[Error Processing File: ${file.name}]\nInvalid file content format.`;
    }

    const base64Content = base64Match[1];
    const binaryString = atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Process different file types
    switch (true) {
      // Word Documents
      case /\.(docx?|doc)$/i.test(file.name):
      case file.type.includes('word'):
      case file.type.includes('officedocument.wordprocessingml'): {
        try {
          const result = await mammoth.extractRawText({ arrayBuffer: bytes.buffer });
          if (!result.value.trim()) {
            throw new Error('No text content found in document');
          }
          return `[Document Content from ${file.name}]\n${result.value}`;
        } catch (error) {
          console.error('Word document processing error:', error);
          throw new Error(`Failed to process Word document: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // PDF Files
      case /\.pdf$/i.test(file.name):
      case file.type.includes('pdf'): {
        try {
          // Load PDF document
          const pdfjsLib = await loadPdfJs();
          const loadingTask = pdfjsLib.getDocument({ data: bytes.buffer });
          const pdf = await loadingTask.promise;

          // Extract text from all pages
          const textContent: string[] = [];
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const content = await page.getTextContent();
            if (content.items) {
              const pageText = content.items
                .map((item: any) => item.str || '')
                .join(' ');
              textContent.push(`[Page ${pageNum}]\n${pageText}`);
            }
          }

          const text = textContent.join('\n\n').trim();
          if (!text) {
            logger.debug(`No text found directly in ${file.name}, attempting OCR...`);
            // If no text is found, try OCR
            const worker = await createWorker('eng');
            const { data: { text: ocrText } } = await worker.recognize(bytes as any);
            await worker.terminate();

            if (!ocrText.trim()) {
              logger.debug(`OCR failed or found no text in ${file.name}.`);
              // Return a more specific message indicating potential scan/image nature
              return `[PDF: ${file.name}]\nThis PDF appears to be scanned or image-based, and text extraction (including OCR) failed or yielded no content. Please ensure the document contains selectable text or try a higher quality scan.`;
            }
            logger.debug(`OCR successful for ${file.name}.`);
            return `[OCR Content from ${file.name}]\n${ocrText}`;
          }
          logger.debug(`Direct text extraction successful for ${file.name}.`);
          return `[PDF Content from ${file.name}]\n${text}`;
        } catch (error) {
          console.error('PDF processing error:', error); // Keep detailed log
          // Provide more specific user-facing feedback based on common errors
          let userMessage = `Failed to process PDF: ${file.name}.`;
          if (error instanceof Error) {
            if (error.message.includes('PasswordException') || error.message.includes('password')) {
              userMessage += ' The file might be password protected.';
            } else if (error.message.includes('InvalidPDFException') || error.message.includes('format error')) {
              userMessage += ' The file might be corrupted or not a valid PDF.';
            } else if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
              userMessage += ' A network error occurred while loading necessary components. Please check your connection.';
            } else if (error.message.includes('worker')) {
              userMessage += ' Could not load necessary processing components. This might be due to network issues or Content Security Policy restrictions.'; // Hint at CSP
            } else {
              userMessage += ` Details: ${error.message}`; // Include original error message if unknown
            }
          } else {
            userMessage += ' An unknown error occurred.';
          }
          // Return the error message as content instead of throwing, so AI gets feedback
          return `[Error Processing PDF: ${file.name}]\n${userMessage}`;
        }
      }

      // Excel Files
      case /\.(xlsx?|xls|csv)$/i.test(file.name):
      case file.type.includes('spreadsheet'):
      case file.type.includes('excel'):
      case file.type.includes('csv'): {
        try {
          const workbook = XLSX.read(bytes.buffer, { type: 'array' });
          const textContent: string[] = [];

          workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const sheetText = XLSX.utils.sheet_to_txt(worksheet, { blankrows: false });
            if (sheetText.trim()) {
              textContent.push(`[Sheet: ${sheetName}]\n${sheetText}`);
            }
          });

          const text = textContent.join('\n\n');
          if (!text.trim()) {
            throw new Error('No text content found in spreadsheet');
          }
          return `[Spreadsheet Content from ${file.name}]\n${text}`;
        } catch (error) {
          console.error('Excel processing error:', error);
          throw new Error(`Failed to process spreadsheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Plain Text
      case /\.(txt|md|json|xml|html|css|js|ts|jsx|tsx)$/i.test(file.name):
      case file.type.includes('text'):
      case file.type.includes('application/json'):
      case file.type.includes('application/xml'): {
        try {
          const text = new TextDecoder('utf-8').decode(bytes);
          if (!text.trim()) {
            throw new Error('File appears to be empty');
          }
          return `[Text Content from ${file.name}]\n${text}`;
        } catch (error) {
          console.error('Text file processing error:', error);
          throw new Error(`Failed to read text file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // PowerPoint Files
      case /\.(pptx?|ppt)$/i.test(file.name):
      case file.type.includes('presentation'):
      case file.type.includes('powerpoint'): {
        try {
          // For PowerPoint, we'll extract text using mammoth as a fallback
          const result = await mammoth.extractRawText({ arrayBuffer: bytes.buffer });
          const text = result.value;
          if (!text.trim()) {
            return `[PowerPoint Presentation: ${file.name}]\nThis is a presentation file. Please ask specific questions about its content.`;
          }
          return `[Presentation Content from ${file.name}]\n${text}`;
        } catch (error) {
          console.error('PowerPoint processing error:', error);
          return `[PowerPoint Presentation: ${file.name}]\nThis is a presentation file. Please ask specific questions about its content.`;
        }
      }

      // Images
      case file.type.startsWith('image/'): {
        try {
          // Use Tesseract.js for OCR on images
          const worker = await createWorker('eng');
          const { data: { text } } = await worker.recognize(bytes as any);
          await worker.terminate();

          let content = `[Image: ${file.name}]\n`;
          if (text.trim()) {
            content += `Text found in image:\n${text}\n\n`;
          }
          content += 'Please ask questions about the visual content of this image.';
          return content;
        } catch (error) {
          console.error('Image processing error:', error);
          return `[Image: ${file.name}]\nThis is an image file. Please ask questions about its visual content.`;
        }
      }

      // Audio Files
      case file.type.startsWith('audio/'): {
        return `[Audio File: ${file.name}]\nThis is an audio file. You can ask questions about:\n- Audio duration\n- File format\n- Basic audio properties`;
      }

      // Video Files
      case file.type.startsWith('video/'): {
        return `[Video File: ${file.name}]\nThis is a video file. You can ask questions about:\n- Video duration\n- File format\n- Resolution\n- Basic video properties`;
      }

      default:
        throw new Error(`Unsupported file type: ${file.type}`);
    }
  } catch (error) {
    console.error('Error processing file:', error);
    if (error instanceof Error) {
      // Provide more specific error messages
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Network error while loading file. Please check your internet connection.');
      }
      if (error.message.includes('out of memory')) {
        throw new Error('File is too large to process. Please try a smaller file.');
      }
      throw error;
    }
    throw new Error(`Failed to process ${file.name}: Unknown error occurred`);
  }
}
