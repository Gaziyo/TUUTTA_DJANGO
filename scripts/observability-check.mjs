#!/usr/bin/env node

const defaultUrls = ['https://tuuttawebapp.netlify.app'];
const urls = (process.env.UPTIME_URLS || defaultUrls.join(','))
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const timeoutMs = Number(process.env.UPTIME_TIMEOUT_MS || 10000);
const requiredEnv = ['VITE_STATUS_PAGE_URL'];
const missingEnv = requiredEnv.filter((key) => !process.env[key] || !String(process.env[key]).trim());

const checkUrl = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  try {
    const response = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    return {
      url,
      ok: response.ok,
      status: response.status,
      latencyMs: Date.now() - startedAt
    };
  } catch (error) {
    return {
      url,
      ok: false,
      status: 0,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error)
    };
  } finally {
    clearTimeout(timer);
  }
};

const run = async () => {
  const results = await Promise.all(urls.map(checkUrl));
  const failed = results.filter((entry) => !entry.ok);

  console.log('Observability readiness check');
  console.log('----------------------------------------');
  console.log(`Checked URLs: ${results.length}`);
  for (const result of results) {
    const statusText = result.ok ? 'PASS' : 'FAIL';
    const reason = result.ok
      ? `${result.status} (${result.latencyMs}ms)`
      : `${result.status || 'ERR'} ${result.error || ''}`.trim();
    console.log(`${statusText.padEnd(5)} ${result.url} -> ${reason}`);
  }
  console.log('----------------------------------------');
  if (missingEnv.length > 0) {
    console.log(`WARN missing env keys: ${missingEnv.join(', ')}`);
  } else {
    console.log('PASS required env keys present');
  }

  if (failed.length > 0) {
    process.exitCode = 1;
    return;
  }
};

void run();
