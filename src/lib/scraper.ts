import fetch from 'node-fetch';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

// Note: This implementation uses Node.js specific libraries ('node-fetch', 'jsdom').
// If running this purely client-side in a browser, adjustments might be needed
// (e.g., using browser's fetch, DOMParser, and potentially handling CORS via a proxy).

export async function scrapeAndChunkArticle(url: string, chunkSize = 1000): Promise<string[]> {
  try {
    // We need to cast fetch to the correct type as node-fetch and browser fetch differ slightly
    const nodeFetch = fetch as unknown as typeof globalThis.fetch;
    const res = await nodeFetch(url);
    if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);

    const html = await res.text();
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.textContent) {
      throw new Error('Unable to extract clean content');
    }

    const cleanedText = article.textContent.trim();
    // Simple regex chunking by character count. Might split mid-sentence.
    const chunkRegex = new RegExp(`.{1,${chunkSize}}`, 'g');
    const chunks = cleanedText.match(chunkRegex) || [];

    // Return non-empty, trimmed chunks
    return chunks.map(c => c.trim()).filter(Boolean);
  } catch (error) {
    console.error(`Web scraping error for URL ${url}:`, error);
    // Re-throw or return an empty array depending on desired error handling
    // Re-throwing might be better to signal failure upstream.
    if (error instanceof Error) {
        throw new Error(`Failed to scrape article: ${error.message}`);
    } else {
        throw new Error('Failed to scrape article due to an unknown error.');
    }
    // return []; // Alternative: return empty array on error
  }
}