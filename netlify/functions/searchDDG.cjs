// netlify/functions/searchDDG.cjs
const axios = require('axios');
const cheerio = require('cheerio');

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

async function fetchDuckDuckGoResults(query) {
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  console.log(`[DDG Fast] Fetching search results for: ${query}`);

  const res = await axios.get(searchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    },
    timeout: 10000
  });

  const $ = cheerio.load(res.data);
  const results = [];

  $('.result').each((_, el) => {
    const title = $(el).find('a.result__a').text().trim();
    const rawUrl = $(el).find('a.result__a').attr('href');
    const snippet = $(el).find('.result__snippet').text().trim();
    const url = resolveDuckDuckGoUrl(rawUrl);

    if (title && url) {
      results.push({
        title,
        url,
        snippet: snippet || 'No description available'
      });
    }
  });

  console.log(`[DDG Fast] Found ${results.length} results.`);
  return results.slice(0, 5);
}

exports.handler = async function (event) {
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

  const query = event.queryStringParameters?.query;
  console.log(`[Handler DDG Fast] Function invoked with query: ${query}`);

  if (!query) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ error: 'Missing `query` parameter' })
    };
  }

  try {
    const sources = await fetchDuckDuckGoResults(query);
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        query,
        sources
      })
    };
  } catch (err) {
    console.error(`[Handler DDG Fast] Unexpected error: ${err.message}`, err);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ error: err.message || 'An unexpected server error occurred.' })
    };
  }
};
