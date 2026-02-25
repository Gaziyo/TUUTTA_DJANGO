// netlify/functions/scrapeAndSearchDDG.cjs
const axios = require('axios');
const cheerio = require('cheerio');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const _ = require('lodash'); // Note: lodash is imported but not used in the provided code. Can be removed if not needed later.

// Helper function to chunk text by sentences
function chunkText(text, maxLength = 1000) {
  if (!text) return [];
  // Basic sentence splitting, handles cases where text might not end with punctuation
  const sentences = text.match(/[^.!?]+[.!?]*(\s|$)/g) || [text]; 
  const chunks = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;

    // Check if adding the sentence exceeds the limit
    if (currentChunk && (currentChunk + ' ' + trimmedSentence).length > maxLength) {
      // Push the current chunk if it's not empty
      chunks.push(currentChunk);
      currentChunk = ''; // Reset for the new sentence
    }
    
    // Handle sentences that are themselves longer than the max length
    if (trimmedSentence.length > maxLength) {
        // If a chunk is already started, push it first
        if (currentChunk) {
            chunks.push(currentChunk);
            currentChunk = '';
        }
        // Split the long sentence and add its parts as separate chunks
        const longSentenceChunks = trimmedSentence.match(new RegExp(`.{1,${maxLength}}`, 'g')) || [];
        chunks.push(...longSentenceChunks);
    } else {
        // Add the sentence to the current chunk
        currentChunk += (currentChunk ? ' ' : '') + trimmedSentence;
    }
  }

  // Add the last remaining chunk if it's not empty
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}


function resolveDuckDuckGoUrl(rawUrl) {
  if (!rawUrl || !rawUrl.startsWith('http')) return null;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.hostname.endsWith('duckduckgo.com')) {
      if (parsed.pathname === '/y.js') {
        return null;
      }
      const uddg = parsed.searchParams.get('uddg');
      if (uddg) {
        return decodeURIComponent(uddg);
      }
      return null;
    }
    return rawUrl;
  } catch (err) {
    return null;
  }
}

function extractHeadlineCandidates(document) {
  const headingNodes = Array.from(document.querySelectorAll('h1, h2, h3'));
  const seen = new Set();
  const headlines = [];

  for (const node of headingNodes) {
    const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text || text.length < 20) continue;
    const wordCount = text.split(' ').length;
    if (wordCount < 4) continue;
    if (seen.has(text)) continue;
    seen.add(text);
    headlines.push(text);
    if (headlines.length >= 8) break;
  }

  return headlines;
}

async function fetchDuckDuckGoResults(query) {
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  console.log(`[DDG] Fetching search results for: ${query}`);

  const res = await axios.get(searchUrl, {
    headers: {
      // Using a more standard browser user-agent might be less likely to be blocked
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    },
    timeout: 10000 // 10 second timeout for DDG search
  });
  console.log(`[DDG] Search response status: ${res.status}`);

  const $ = cheerio.load(res.data);
  const links = [];

  $('a.result__a').each((i, el) => {
    const title = $(el).text().trim();
    const rawUrl = $(el).attr('href');
    const snippet = $(el).closest('.result').find('.result__snippet').text().trim();
    const url = resolveDuckDuckGoUrl(rawUrl);
    if (url) {
      links.push({ title, url, snippet: snippet || '' });
    } else if (rawUrl) {
      console.warn(`[DDG] Skipping invalid or ad URL from search results: ${rawUrl}`);
    }
  });
  console.log(`[DDG] Found ${links.length} potential source links.`);
  return links.slice(0, 5); // Limit to top 5 results
}

async function scrapeReadableText(url) {
  console.log(`[Scraper] Attempting to scrape: ${url}`);
  try {
    const response = await axios.get(url, {
      headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' 
      },
      timeout: 15000 // 15 second timeout per scrape attempt
    });
    console.log(`[Scraper] Fetched ${url} with status: ${response.status}`);

    const dom = new JSDOM(response.data, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.textContent || article.textContent.trim().length < 200) {
      console.warn(`[Scraper] Readability weak for ${url}; attempting headline extraction`);
      const headlines = extractHeadlineCandidates(dom.window.document);
      if (!headlines.length) {
        console.warn(`[Scraper] Headline extraction failed for ${url}`);
        return null;
      }
      const chunks = chunkText(headlines.join('. '), 1000);
      console.log(`[Scraper] Extracted ${headlines.length} headline candidates from ${url}.`);
      return {
        title: article?.title || url,
        url,
        chunks
      };
    }

    console.log(`[Scraper] Readability success for ${url}. Title: ${article.title}`);

    const chunks = chunkText(article.textContent.trim(), 1000);
    console.log(`[Scraper] Chunked content from ${url} into ${chunks.length} chunks.`);

    return {
      title: article.title || url,
      url,
      chunks: chunks
    };
  } catch (err) {
    // Log specific error types if possible
    if (err.response) {
        console.warn(`[Scraper] Failed to scrape ${url}: Status ${err.response.status}`);
    } else if (err.request) {
        console.warn(`[Scraper] Failed to scrape ${url}: No response received (Timeout or Network Issue)`);
    } else {
        console.warn(`[Scraper] Failed to scrape ${url}: ${err.message}`);
    }
    return null;
  }
}

exports.handler = async function (event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    };
  }

  // Use query string parameters for GET requests
  const query = event.queryStringParameters?.query; 
  console.log(`[Handler DDG] Function invoked with query: ${query}`);

  if (!query) {
    console.error('[Handler DDG] Missing query parameter.');
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ error: 'Missing `query` parameter' }),
    };
  }

  try {
    const sources = await fetchDuckDuckGoResults(query);
    if (!sources || sources.length === 0) {
        console.log('[Handler DDG] No sources found from DuckDuckGo.');
        // Return empty content gracefully instead of erroring
         return {
            statusCode: 200, // Or 404? 200 seems okay, just no results.
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET,OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify({
                query,
                sources: [],
                content: []
            })
        };
    }
    
    console.log(`[Handler DDG] Scraping ${sources.length} sources...`);
    const scrapePromises = sources.map(({ url }) => scrapeReadableText(url));
    // Use Promise.allSettled to handle individual scrape failures without stopping others
    const settledResults = await Promise.allSettled(scrapePromises); 
    
    const validResults = [];
    settledResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
            validResults.push(result.value);
        } else if (result.status === 'rejected') {
            console.error(`[Handler DDG] Promise rejected for URL ${sources[index]?.url}: ${result.reason}`);
        }
        // Ignore fulfilled promises that returned null (scrapeReadableText handled its error)
    });

    console.log(`[Handler DDG] Successfully scraped ${validResults.length} out of ${sources.length} sources.`);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        query,
        // Map sources again to ensure order matches original search results if needed
        sources: sources.map(s => ({ title: s.title, url: s.url, snippet: s.snippet || '' })), 
        content: validResults // Already filtered and contains title, url, chunks
      })
    };
  } catch (err) {
    console.error(`[Handler DDG] Unexpected error: ${err.message}`, err);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ error: err.message || 'An unexpected server error occurred.' }),
    };
  }
};
