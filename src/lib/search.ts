import { SearchResult } from '../types';
import { logger } from './logger';
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

const NETLIFY_DEV_BASE =
  import.meta.env.DEV && typeof window !== 'undefined' && window.location.port !== '8888'
    ? 'http://localhost:8888'
    : '';
const DDG_FAST_SEARCH_FUNCTION_URL = `${NETLIFY_DEV_BASE}/.netlify/functions/searchDDG`;
const DDG_SEARCH_FUNCTION_URL = `${NETLIFY_DEV_BASE}/.netlify/functions/scrapeAndSearchDDG`;
const webSearchCallable = httpsCallable(functions, 'genieWebSearch');

function normalizeSnippet(text: string, maxLength = 320): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength - 1).trim()}…`;
}

function sanitizeQuery(query: string): string {
  const normalized = query.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").trim();
  return normalized.replace(/^[-–—\s"']+/, '').replace(/["']+$/, '').trim();
}

function queryNeedsCurrentDetails(query: string): boolean {
  return /\b(today|date|time|now|current|latest|weather)\b/i.test(query);
}

function queryHasExplicitDate(query: string): boolean {
  return /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(query);
}

function queryLooksLikeNews(query: string): boolean {
  return /\b(news|headline|headlines|updates|breaking)\b/i.test(query);
}

function queryLooksLikeWeather(query: string): boolean {
  return /\b(weather|forecast|temperature|rain|wind|humidity)\b/i.test(query);
}

function snippetsContainConcreteData(results: SearchResult[]): boolean {
  const pattern = /\b(\d{1,2}:\d{2}|\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i;
  return results.some(result => pattern.test(result.snippet));
}

function snippetsContainWeatherData(results: SearchResult[]): boolean {
  const pattern = /\b(\d{1,2,3}\s?°|degrees|highs?|lows?|precip|rain|mm|km\/h|wind)\b/i;
  return results.some(result => pattern.test(result.snippet));
}

async function tryDuckDuckGoFastSearch(query: string): Promise<SearchResult[] | null> {
  try {
    logger.debug('[DDG Fast] Attempting search for:', query);
    const url = `${DDG_FAST_SEARCH_FUNCTION_URL}?query=${encodeURIComponent(query)}`;
    logger.debug('[DDG Fast] Fetching URL:', url);
    const response = await fetch(url);
    logger.debug('[DDG Fast] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[DDG Fast] Response not OK:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    logger.debug('[DDG Fast] Received data:', data);
    const sources = Array.isArray(data.sources) ? data.sources : [];
    logger.debug('[DDG Fast] Found sources:', sources.length);

    return sources
      .map((item: any) => {
        const urlString = item.url || item.link;
        if (!urlString) return null;
        const snippet = item.snippet ? normalizeSnippet(item.snippet) : 'No description available';
        return {
          title: item.title || 'Untitled',
          link: urlString,
          snippet,
          source: new URL(urlString).hostname
        } as SearchResult;
      })
      .filter((item: SearchResult | null): item is SearchResult => Boolean(item));
  } catch (error) {
    console.error('[DDG Fast] Exception occurred:', error);
    return null;
  }
}

async function tryDuckDuckGoSearch(query: string): Promise<SearchResult[] | null> {
  try {
    logger.debug('[DDG Full] Attempting search for:', query);
    const url = `${DDG_SEARCH_FUNCTION_URL}?query=${encodeURIComponent(query)}`;
    logger.debug('[DDG Full] Fetching URL:', url);
    const response = await fetch(url);
    logger.debug('[DDG Full] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[DDG Full] Response not OK:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    logger.debug('[DDG Full] Received data:', data);
    const sources = Array.isArray(data.sources) ? data.sources : [];
    const content = Array.isArray(data.content) ? data.content : [];
    logger.debug('[DDG Full] Found sources:', sources.length, 'content items:', content.length);

    const contentByUrl = new Map<string, { chunks?: string[] }>();
    content.forEach((item: any) => {
      if (item?.url) {
        contentByUrl.set(item.url, item);
      }
    });

    return sources
      .map((item: any) => {
        const urlString = item.url || item.link;
        if (!urlString) return null;
        const snippetChunk = contentByUrl.get(urlString)?.chunks?.[0];
        const fallbackSnippet = typeof item.snippet === 'string' && item.snippet.trim()
          ? item.snippet
          : 'No description available';
        return {
          title: item.title || 'Untitled',
          link: urlString,
          snippet: snippetChunk ? normalizeSnippet(snippetChunk) : normalizeSnippet(fallbackSnippet),
          source: new URL(urlString).hostname
        } as SearchResult;
      })
      .filter((item: SearchResult | null): item is SearchResult => Boolean(item));
  } catch (error) {
    console.error('[DDG Full] Exception occurred:', error);
    return null;
  }
}

export async function performWebSearch(query: string): Promise<SearchResult[]> {
  try {
    const cleanQuery = sanitizeQuery(query);
    logger.debug('[Web Search] Starting search for query:', cleanQuery || query);

    if (!cleanQuery) {
      logger.debug('[Web Search] Empty query, returning empty results');
      return [];
    }

    // Primary path: Firebase callable (works in production Firebase hosting).
    try {
      logger.debug('[Web Search] Trying Firebase callable search...');
      const result = await webSearchCallable({ query: cleanQuery });
      const callableResults = ((result.data as { results?: Array<{ title?: string; url?: string; snippet?: string; source?: string }> })?.results || [])
        .map(item => {
          const link = item.url || '';
          if (!link) return null;
          let source = item.source || '';
          if (!source) {
            try {
              source = new URL(link).hostname;
            } catch {
              source = 'unknown';
            }
          }
          return {
            title: item.title || 'Untitled',
            link,
            snippet: item.snippet || 'No description available',
            source
          } as SearchResult;
        })
        .filter((item): item is SearchResult => Boolean(item));

      if (callableResults.length > 0) {
        logger.debug('[Web Search] Firebase callable search succeeded with', callableResults.length, 'results');
        return callableResults;
      }
      logger.warn('[Web Search] Firebase callable returned no results, falling back to Netlify search.');
    } catch (error) {
      logger.warn('[Web Search] Firebase callable failed, falling back to Netlify search:', error);
    }

    // Use DuckDuckGo as primary search (Google CSE is currently unavailable)
    logger.debug('[Web Search] Using DuckDuckGo search...');

    // For specific query types, try full DDG scraping
    if (queryHasExplicitDate(cleanQuery) && queryLooksLikeNews(cleanQuery)) {
      logger.debug('[Web Search] Explicit date + news detected, trying DDG Full Search...');
      const ddgResults = await tryDuckDuckGoSearch(cleanQuery);
      if (ddgResults && ddgResults.length > 0) {
        logger.debug('[Web Search] DDG Full Search succeeded with', ddgResults.length, 'results');
        return ddgResults;
      }
    }

    if (queryLooksLikeWeather(cleanQuery)) {
      logger.debug('[Web Search] Weather query detected, trying DDG Full Search...');
      const ddgResults = await tryDuckDuckGoSearch(cleanQuery);
      if (ddgResults && ddgResults.length > 0) {
        logger.debug('[Web Search] DDG Full Search succeeded with', ddgResults.length, 'results');
        return ddgResults;
      }
    }

    // Try DDG Fast Search
    logger.debug('[Web Search] Trying DDG Fast Search...');
    const ddgFastResults = await tryDuckDuckGoFastSearch(cleanQuery);
    if (ddgFastResults && ddgFastResults.length > 0) {
      logger.debug('[Web Search] DDG Fast Search succeeded with', ddgFastResults.length, 'results');
      if (queryLooksLikeWeather(cleanQuery) && !snippetsContainWeatherData(ddgFastResults)) {
        logger.debug('[Web Search] Fast results lacked weather details, trying DDG Full Search...');
        const ddgResults = await tryDuckDuckGoSearch(cleanQuery);
        if (ddgResults && ddgResults.length > 0) {
          logger.debug('[Web Search] DDG Full Search succeeded with', ddgResults.length, 'results');
          return ddgResults;
        }
      }
      if (queryNeedsCurrentDetails(cleanQuery) && !snippetsContainConcreteData(ddgFastResults)) {
        logger.debug('[Web Search] Fast results lacked concrete data, trying DDG Full Search...');
        const ddgResults = await tryDuckDuckGoSearch(cleanQuery);
        if (ddgResults && ddgResults.length > 0) {
          logger.debug('[Web Search] DDG Full Search succeeded with', ddgResults.length, 'results');
          return ddgResults;
        }
      }
      return ddgFastResults;
    }

    // Last resort: Try DDG Full Search
    logger.debug('[Web Search] DDG Fast failed, trying DDG Full Search as last resort...');
    const ddgResults = await tryDuckDuckGoSearch(cleanQuery);
    if (ddgResults && ddgResults.length > 0) {
      logger.debug('[Web Search] DDG Full Search succeeded with', ddgResults.length, 'results');
      return ddgResults;
    }

    // All search methods failed
    console.error('[Web Search] All search methods failed (Google CSE, DDG Fast, DDG Full)');
    throw new Error('Web search failed. Please try again later.');
  } catch (error) {
    console.error('Search error:', error);
    throw error instanceof Error ? error : new Error('Failed to perform web search');
  }
}

export function formatSearchResults(results: SearchResult[]): string {
  if (!results.length) return '';

  return results.map((result, index) => {
    return `[Result ${index + 1}]
Website: ${result.source}
Title: ${result.title}
URL: ${result.link}
Content: ${result.snippet}`;
  }).join('\n\n');
}
