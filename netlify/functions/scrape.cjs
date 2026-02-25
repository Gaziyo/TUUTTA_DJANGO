// netlify/functions/scrape.js
// Use dynamic import for node-fetch (ESM module)
// const fetch = require('node-fetch'); // <-- Cannot use require for ESM
const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');

// Re-implement the core logic here to avoid import issues between CJS/ESM
// or reliance on a specific build step outputting CJS.
async function scrapeAndChunkArticle(url, chunkSize = 1000) {
  console.log(`[scrapeAndChunkArticle] Starting for URL: ${url}`);
  try {
    // Dynamically import node-fetch
    const { default: fetch } = await import('node-fetch');
    console.log(`[scrapeAndChunkArticle] Attempting to fetch...`);
    
    const res = await fetch(url, {
        headers: { // Add a basic user-agent, some sites block default node-fetch UA
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 15000 // Add a 15-second timeout for the fetch itself
    });
    console.log(`[scrapeAndChunkArticle] Fetch response status: ${res.status}`);
    if (!res.ok) throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);

    console.log(`[scrapeAndChunkArticle] Fetch successful, reading text...`);
    const html = await res.text();
    console.log(`[scrapeAndChunkArticle] HTML received (length: ${html.length}), parsing with JSDOM...`);
    const dom = new JSDOM(html, { url });
    console.log(`[scrapeAndChunkArticle] JSDOM parsed, using Readability...`);
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    console.log(`[scrapeAndChunkArticle] Readability parsed. Article title: ${article?.title}`);

    if (!article || !article.textContent) {
      console.warn(`[scrapeAndChunkArticle] Readability could not extract clean content from ${url}.`);
      // Throw a specific error type or message that the handler can catch
      const error = new Error('Readability failed to extract main content. The page might be a portal, list, or have an unusual layout.');
      error.name = 'ReadabilityError'; // Custom error name
      throw error;
      // throw new Error('Unable to extract clean content'); // Old error
    }

    const cleanedText = article.textContent.trim();
    console.log(`[scrapeAndChunkArticle] Content extracted (length: ${cleanedText.length}), chunking...`);
    const chunkRegex = new RegExp(`.{1,${chunkSize}}`, 'g');
    const chunks = cleanedText.match(chunkRegex) || [];
    console.log(`[scrapeAndChunkArticle] Chunking complete (${chunks.length} chunks).`);

    return chunks.map(c => c.trim()).filter(Boolean);
  } catch (error) {
    console.error(`[scrapeAndChunkArticle] Error during scraping for URL ${url}:`, error);
    if (error instanceof Error) {
        throw new Error(`Failed to scrape article: ${error.message}`);
    } else {
        throw new Error('Failed to scrape article due to an unknown error.');
    }
  }
}

exports.handler = async (event) => {
  console.log('[Handler] Function invoked.');
  console.log(`[Handler] HTTP Method: ${event.httpMethod}`);
  
  if (event.httpMethod !== 'POST') {
    console.log('[Handler] Invalid HTTP method.');
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let url;
  try {
    console.log('[Handler] Parsing request body...');
    const body = JSON.parse(event.body || '{}');
    url = body.url;
    console.log(`[Handler] Received URL: ${url}`);
    if (!url) {
      console.error('[Handler] URL missing in request body.');
      throw new Error('URL is required in the request body.');
    }
    // Basic URL validation (can be enhanced)
    console.log('[Handler] Validating URL format...');
    new URL(url);
    console.log('[Handler] URL format valid.');
  } catch (error) {
    console.error('[Handler] Error parsing request body or validating URL:', error);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error instanceof Error ? error.message : 'Invalid request body or URL.' }),
    };
  }

  try {
    // --- Restore original code ---
    console.log(`[Handler] Calling scrapeAndChunkArticle for: ${url}`);
    const chunks = await scrapeAndChunkArticle(url);
    console.log(`[Handler] scrapeAndChunkArticle succeeded, returning ${chunks.length} chunks.`);
    return {
      statusCode: 200,
      // Ensure headers allow cross-origin requests if needed, though Netlify proxying might handle this.
      // headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ chunks }),
    };
    // --- End Original code ---
  } catch (error) {
    console.error('[Handler] Error executing scrapeAndChunkArticle:', error.name, error.message);
    // Check if it's our specific Readability error
    if (error.name === 'ReadabilityError') {
        return {
            // Use 422 Unprocessable Entity, as the URL was valid but content unsuitable
            statusCode: 422,
            body: JSON.stringify({ error: error.message }),
        };
    }
    // Handle other potential errors (like fetch failures, timeouts previously caught)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error during scraping.' }),
    };
  }
};