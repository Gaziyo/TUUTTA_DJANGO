// netlify/functions/searchGoogle.cjs
const axios = require('axios');

const GOOGLE_SEARCH_API_URL = 'https://customsearch.googleapis.com/customsearch/v1';

async function performGoogleSearch(query, apiKey, cseId) {
  console.log(`[Google CSE] Searching for: ${query}`);

  try {
    const response = await axios.get(GOOGLE_SEARCH_API_URL, {
      params: {
        key: apiKey,
        cx: cseId,
        q: query,
        num: 5,
        fields: 'items(title,link,snippet,pagemap/metatags/og:description)'
      },
      timeout: 10000 // 10 second timeout
    });

    console.log(`[Google CSE] Response status: ${response.status}`);

    const items = response.data.items || [];
    console.log(`[Google CSE] Found ${items.length} results`);

    const results = items.map(item => ({
      title: item.title || 'Untitled',
      url: item.link,
      snippet: item.snippet || item.pagemap?.metatags?.[0]?.['og:description'] || 'No description available'
    }));

    return results;
  } catch (error) {
    console.error(`[Google CSE] Error: ${error.message}`);

    if (error.response) {
      console.error(`[Google CSE] API Error Status: ${error.response.status}`);
      console.error(`[Google CSE] API Error Data:`, error.response.data);

      // Handle specific Google API errors with detailed diagnostics
      const errorData = error.response.data?.error;
      const errorReason = errorData?.errors?.[0]?.reason || 'unknown';
      const errorMessage = errorData?.message || 'Unknown error';

      console.error(`[Google CSE] Error Reason: ${errorReason}`);
      console.error(`[Google CSE] Error Message: ${errorMessage}`);

      if (error.response.status === 429) {
        throw new Error('Google API quota exceeded. Please try again later.');
      }
      if (error.response.status === 403) {
        // Provide specific diagnosis based on error reason
        let diagnosis = 'Google API access forbidden. ';
        if (errorReason === 'accessNotConfigured') {
          diagnosis += 'Custom Search API is NOT ENABLED. Go to Google Cloud Console → APIs & Services → Library → Enable "Custom Search API".';
        } else if (errorReason === 'billingNotEnabled') {
          diagnosis += 'Billing is not enabled on this project. Enable billing in Google Cloud Console.';
        } else if (errorReason === 'keyInvalid') {
          diagnosis += 'API key is invalid. Check GOOGLE_API_KEY in Netlify environment variables.';
        } else if (errorReason === 'ipRefererBlocked') {
          diagnosis += 'IP/Referrer is blocked. Remove application restrictions from the API key.';
        } else {
          diagnosis += `Reason: ${errorReason}. Message: ${errorMessage}. Check API key, CSE ID, and that they belong to the same project.`;
        }
        const err = new Error(diagnosis);
        err.response = error.response;
        throw err;
      }
    }

    throw error;
  }
}

exports.handler = async function (event) {
  // Handle CORS preflight
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
  console.log(`[Handler Google CSE] Function invoked with query: ${query}`);

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

  // Get API keys from environment variables (server-side only)
  const apiKey = process.env.GOOGLE_API_KEY;
  const cseId = process.env.GOOGLE_CSE_ID;

  if (!apiKey || !cseId) {
    console.error('[Handler Google CSE] Missing API credentials');
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ error: 'Google Search is not configured on the server' })
    };
  }

  try {
    const sources = await performGoogleSearch(query, apiKey, cseId);

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
    const details = err?.response?.data;
    if (details) {
      console.error('[Handler Google CSE] API Error Data (surfaced to client):', details);
    }
    console.error(`[Handler Google CSE] Unexpected error: ${err.message}`, err);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        error: err.message || 'An unexpected server error occurred.',
        details: details || null
      })
    };
  }
};
