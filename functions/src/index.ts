import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onCall, HttpsError, onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getMessaging } from 'firebase-admin/messaging';
import { getAuth } from 'firebase-admin/auth';
import sgMail from '@sendgrid/mail';
import OpenAI, { toFile } from 'openai';
import JSZip from 'jszip';
import PDFDocument from 'pdfkit';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

initializeApp();

const db = getFirestore();
const openAIKey = defineSecret('OPENAI_API_KEY');

const getOpenAI = () => {
  const apiKey = openAIKey.value() || process.env.OPENAI_API_KEY || '';
  if (!apiKey) {
    throw new HttpsError('failed-precondition', 'OpenAI API key is not configured on the server.');
  }
  return new OpenAI({ apiKey });
};

const toCallableAiError = (error: unknown, fallbackMessage: string): HttpsError => {
  if (error instanceof HttpsError) {
    return error;
  }

  const status = Number((error as { status?: number; statusCode?: number } | undefined)?.status
    ?? (error as { status?: number; statusCode?: number } | undefined)?.statusCode
    ?? 0);
  const rawMessage = (error as { message?: string } | undefined)?.message || fallbackMessage;
  const message = rawMessage.toLowerCase();

  if (status === 400 && (
    message.includes('maximum context length')
    || message.includes('context_length_exceeded')
    || message.includes('too many tokens')
  )) {
    return new HttpsError(
      'invalid-argument',
      'Your request is too long for the AI model. Try starting a new chat or shortening your message.'
    );
  }

  if (status === 401 || message.includes('api key') || message.includes('not configured')) {
    return new HttpsError('failed-precondition', 'AI service is not configured correctly on the server.');
  }

  if (status === 429 || message.includes('rate limit') || message.includes('quota')) {
    return new HttpsError('resource-exhausted', 'AI service is busy right now. Please try again shortly.');
  }

  if (status === 0 || message.includes('connection error') || message.includes('network error')) {
    return new HttpsError(
      'unavailable',
      'Server cannot reach OpenAI right now. Check Firebase billing plan (Blaze) and function outbound internet access.'
    );
  }

  if (status >= 500 || message.includes('timeout') || message.includes('timed out')) {
    return new HttpsError('unavailable', 'AI service is temporarily unavailable. Please try again.');
  }

  const safeDetails = {
    status,
    message: rawMessage.slice(0, 500)
  };
  return new HttpsError('internal', fallbackMessage, safeDetails);
};

const isModelAvailabilityError = (error: unknown): boolean => {
  const status = Number((error as { status?: number; statusCode?: number } | undefined)?.status
    ?? (error as { status?: number; statusCode?: number } | undefined)?.statusCode
    ?? 0);
  const message = String((error as { message?: string } | undefined)?.message || '').toLowerCase();
  return status === 404
    || message.includes('model')
    && (
      message.includes('not found')
      || message.includes('does not exist')
      || message.includes('unavailable')
      || message.includes('unsupported')
    );
};

interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

const decodeHtmlEntities = (input: string): string => {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
};

const stripHtml = (input: string): string => input.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const resolveDuckDuckGoUrl = (rawUrl: string): string | null => {
  if (!rawUrl || !rawUrl.startsWith('http')) return null;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.hostname.endsWith('duckduckgo.com')) {
      if (parsed.pathname === '/y.js') return null;
      const uddg = parsed.searchParams.get('uddg');
      return uddg ? decodeURIComponent(uddg) : null;
    }
    return rawUrl;
  } catch {
    return null;
  }
};

const parseDuckDuckGoHtml = (html: string): WebSearchResult[] => {
  const results: WebSearchResult[] = [];
  const seen = new Set<string>();
  const anchorRegex = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null = null;

  while ((match = anchorRegex.exec(html)) && results.length < 8) {
    const rawUrl = decodeHtmlEntities(match[1] || '');
    const url = resolveDuckDuckGoUrl(rawUrl);
    if (!url || seen.has(url)) continue;
    seen.add(url);

    const title = stripHtml(decodeHtmlEntities(match[2] || '')).trim();
    if (!title) continue;

    const windowStart = Math.max(0, match.index - 400);
    const windowEnd = Math.min(html.length, match.index + 2000);
    const localBlock = html.slice(windowStart, windowEnd);
    const snippetMatch = localBlock.match(/<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/i)
      || localBlock.match(/<div[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
      || localBlock.match(/<span[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
    const snippet = stripHtml(decodeHtmlEntities(snippetMatch?.[1] || '')).trim() || 'No description available';

    let source = '';
    try {
      source = new URL(url).hostname;
    } catch {
      source = 'unknown';
    }

    results.push({ title, url, snippet, source });
  }

  return results;
};

const fetchDuckDuckGoWebSearch = async (query: string): Promise<WebSearchResult[]> => {
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`DuckDuckGo search failed (${response.status}).`);
    }

    const html = await response.text();
    return parseDuckDuckGoHtml(html);
  } finally {
    clearTimeout(timeout);
  }
};

const requireAuth = (auth: { uid?: string } | undefined) => {
  if (!auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }
};

const parseJsonFromContent = <T>(content: string): T => {
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  const jsonText = start >= 0 && end >= 0 ? content.slice(start, end + 1) : content;
  return JSON.parse(jsonText) as T;
};

const buildCSV = (columns: { id: string; label: string }[], data: Record<string, any>[]) => {
  const headers = columns.map(col => `"${col.label}"`).join(',');
  const rows = data.map(row =>
    columns.map(col => {
      const value = row[col.id];
      const stringValue = value !== null && value !== undefined ? String(value) : '';
      return `"${stringValue.replace(/"/g, '""')}"`;
    }).join(',')
  );
  return [headers, ...rows].join('\n');
};

const createSummaryPdfBuffer = async (payload: {
  orgName: string;
  generatedAt: string;
  recordCount: number;
  dateRange?: string;
}) => {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  const endPromise = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  doc.fontSize(22).text('Compliance Evidence Summary', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Organization: ${payload.orgName}`);
  doc.text(`Generated: ${payload.generatedAt}`);
  if (payload.dateRange) {
    doc.text(`Period: ${payload.dateRange}`);
  }
  doc.text(`Records: ${payload.recordCount}`);
  doc.moveDown();
  doc.fontSize(10).text('This summary is part of the Tuutta compliance export package.');

  doc.end();
  return endPromise;
};

const createCertificatePdfBuffer = async (payload: {
  orgName: string;
  learnerName: string;
  courseTitle: string;
  issuedAt: string;
  certificateNumber: string;
  verificationUrl: string;
}) => {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  const endPromise = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  doc.fontSize(20).text('Certificate of Completion', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Organization: ${payload.orgName}`);
  doc.text(`Learner: ${payload.learnerName}`);
  doc.text(`Course: ${payload.courseTitle}`);
  doc.text(`Issued: ${payload.issuedAt}`);
  doc.moveDown();
  doc.text(`Certificate ID: ${payload.certificateNumber}`);
  doc.text(`Verify: ${payload.verificationUrl}`);
  doc.end();

  return endPromise;
};

const logAiUsage = async (
  orgId: string | undefined,
  action: string,
  model: string,
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
) => {
  if (!orgId || !usage) return;
  const entry = {
    orgId,
    action,
    model,
    promptTokens: usage.prompt_tokens || 0,
    completionTokens: usage.completion_tokens || 0,
    totalTokens: usage.total_tokens || 0,
    createdAt: Date.now()
  };
  await db.collection('aiUsage').add(entry);
  await db.collection('organizations').doc(orgId).collection('aiUsage').add(entry);
};

const createAuditLogEntry = async (payload: {
  orgId: string;
  actorId: string;
  actorName: string;
  action: string;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  metadata?: Record<string, any>;
}) => {
  const entry = {
    orgId: payload.orgId,
    actorId: payload.actorId,
    actorName: payload.actorName,
    action: payload.action,
    targetType: payload.targetType,
    targetId: payload.targetId,
    targetName: payload.targetName,
    metadata: payload.metadata || {},
    createdAt: Date.now()
  };
  await db.collection('auditLogs').add(entry);
  await db.collection('organizations').doc(payload.orgId).collection('auditLogs').add(entry);
};

const createNotification = async (payload: {
  orgId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  channels?: string[];
}) => {
  const orgSnap = await db.collection('organizations').doc(payload.orgId).get();
  const webhook = orgSnap.exists ? (orgSnap.data()?.settings?.notifications?.webhookUrl as string | undefined) : undefined;
  await db.collection('lmsNotifications').add({
    orgId: payload.orgId,
    userId: payload.userId,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    data: payload.data || {},
    channels: payload.channels || ['in_app', 'email'],
    status: 'pending',
    createdAt: Date.now()
  });

  if (webhook) {
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: payload.orgId,
          userId: payload.userId,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          data: payload.data || {},
          createdAt: Date.now()
        })
      });
    } catch (error) {
      await logSystemError({
        orgId: payload.orgId,
        functionName: 'notificationWebhook',
        message: error instanceof Error ? error.message : 'Webhook delivery failed'
      });
    }
  }
};

const logSystemError = async (payload: {
  orgId?: string;
  functionName: string;
  message: string;
  metadata?: Record<string, any>;
}) => {
  await db.collection('systemAlerts').add({
    orgId: payload.orgId || null,
    functionName: payload.functionName,
    message: payload.message,
    metadata: payload.metadata || {},
    createdAt: Date.now(),
    status: 'open'
  });
};

const startAnalyticsJob = async (orgId: string, mode: 'scheduled' | 'manual') => {
  const jobRef = db.collection('analyticsJobs').doc();
  const job = {
    id: jobRef.id,
    orgId,
    mode,
    status: 'running',
    startedAt: Date.now()
  };
  await jobRef.set(job);
  await db.collection('organizations').doc(orgId).collection('analyticsJobs').doc(jobRef.id).set(job);
  return jobRef.id;
};

const completeAnalyticsJob = async (orgId: string, jobId: string, status: 'success' | 'failed', errorMessage?: string) => {
  const update = {
    status,
    completedAt: Date.now(),
    errorMessage: errorMessage || null
  };
  await db.collection('analyticsJobs').doc(jobId).set(update, { merge: true });
  await db.collection('organizations').doc(orgId).collection('analyticsJobs').doc(jobId).set(update, { merge: true });
};

const verifyAuthToken = async (authHeader?: string) => {
  if (!authHeader) return null;
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  if (!token) return null;
  try {
    const decoded = await getAuth().verifyIdToken(token);
    return decoded;
  } catch {
    return null;
  }
};

const getOrgApiKey = async (orgId: string) => {
  const orgSnap = await db.collection('organizations').doc(orgId).get();
  if (!orgSnap.exists) return null;
  return orgSnap.data()?.settings?.apiKey || null;
};

const authorizeRequest = async (req: any) => {
  const orgId = String(req.headers['x-org-id'] || req.query.orgId || '');
  if (!orgId) return { ok: false, orgId: null, reason: 'orgId required' };
  const authHeader = req.headers.authorization as string | undefined;
  const decoded = await verifyAuthToken(authHeader);
  if (decoded?.uid) {
    const memberDoc = await db.collection('orgMembers').doc(`${orgId}_${decoded.uid}`).get();
    if (memberDoc.exists) {
      return { ok: true, orgId, uid: decoded.uid };
    }
  }
  const apiKey = req.headers['x-api-key'] as string | undefined;
  const orgKey = await getOrgApiKey(orgId);
  if (apiKey && orgKey && apiKey === orgKey) {
    return { ok: true, orgId, uid: null };
  }
  return { ok: false, orgId, reason: 'unauthorized' };
};

const signWebhookPayload = (secret: string, payload: string) => {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
};

const dispatchWebhooks = async (orgId: string, event: string, data: Record<string, any>) => {
  const hooksSnap = await db.collection('orgWebhooks')
    .where('orgId', '==', orgId)
    .where('enabled', '==', true)
    .get();
  if (hooksSnap.empty) return;
  const payload = {
    event,
    orgId,
    timestamp: Date.now(),
    data
  };
  const payloadString = JSON.stringify(payload);
  for (const hookDoc of hooksSnap.docs) {
    const hook = hookDoc.data() as { url: string; secret?: string; events?: string[] };
    if (!hook.url) continue;
    if (Array.isArray(hook.events) && hook.events.length > 0 && !hook.events.includes(event)) continue;
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (hook.secret) {
        headers['X-Signature'] = signWebhookPayload(hook.secret, payloadString);
      }
      const response = await fetch(hook.url, { method: 'POST', headers, body: payloadString });
      const delivery = {
        orgId,
        webhookId: hookDoc.id,
        event,
        url: hook.url,
        status: response.ok ? 'success' : 'failed',
        statusCode: response.status,
        attempt: 1,
        createdAt: Date.now()
      };
      await db.collection('webhookDeliveries').add(delivery);
      await db.collection('organizations').doc(orgId).collection('webhookDeliveries').add(delivery);
    } catch (error) {
      const delivery = {
        orgId,
        webhookId: hookDoc.id,
        event,
        url: hook.url,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Webhook delivery failed',
        attempt: 1,
        createdAt: Date.now()
      };
      await db.collection('webhookDeliveries').add(delivery);
      await db.collection('organizations').doc(orgId).collection('webhookDeliveries').add(delivery);
      await logSystemError({
        orgId,
        functionName: 'dispatchWebhooks',
        message: error instanceof Error ? error.message : 'Webhook delivery failed',
        metadata: { event, hookId: hookDoc.id }
      });
    }
  }
};

const api = express();
api.use(cors({ origin: true }));
api.use(express.json({ limit: '1mb' }));

api.use(async (req, res, next) => {
  const auth = await authorizeRequest(req);
  if (!auth.ok) {
    res.status(401).json({ error: auth.reason || 'unauthorized' });
    return;
  }
  (req as any).orgId = auth.orgId;
  (req as any).uid = auth.uid;
  next();
});

api.post('/api/v1/enrollments', async (req, res) => {
  const orgId = (req as any).orgId as string;
  const body = req.body || {};
  const userIds: string[] = Array.isArray(body.userIds) ? body.userIds : [];
  const courseId = String(body.courseId || '');
  const dueDate = body.dueDate ? Number(body.dueDate) : undefined;
  if (!courseId || userIds.length === 0) {
    res.status(400).json({ error: 'courseId and userIds are required' });
    return;
  }
  const created: string[] = [];
  for (const userId of userIds) {
    await ensureEnrollment({
      orgId,
      userId,
      courseId,
      assignedBy: (req as any).uid || 'api',
      dueDate
    });
    created.push(userId);
  }
  res.json({ status: 'ok', enrolled: created.length });
});

api.get('/api/v1/enrollments/:id', async (req, res) => {
  const orgId = (req as any).orgId as string;
  const id = req.params.id;
  const docSnap = await db.collection('enrollments').doc(id).get();
  if (!docSnap.exists) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  const data = docSnap.data() as any;
  if (data.orgId !== orgId) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }
  res.json({ enrollment: data });
});

api.patch('/api/v1/enrollments/:id', async (req, res) => {
  const orgId = (req as any).orgId as string;
  const id = req.params.id;
  const updates = req.body || {};
  const docSnap = await db.collection('enrollments').doc(id).get();
  if (!docSnap.exists) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  const data = docSnap.data() as any;
  if (data.orgId !== orgId) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }
  await db.collection('enrollments').doc(id).set({ ...updates, updatedAt: Date.now() }, { merge: true });
  await db.collection('organizations').doc(orgId).collection('enrollments').doc(id)
    .set({ ...updates, updatedAt: Date.now() }, { merge: true });
  res.json({ status: 'ok' });
});

api.delete('/api/v1/enrollments/:id', async (req, res) => {
  const orgId = (req as any).orgId as string;
  const id = req.params.id;
  const docSnap = await db.collection('enrollments').doc(id).get();
  if (!docSnap.exists) {
    res.status(404).json({ error: 'not found' });
    return;
  }
  const data = docSnap.data() as any;
  if (data.orgId !== orgId) {
    res.status(403).json({ error: 'forbidden' });
    return;
  }
  await db.collection('enrollments').doc(id).delete();
  await db.collection('organizations').doc(orgId).collection('enrollments').doc(id).delete().catch(() => {});
  res.json({ status: 'ok' });
});

api.get('/api/v1/users/:id/progress', async (req, res) => {
  const orgId = (req as any).orgId as string;
  const userId = req.params.id;
  const progressSnap = await db.collection('progress')
    .where('orgId', '==', orgId)
    .where('userId', '==', userId)
    .get();
  res.json({ progress: progressSnap.docs.map(doc => doc.data()) });
});

api.get('/api/v1/users/:id/competencies', async (req, res) => {
  const orgId = (req as any).orgId as string;
  const userId = req.params.id;
  const scoresSnap = await db.collection('competencyScores')
    .where('orgId', '==', orgId)
    .where('userId', '==', userId)
    .get();
  res.json({ competencies: scoresSnap.docs.map(doc => doc.data()) });
});

api.get('/api/v1/reports/compliance', async (req, res) => {
  const orgId = (req as any).orgId as string;
  const enrollmentsSnap = await db.collection('enrollments').where('orgId', '==', orgId).get();
  const enrollments = enrollmentsSnap.docs.map(doc => doc.data());
  const required = enrollments.filter(e => e.priority === 'required');
  const completed = required.filter(e => e.status === 'completed').length;
  const overdue = required.filter(e => e.status === 'overdue').length;
  const complianceRate = required.length ? Math.round(completed / required.length * 100) : 100;
  res.json({ required: required.length, completed, overdue, complianceRate });
});

api.get('/api/v1/reports/completion', async (req, res) => {
  const orgId = (req as any).orgId as string;
  const enrollmentsSnap = await db.collection('enrollments').where('orgId', '==', orgId).get();
  const enrollments = enrollmentsSnap.docs.map(doc => doc.data());
  const total = enrollments.length;
  const completed = enrollments.filter(e => e.status === 'completed').length;
  const completionRate = total ? Math.round(completed / total * 100) : 0;
  res.json({ total, completed, completionRate });
});

api.post('/api/v1/courses/generate', async (req, res) => {
  const orgId = (req as any).orgId as string;
  const body = req.body || {};
  const prompt = String(body.prompt || '');
  if (!prompt) {
    res.status(400).json({ error: 'prompt required' });
    return;
  }
  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Generate a course outline and objectives.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.4
    });
    await logAiUsage(orgId, 'api.course.generate', response.model, response.usage || undefined);
    res.json({ content: response.choices[0]?.message?.content || '' });
  } catch (error) {
    await logSystemError({
      orgId,
      functionName: 'api.courses.generate',
      message: error instanceof Error ? error.message : 'Course generate failed'
    });
    res.status(500).json({ error: 'generation failed' });
  }
});

api.get('/api/v1/integrations/sso', async (req, res) => {
  const orgId = (req as any).orgId as string;
  const snap = await db.collection('ssoConnections').where('orgId', '==', orgId).get();
  res.json({ connections: snap.docs.map(doc => doc.data()) });
});

api.post('/api/v1/integrations/sso', async (req, res) => {
  const orgId = (req as any).orgId as string;
  const body = req.body || {};
  const provider = String(body.provider || '');
  const config = body.config || {};
  if (!provider) {
    res.status(400).json({ error: 'provider required' });
    return;
  }
  const docRef = db.collection('ssoConnections').doc();
  const record = {
    id: docRef.id,
    orgId,
    provider,
    config,
    enabled: Boolean(body.enabled ?? true),
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  await docRef.set(record);
  await db.collection('organizations').doc(orgId).collection('ssoConnections').doc(docRef.id).set(record);
  res.json({ status: 'ok', id: docRef.id });
});

api.get('/api/v1/integrations/hris', async (req, res) => {
  const orgId = (req as any).orgId as string;
  const snap = await db.collection('hrisIntegrations').where('orgId', '==', orgId).get();
  res.json({ integrations: snap.docs.map(doc => doc.data()) });
});

api.post('/api/v1/integrations/hris', async (req, res) => {
  const orgId = (req as any).orgId as string;
  const body = req.body || {};
  const provider = String(body.provider || '');
  const config = body.config || {};
  if (!provider) {
    res.status(400).json({ error: 'provider required' });
    return;
  }
  const docRef = db.collection('hrisIntegrations').doc();
  const record = {
    id: docRef.id,
    orgId,
    provider,
    config,
    enabled: Boolean(body.enabled ?? true),
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  await docRef.set(record);
  await db.collection('organizations').doc(orgId).collection('hrisIntegrations').doc(docRef.id).set(record);
  res.json({ status: 'ok', id: docRef.id });
});

export const apiV1 = onRequest(api);

const createCompetencyScore = async (payload: {
  orgId: string;
  userId: string;
  courseId?: string;
  enrollmentId?: string;
  assessmentId?: string;
  competencyTag: string;
  score: number;
  assessedAt: number;
  expiresAt?: number;
}) => {
  const docRef = db.collection('competencyScores').doc();
  const record = { id: docRef.id, ...payload };
  await docRef.set(record);
  await db.collection('organizations').doc(payload.orgId).collection('competencyScores').doc(docRef.id).set(record);
};

const createRemediationAssignment = async (payload: {
  orgId: string;
  userId: string;
  enrollmentId: string;
  courseId: string;
  moduleId?: string;
  lessonId?: string;
  status: 'assigned' | 'completed' | 'dismissed';
  reason?: string;
  scheduledReassessmentAt?: number;
}) => {
  const docRef = db.collection('remediationAssignments').doc();
  const record = { id: docRef.id, createdAt: Date.now(), ...payload };
  await docRef.set(record);
  await db.collection('organizations').doc(payload.orgId).collection('remediationAssignments').doc(docRef.id).set(record);
};

const createCompetencyBadge = async (payload: {
  orgId: string;
  userId: string;
  courseId: string;
  moduleId: string;
  assessmentId?: string;
  title: string;
  competencyTags?: string[];
}) => {
  const docRef = db.collection('competencyBadges').doc();
  const record = { id: docRef.id, issuedAt: Date.now(), ...payload };
  await docRef.set(record);
  await db.collection('organizations').doc(payload.orgId).collection('competencyBadges').doc(docRef.id).set(record);
};

const sendRemediationNotification = async (payload: {
  orgId: string;
  userId: string;
  title: string;
  message: string;
  data?: Record<string, any>;
}) => {
  await db.collection('lmsNotifications').add({
    orgId: payload.orgId,
    userId: payload.userId,
    title: payload.title,
    message: payload.message,
    channels: ['in_app', 'email'],
    status: 'pending',
    createdAt: Date.now(),
    data: payload.data || {},
    type: 'remediation_alert'
  });
};

export const genieGenerateObjectives = onCall({ secrets: [openAIKey] }, async (request) => {
  requireAuth(request.auth);
  const openai = getOpenAI();

  const { sources, context, count, orgId } = request.data as {
    sources: { title: string; description?: string; type: string; tags: string[] }[];
    context?: string;
    count?: number;
    orgId?: string;
  };

  if (!sources || sources.length === 0) {
    throw new HttpsError('invalid-argument', 'Sources are required.');
  }

  const sourceSummary = sources.map((source, index) => (
    `${index + 1}. ${source.title} (${source.type})${source.description ? ` - ${source.description}` : ''} [tags: ${source.tags.join(', ') || 'none'}]`
  )).join('\n');

  const systemPrompt = `You are an instructional designer. Return a JSON object with an "objectives" array.
Each objective must be specific, measurable, and action-oriented.
Keep each objective under 120 characters.`;

  const userPrompt = `Generate ${count || 6} learning objectives based on these sources.
Context: ${context || 'General workforce training'}

Sources:
${sourceSummary}

Return JSON only with this shape:
{
  "objectives": ["Objective 1", "Objective 2"]
}`;

  const model = 'gpt-4o-mini';
  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.25,
    max_tokens: 600
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new HttpsError('internal', 'No objectives returned.');
  }

  const parsed = parseJsonFromContent<{ objectives?: string[] }>(content);
  if (!parsed.objectives || !Array.isArray(parsed.objectives)) {
    throw new HttpsError('internal', 'Invalid objectives format.');
  }

  await logAiUsage(orgId, 'genieGenerateObjectives', model, response.usage);
  return { objectives: parsed.objectives };
});

export const genieGenerateOutline = onCall({ secrets: [openAIKey] }, async (request) => {
  requireAuth(request.auth);
  const openai = getOpenAI();

  const { title, sources, prompt, orgId } = request.data as {
    title: string;
    sources: { title: string; description?: string; type: string; tags: string[] }[];
    prompt: string;
    orgId?: string;
  };

  if (!title || !sources || sources.length === 0) {
    throw new HttpsError('invalid-argument', 'Title and sources are required.');
  }

  const sourceSummary = sources.map((source, index) => (
    `${index + 1}. ${source.title} (${source.type})${source.description ? ` - ${source.description}` : ''} [tags: ${source.tags.join(', ') || 'none'}]`
  )).join('\n');

  const systemPrompt = `You are an AI course architect. Return a JSON object with a "modules" array. Each module must include:
- title
- lessons: array of { title, type, duration, isRequired }
Allowed lesson types: text, document, assignment, quiz, interactive, video, external_link, scorm.
Keep lessons concise and practical.`;

  const userPrompt = `${prompt}

Course title: ${title}
Sources:
${sourceSummary}

Return JSON only with this shape:
{
  "modules": [
    {
      "title": "Module title",
      "lessons": [
        { "title": "Lesson title", "type": "text", "duration": 10, "isRequired": true }
      ]
    }
  ]
}`;

  const model = 'gpt-4o-mini';
  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.3,
    max_tokens: 1200
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new HttpsError('internal', 'No outline returned.');
  }

  const parsed = parseJsonFromContent<{ modules?: Array<{ title: string; lessons: any[] }> }>(content);
  if (!parsed.modules || !Array.isArray(parsed.modules)) {
    throw new HttpsError('internal', 'Invalid outline format.');
  }

  await logAiUsage(orgId, 'genieGenerateOutline', model, response.usage);
  return { modules: parsed.modules };
});

export const genieGenerateLessonContent = onCall({ secrets: [openAIKey] }, async (request) => {
  requireAuth(request.auth);
  const openai = getOpenAI();

  const { courseTitle, moduleTitle, lessonTitle, lessonType, sources, prompt, orgId } = request.data as {
    courseTitle: string;
    moduleTitle: string;
    lessonTitle: string;
    lessonType: string;
    sources: { title: string; description?: string; type: string; tags: string[] }[];
    prompt: string;
    orgId?: string;
  };

  if (!courseTitle || !moduleTitle || !lessonTitle || !lessonType) {
    throw new HttpsError('invalid-argument', 'Course, module, lesson, and type are required.');
  }

  const sourceSummary = sources.map((source, index) => (
    `${index + 1}. ${source.title} (${source.type})${source.description ? ` - ${source.description}` : ''} [tags: ${source.tags.join(', ') || 'none'}]`
  )).join('\n');

  const systemPrompt = `You are an AI lesson designer. Return JSON with:
{
  "title": "Lesson title",
  "duration": 10,
  "isRequired": true,
  "content": {
    "htmlContent": "...",
    "assignmentPrompt": "...",
    "questions": [
      { "question": "...", "options": ["..."], "correctAnswer": "...", "explanation": "..." }
    ],
    "documentUrl": "",
    "videoUrl": "",
    "externalUrl": ""
  }
}
Only include relevant fields for the lesson type. For quiz, include 3-5 questions.`;

  const userPrompt = `${prompt}

Course: ${courseTitle}
Module: ${moduleTitle}
Lesson: ${lessonTitle}
Lesson type: ${lessonType}
Sources:
${sourceSummary}

Return JSON only.`;

  const model = 'gpt-4o-mini';
  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.35,
    max_tokens: 1000
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new HttpsError('internal', 'No lesson content returned.');
  }

  const parsed = parseJsonFromContent<Record<string, any>>(content);
  if (!parsed.content) {
    throw new HttpsError('internal', 'Invalid lesson content format.');
  }

  await logAiUsage(orgId, 'genieGenerateLessonContent', model, response.usage);
  return parsed;
});

export const genieGenerateLessonCritique = onCall({ secrets: [openAIKey] }, async (request) => {
  requireAuth(request.auth);
  const openai = getOpenAI();

  const { courseTitle, moduleTitle, lessonTitle, lessonType, lessonContent, sources, prompt } = request.data as {
    courseTitle: string;
    moduleTitle: string;
    lessonTitle: string;
    lessonType: string;
    lessonContent: string;
    sources: { title: string; description?: string; type: string; tags: string[] }[];
    prompt: string;
  };

  if (!courseTitle || !moduleTitle || !lessonTitle || !lessonType || !lessonContent) {
    throw new HttpsError('invalid-argument', 'Lesson details and content are required.');
  }

  const sourceSummary = sources.map((source, index) => (
    `${index + 1}. ${source.title} (${source.type})${source.description ? ` - ${source.description}` : ''} [tags: ${source.tags.join(', ') || 'none'}]`
  )).join('\n');

  const systemPrompt = `You are an expert instructional designer. Provide a concise critique of the lesson with:
- Clarity
- Accuracy
- Engagement
- Adult learning alignment
- Suggested improvements (bullets)
Keep it under 8 bullet points.`;

  const userPrompt = `${prompt}

Course: ${courseTitle}
Module: ${moduleTitle}
Lesson: ${lessonTitle}
Type: ${lessonType}
Lesson content:
${lessonContent}

Sources:
${sourceSummary}
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.2,
    max_tokens: 600
  });

  return { critique: response.choices[0]?.message?.content || 'No critique returned.' };
});

export const genieChatCompletion = onCall({ secrets: [openAIKey] }, async (request) => {
  try {
    requireAuth(request.auth);
    const openai = getOpenAI();

    const {
      model,
      systemPrompt,
      userPrompt,
      temperature,
      maxTokens,
      responseFormat,
      orgId
    } = request.data as {
      model?: string;
      systemPrompt: string;
      userPrompt: string;
      temperature?: number;
      maxTokens?: number;
      responseFormat?: 'json_object';
      orgId?: string;
    };

    if (!systemPrompt || !userPrompt) {
      throw new HttpsError('invalid-argument', 'systemPrompt and userPrompt are required.');
    }

    const modelCandidates = Array.from(new Set([
      model || 'gpt-4o-mini',
      'gpt-4.1-mini',
      'gpt-4o-mini'
    ]));
    let response: Awaited<ReturnType<typeof openai.chat.completions.create>> | null = null;
    let chosenModel = modelCandidates[0];
    let lastModelError: unknown = null;

    for (const candidate of modelCandidates) {
      try {
        chosenModel = candidate;
        response = await openai.chat.completions.create({
          model: candidate,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: temperature ?? 0.3,
          max_tokens: maxTokens ?? 1200,
          response_format: responseFormat ? { type: responseFormat } : undefined
        });
        break;
      } catch (error) {
        lastModelError = error;
        if (!isModelAvailabilityError(error)) {
          throw error;
        }
      }
    }

    if (!response) {
      throw lastModelError ?? new Error('No AI model available for chat completion.');
    }

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new HttpsError('internal', 'No completion returned.');
    }

    await logAiUsage(orgId, 'genieChatCompletion', chosenModel, response.usage);
    return { content };
  } catch (error) {
    throw toCallableAiError(error, 'Failed to generate AI response.');
  }
});

export const genieWebSearch = onCall(async (request) => {
  try {
    requireAuth(request.auth);
    const { query } = request.data as { query?: string };
    const cleanQuery = (query || '').trim();

    if (!cleanQuery) {
      throw new HttpsError('invalid-argument', 'query is required.');
    }

    const results = await fetchDuckDuckGoWebSearch(cleanQuery);
    return { results };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    const message = String((error as { message?: string } | undefined)?.message || '');
    if (message.toLowerCase().includes('abort')) {
      throw new HttpsError('deadline-exceeded', 'Web search timed out. Please try again.');
    }
    throw new HttpsError('unavailable', 'Web search is temporarily unavailable.');
  }
});

export const genieTextToSpeech = onCall({ secrets: [openAIKey] }, async (request) => {
  try {
    requireAuth(request.auth);
    const openai = getOpenAI();

    const { text, voice, speed } = request.data as {
      text: string;
      voice?: string;
      speed?: number;
    };

    if (!text?.trim()) {
      throw new HttpsError('invalid-argument', 'Text is required.');
    }

    const safeSpeed = Number.isFinite(speed) ? Math.min(1.5, Math.max(0.75, Number(speed))) : 1.0;

    // Keep tts-1 first to preserve legacy voice behavior users expect.
    const ttsModelCandidates = ['tts-1', 'gpt-4o-mini-tts'];
    let response: Awaited<ReturnType<typeof openai.audio.speech.create>> | null = null;
    let lastModelError: unknown = null;

    for (const candidate of ttsModelCandidates) {
      try {
        response = await openai.audio.speech.create({
          model: candidate as any,
          voice: (voice || 'nova') as any,
          input: text.slice(0, 4096),
          response_format: 'mp3',
          speed: safeSpeed
        });
        break;
      } catch (error) {
        lastModelError = error;
        if (!isModelAvailabilityError(error)) {
          throw error;
        }
      }
    }

    if (!response) {
      throw lastModelError ?? new Error('No AI model available for text-to-speech.');
    }

    const audioData = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioData).toString('base64');
    return { base64Audio };
  } catch (error) {
    throw toCallableAiError(error, 'Failed to generate speech audio.');
  }
});

export const genieTranscribeAudio = onCall({ secrets: [openAIKey] }, async (request) => {
  requireAuth(request.auth);
  const openai = getOpenAI();

  const { base64Audio, mimeType } = request.data as {
    base64Audio: string;
    mimeType?: string;
  };

  if (!base64Audio) {
    throw new HttpsError('invalid-argument', 'base64Audio is required.');
  }

  const buffer = Buffer.from(base64Audio, 'base64');
  const extension = mimeType?.split('/')[1]?.split(';')[0] || 'webm';
  const file = await toFile(buffer, `audio.${extension}`, { type: mimeType || 'audio/webm' });

  const response = await openai.audio.transcriptions.create({
    model: 'whisper-1',
    file
  });

  return { text: response.text || '' };
});

const sendEmail = async (orgId: string, to: string[], subject: string, html: string) => {
  const settingsSnap = await db.collection('genieReportEmailSettings')
    .where('orgId', '==', orgId)
    .limit(1)
    .get();
  if (settingsSnap.empty) {
    throw new Error('Missing email provider settings');
  }
  const settings = settingsSnap.docs[0].data() as {
    provider?: string;
    apiKey?: string;
    senderName?: string;
    senderEmail?: string;
  };
  if (settings.provider !== 'sendgrid') {
    throw new Error(`Email provider not supported: ${settings.provider}`);
  }
  if (!settings.apiKey) {
    throw new Error('Missing SendGrid API key');
  }
  sgMail.setApiKey(settings.apiKey);
  await sgMail.send({
    to,
    from: {
      name: settings.senderName || 'Tuutta',
      email: settings.senderEmail || 'reports@tuutta.app'
    },
    subject,
    html
  });
};

export const genieReportScheduler = onSchedule('every 24 hours', async () => {
  const snapshot = await db.collection('genieReportSchedules')
    .where('enabled', '==', true)
    .get();

  if (snapshot.empty) return;

  const now = Date.now();

  for (const doc of snapshot.docs) {
    const schedule = doc.data() as {
      orgId: string;
      frequency: 'weekly' | 'monthly';
      recipients: string;
      lastRunAt?: number | null;
    };

    const lastRun = schedule.lastRunAt || 0;
    const frequencyDays = schedule.frequency === 'monthly' ? 28 : 7;
    const nextDue = lastRun + frequencyDays * 24 * 60 * 60 * 1000;

    if (now < nextDue) continue;

    await db.collection('genieReportRuns').add({
      orgId: schedule.orgId,
      scheduleId: doc.id,
      recipients: schedule.recipients,
      status: 'queued',
      createdAt: now
    });

    await doc.ref.update({ lastRunAt: now });
  }
});

export const managerDigestScheduler = onSchedule('0 7 * * 1', async () => {
  const snapshot = await db.collection('organizations').get();
  if (snapshot.empty) return;

  const now = Date.now();

  for (const doc of snapshot.docs) {
    const org = doc.data() as {
      settings?: {
        notifications?: {
          managerDigestEnabled?: boolean;
          managerDigestFrequency?: 'weekly' | 'monthly';
          managerDigestRoles?: string[];
        };
      };
    };
    const notifications = org.settings?.notifications;
    if (!notifications?.managerDigestEnabled) continue;

    const frequencyDays = notifications.managerDigestFrequency === 'monthly' ? 28 : 7;
    const lastRunSnap = await db.collection('managerDigestRuns')
      .where('orgId', '==', doc.id)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    const lastRunAt = lastRunSnap.empty ? 0 : (lastRunSnap.docs[0].data().createdAt || 0);
    const nextDue = lastRunAt + frequencyDays * 24 * 60 * 60 * 1000;

    if (now < nextDue) continue;

    await db.collection('managerDigestRuns').add({
      orgId: doc.id,
      status: 'queued',
      createdAt: now,
      frequency: notifications.managerDigestFrequency || 'weekly',
      roles: notifications.managerDigestRoles || []
    });
  }
});

export const managerDigestProcessor = onSchedule('every 60 minutes', async () => {
  const snapshot = await db.collection('managerDigestRuns')
    .where('status', '==', 'queued')
    .limit(25)
    .get();

  if (snapshot.empty) return;

  for (const runDoc of snapshot.docs) {
    const run = runDoc.data() as {
      orgId: string;
      roles?: string[];
    };

    await runDoc.ref.update({ status: 'processing' });

    try {
      const roles = run.roles && run.roles.length > 0 ? run.roles : ['team_lead', 'ld_manager', 'org_admin'];
      const managersSnap = await db.collection('orgMembers')
        .where('orgId', '==', run.orgId)
        .where('role', 'in', roles)
        .get();

      const membersSnap = await db.collection('orgMembers')
        .where('orgId', '==', run.orgId)
        .get();
      const members = membersSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      const enrollmentsSnap = await db.collection('enrollments')
        .where('orgId', '==', run.orgId)
        .get();
      const enrollments = enrollmentsSnap.docs.map(doc => doc.data() as any);

      const memberMap = new Map(members.map(member => [member.id, member]));
      const enrollmentsByUser = new Map<string, any[]>();
      enrollments.forEach(enrollment => {
        const list = enrollmentsByUser.get(enrollment.userId) || [];
        list.push(enrollment);
        enrollmentsByUser.set(enrollment.userId, list);
      });

      const coursesSnap = await db.collection('courses')
        .where('orgId', '==', run.orgId)
        .get();
      const courses = coursesSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      const courseMap = new Map(courses.map(course => [course.id, course]));

      for (const managerDoc of managersSnap.docs) {
        const manager = managerDoc.data() as any;
        const directReports = members.filter(member =>
          member.managerId === manager.id ||
          member.managerId === manager.userId ||
          (manager.teamId && member.teamId === manager.teamId && member.id !== manager.id)
        );
        const reportIds = directReports.map(member => member.userId || member.id);
        const relevantEnrollments = reportIds.flatMap(userId => enrollmentsByUser.get(userId) || []);
        const completed = relevantEnrollments.filter(e => e.status === 'completed').length;
        const inProgress = relevantEnrollments.filter(e => e.status === 'in_progress').length;
        const overdue = relevantEnrollments.filter(e => e.status === 'overdue').length;
        const total = relevantEnrollments.length;
        const courseCounts = new Map<string, number>();
        const overdueLearners: Array<{ name: string; count: number }> = [];

        relevantEnrollments.forEach((enrollment) => {
          courseCounts.set(enrollment.courseId, (courseCounts.get(enrollment.courseId) || 0) + 1);
        });

        directReports.forEach((member) => {
          const userId = member.userId || member.id;
          const userEnrollments = enrollmentsByUser.get(userId) || [];
          const overdueCount = userEnrollments.filter(e => e.status === 'overdue').length;
          if (overdueCount > 0) {
            overdueLearners.push({ name: member.name || 'Learner', count: overdueCount });
          }
        });

        const topCourses = Array.from(courseCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([courseId, count]) => {
            const completedCount = relevantEnrollments.filter(
              (e) => e.courseId === courseId && e.status === 'completed'
            ).length;
            const completionRate = count > 0 ? Math.round((completedCount / count) * 100) : 0;
            return {
              title: courseMap.get(courseId)?.title || 'Course',
              count,
              completionRate
            };
          });

        const topOverdue = overdueLearners
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        if (!manager.email) continue;
        const reportUrl = manager?.userId
          ? `https://app.tuutta.com/admin/genie/notifications?manager=${manager.userId}`
          : 'https://app.tuutta.com/admin/genie/notifications';

        await sendEmail(
          run.orgId,
          [manager.email],
          'Manager Digest',
          `
            <h2>Manager Digest</h2>
            <p>Hello ${manager.name || 'Manager'},</p>
            <p>Here is your latest team summary:</p>
            <ul>
              <li>Total enrollments: ${total}</li>
              <li>Completed: ${completed}</li>
              <li>In progress: ${inProgress}</li>
              <li>Overdue: ${overdue}</li>
            </ul>
            <h3>Top Courses</h3>
            <ul>
              ${topCourses.map(course => `<li>${course.title} (${course.count}) • ${course.completionRate}% complete</li>`).join('')}
            </ul>
            <h3>Top Overdue Learners</h3>
            <ul>
              ${topOverdue.map(item => `<li>${item.name} (${item.count} overdue)</li>`).join('')}
            </ul>
            <p><a href="${reportUrl}">View report</a> in Tuutta for details.</p>
          `
        );
      }

      await runDoc.ref.update({ status: 'sent', completedAt: Date.now() });
    } catch (error) {
      await runDoc.ref.update({
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Failed to send digest',
        completedAt: Date.now()
      });
    }
  }
});

export const sendDeadlineReminders = onSchedule('0 9 * * *', async () => {
  const orgs = await db.collection('organizations').get();
  if (orgs.empty) return;

  const now = Date.now();

  for (const orgDoc of orgs.docs) {
    const org = orgDoc.data() as {
      settings?: {
        notifications?: {
          assignmentDue?: boolean;
          reminderDaysBefore?: number;
          emailEnabled?: boolean;
          inAppEnabled?: boolean;
          pushEnabled?: boolean;
        };
      };
    };
    const notifications = org.settings?.notifications;
    if (!notifications?.assignmentDue) continue;

    const reminderDays = notifications.reminderDaysBefore ?? 3;
    const maxWindow = now + reminderDays * 24 * 60 * 60 * 1000;

    const upcomingSnap = await db.collection('enrollments')
      .where('orgId', '==', orgDoc.id)
      .where('status', 'in', ['not_started', 'in_progress'])
      .where('dueDate', '<=', maxWindow)
      .get();

    for (const enrollmentDoc of upcomingSnap.docs) {
      const enrollment = enrollmentDoc.data() as {
        userId: string;
        courseId: string;
        dueDate?: number;
        progress?: number;
      };
      if (!enrollment.dueDate) continue;
      const daysRemaining = Math.ceil((enrollment.dueDate - now) / (1000 * 60 * 60 * 24));
      if (daysRemaining < 0 || daysRemaining > reminderDays) continue;

      const existing = await db.collection('lmsNotifications')
        .where('orgId', '==', orgDoc.id)
        .where('userId', '==', enrollment.userId)
        .where('type', '==', 'enrollment_reminder')
        .where('data.enrollmentId', '==', enrollmentDoc.id)
        .where('createdAt', '>=', now - 24 * 60 * 60 * 1000)
        .get();
      if (!existing.empty) continue;

      await db.collection('lmsNotifications').add({
        orgId: orgDoc.id,
        userId: enrollment.userId,
        type: 'enrollment_reminder',
        title: daysRemaining === 0
          ? 'Training Due Today!'
          : daysRemaining === 1
            ? 'Training Due Tomorrow!'
            : `Training Due in ${daysRemaining} Days`,
        message: `Training is due in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}.`,
        data: {
          enrollmentId: enrollmentDoc.id,
          courseId: enrollment.courseId,
          daysRemaining,
          progress: enrollment.progress || 0
        },
        channels: [
          ...(notifications.inAppEnabled ? ['in_app'] : []),
          ...(notifications.emailEnabled ? ['email'] : []),
          ...(notifications.pushEnabled ? ['push'] : [])
        ],
        status: 'pending',
        createdAt: Date.now()
      });
    }

    const overdueSnap = await db.collection('enrollments')
      .where('orgId', '==', orgDoc.id)
      .where('status', 'in', ['not_started', 'in_progress'])
      .where('dueDate', '<', now)
      .get();

    for (const enrollmentDoc of overdueSnap.docs) {
      const enrollment = enrollmentDoc.data() as {
        userId: string;
        courseId: string;
        dueDate?: number;
        progress?: number;
        status?: string;
      };
      if (!enrollment.dueDate) continue;
      const daysOverdue = Math.ceil((now - enrollment.dueDate) / (1000 * 60 * 60 * 24));
      if (daysOverdue <= 0) continue;

      if (enrollment.status !== 'overdue') {
        await enrollmentDoc.ref.update({ status: 'overdue', updatedAt: Date.now() });
        await db.collection('organizations')
          .doc(orgDoc.id)
          .collection('enrollments')
          .doc(enrollmentDoc.id)
          .set({ status: 'overdue', updatedAt: Date.now() }, { merge: true });
        await db.collection('auditLogs').add({
          orgId: orgDoc.id,
          actorId: 'system',
          actorName: 'System',
          action: 'enrollment_overdue',
          targetType: 'enrollment',
          targetId: enrollmentDoc.id,
          targetName: enrollment.userId,
          metadata: { courseId: enrollment.courseId },
          createdAt: Date.now()
        });
        await db.collection('organizations')
          .doc(orgDoc.id)
          .collection('auditLogs')
          .add({
            orgId: orgDoc.id,
            actorId: 'system',
            actorName: 'System',
            action: 'enrollment_overdue',
            targetType: 'enrollment',
            targetId: enrollmentDoc.id,
            targetName: enrollment.userId,
            metadata: { courseId: enrollment.courseId },
            createdAt: Date.now()
          });
      }

      const existing = await db.collection('lmsNotifications')
        .where('orgId', '==', orgDoc.id)
        .where('userId', '==', enrollment.userId)
        .where('type', '==', 'enrollment_overdue')
        .where('data.enrollmentId', '==', enrollmentDoc.id)
        .where('createdAt', '>=', now - 24 * 60 * 60 * 1000)
        .get();
      if (!existing.empty) continue;

      await db.collection('lmsNotifications').add({
        orgId: orgDoc.id,
        userId: enrollment.userId,
        type: 'enrollment_overdue',
        title: 'Training Overdue',
        message: `Training is overdue by ${daysOverdue} day${daysOverdue === 1 ? '' : 's'}.`,
        data: {
          enrollmentId: enrollmentDoc.id,
          courseId: enrollment.courseId,
          daysOverdue,
          progress: enrollment.progress || 0
        },
        channels: [
          ...(notifications.inAppEnabled ? ['in_app'] : []),
          ...(notifications.emailEnabled ? ['email'] : []),
          ...(notifications.pushEnabled ? ['push'] : [])
        ],
        status: 'pending',
        createdAt: Date.now()
      });
    }
  }
});

export const checkOverdueEnrollments = onSchedule('0 6 * * *', async () => {
  const orgs = await db.collection('organizations').get();
  if (orgs.empty) return;
  const now = Date.now();

  for (const orgDoc of orgs.docs) {
    const org = orgDoc.data() as {
      settings?: { notifications?: { emailEnabled?: boolean; inAppEnabled?: boolean; pushEnabled?: boolean } };
    };
    const notifications = org.settings?.notifications;
    const overdueSnap = await db.collection('enrollments')
      .where('orgId', '==', orgDoc.id)
      .where('status', 'in', ['not_started', 'in_progress'])
      .where('dueDate', '<', now)
      .get();

    for (const enrollmentDoc of overdueSnap.docs) {
      const enrollment = enrollmentDoc.data() as {
        userId: string;
        courseId: string;
        dueDate?: number;
        progress?: number;
        status?: string;
      };
      if (!enrollment.dueDate) continue;
      const daysOverdue = Math.ceil((now - enrollment.dueDate) / (1000 * 60 * 60 * 24));
      if (daysOverdue <= 0) continue;

      if (enrollment.status !== 'overdue') {
        await enrollmentDoc.ref.update({ status: 'overdue', updatedAt: Date.now() });
        await db.collection('organizations')
          .doc(orgDoc.id)
          .collection('enrollments')
          .doc(enrollmentDoc.id)
          .set({ status: 'overdue', updatedAt: Date.now() }, { merge: true });
        await createAuditLogEntry({
          orgId: orgDoc.id,
          actorId: 'system',
          actorName: 'System',
          action: 'enrollment.overdue',
          targetType: 'enrollment',
          targetId: enrollmentDoc.id,
          targetName: enrollment.userId,
          metadata: { courseId: enrollment.courseId }
        });
        await dispatchWebhooks(orgDoc.id, 'compliance.at_risk', {
          enrollmentId: enrollmentDoc.id,
          userId: enrollment.userId,
          courseId: enrollment.courseId,
          dueDate: enrollment.dueDate
        });
      }

      const existing = await db.collection('lmsNotifications')
        .where('orgId', '==', orgDoc.id)
        .where('userId', '==', enrollment.userId)
        .where('type', '==', 'enrollment_overdue')
        .where('data.enrollmentId', '==', enrollmentDoc.id)
        .where('createdAt', '>=', now - 24 * 60 * 60 * 1000)
        .get();
      if (!existing.empty) continue;

      await db.collection('lmsNotifications').add({
        orgId: orgDoc.id,
        userId: enrollment.userId,
        type: 'enrollment_overdue',
        title: 'Training Overdue',
        message: `Training is overdue by ${daysOverdue} day${daysOverdue === 1 ? '' : 's'}.`,
        data: {
          enrollmentId: enrollmentDoc.id,
          courseId: enrollment.courseId,
          daysOverdue,
          progress: enrollment.progress || 0
        },
        channels: [
          ...(notifications?.inAppEnabled ? ['in_app'] : []),
          ...(notifications?.emailEnabled ? ['email'] : []),
          ...(notifications?.pushEnabled ? ['push'] : [])
        ],
        status: 'pending',
        createdAt: Date.now()
      });
    }
  }
});

const ensureEnrollment = async (payload: {
  orgId: string;
  userId: string;
  courseId: string;
  assignedBy: string;
  learningPathId?: string;
  priority?: 'required' | 'recommended' | 'optional';
  dueDate?: number;
}) => {
  const existing = await db.collection('enrollments')
    .where('orgId', '==', payload.orgId)
    .where('userId', '==', payload.userId)
    .where('courseId', '==', payload.courseId)
    .limit(1)
    .get();
  if (!existing.empty) return;

  const enrollmentRef = db.collection('enrollments').doc();
  const enrollment = {
    id: enrollmentRef.id,
    orgId: payload.orgId,
    userId: payload.userId,
    courseId: payload.courseId,
    learningPathId: payload.learningPathId,
    assignedBy: payload.assignedBy,
    assignedAt: Date.now(),
    dueDate: payload.dueDate,
    role: 'student',
    priority: payload.priority || 'required',
    status: 'not_started',
    progress: 0,
    attempts: 0,
    moduleProgress: {},
  };
  await enrollmentRef.set(enrollment);
  await db.collection('organizations')
    .doc(payload.orgId)
    .collection('enrollments')
    .doc(enrollmentRef.id)
    .set(enrollment);
  await createAuditLogEntry({
    orgId: payload.orgId,
    actorId: payload.assignedBy,
    actorName: 'System',
    action: 'enrollment.created',
    targetType: 'enrollment',
    targetId: enrollmentRef.id,
    targetName: payload.userId,
    metadata: { courseId: payload.courseId }
  });
};

const selectMembersForRule = async (orgId: string, rule: any) => {
  const membersSnap = await db.collection('orgMembers').where('orgId', '==', orgId).get();
  const members = membersSnap.docs.map(doc => doc.data());
  return members.filter((member) => {
    if (rule.conditions?.roles?.length && !rule.conditions.roles.includes(member.role)) return false;
    if (rule.conditions?.departments?.length && !rule.conditions.departments.includes(member.departmentId)) return false;
    if (rule.conditions?.teams?.length && !rule.conditions.teams.includes(member.teamId)) return false;
    return true;
  });
};

const applyAssignmentRules = async (orgId: string, trigger: string, memberOverride?: any, courseOverride?: any) => {
  const rulesSnap = await db.collection('assignmentRules')
    .where('orgId', '==', orgId)
    .where('isActive', '==', true)
    .where('trigger', '==', trigger)
    .get();
  if (rulesSnap.empty) return;
  const rules = rulesSnap.docs.map(doc => doc.data());

  for (const rule of rules) {
    if (courseOverride && !rule.courseIds?.includes(courseOverride.id)) continue;
    const members = memberOverride ? [memberOverride] : await selectMembersForRule(orgId, rule);
    for (const member of members) {
      for (const courseId of rule.courseIds || []) {
        await ensureEnrollment({
          orgId,
          userId: member.userId || member.id,
          courseId,
          learningPathId: rule.learningPathIds?.[0],
          assignedBy: 'system',
          priority: rule.priority || 'required',
          dueDate: rule.dueDate?.type === 'fixed' ? rule.dueDate.date : undefined
        });
      }
    }
  }
};

export const enrollmentCreated = onDocumentCreated('enrollments/{enrollmentId}', async (event) => {
  if (!event.data) return;
  const enrollment = event.data.data() as any;
  const orgId = enrollment.orgId;
  if (!orgId) return;
  const orgSnap = await db.collection('organizations').doc(orgId).get();
  const orgName = orgSnap.exists ? (orgSnap.data()?.name as string) : 'Tuutta';
  const memberSnap = await db.collection('orgMembers')
    .where('orgId', '==', orgId)
    .where('userId', '==', enrollment.userId)
    .limit(1)
    .get();
  const member = memberSnap.empty ? null : memberSnap.docs[0].data();
  const managerId = member?.managerId;
  const courseSnap = await db.collection('courses').doc(enrollment.courseId).get();
  const courseTitle = courseSnap.exists ? (courseSnap.data()?.title as string) : 'training';

  await createNotification({
    orgId,
    userId: enrollment.userId,
    type: 'enrollment_created',
    title: 'New training assigned',
    message: 'You have been enrolled in new training.',
    data: { enrollmentId: event.params.enrollmentId, courseId: enrollment.courseId }
  });
  await dispatchWebhooks(orgId, 'enrollment.created', {
    enrollmentId: event.params.enrollmentId,
    userId: enrollment.userId,
    courseId: enrollment.courseId
  });

  if (member?.email) {
    await sendEmail(
      orgId,
      [member.email],
      `Welcome to ${orgName}`,
      `
        <h2>Welcome to ${orgName}</h2>
        <p>You've been assigned: <strong>${courseTitle}</strong>.</p>
        <p>Please log in to start your training.</p>
      `
    );
  }

  if (managerId) {
    const managerSnap = await db.collection('orgMembers')
      .where('orgId', '==', orgId)
      .where('userId', '==', managerId)
      .limit(1)
      .get();
    const manager = managerSnap.empty ? null : managerSnap.docs[0].data();
    if (manager?.email) {
      await sendEmail(
        orgId,
        [manager.email],
        `Team member assigned training`,
        `
          <p>${member?.name || 'A learner'} was enrolled in <strong>${courseTitle}</strong>.</p>
        `
      );
    }
  }
});

export const enrollmentCreatedOrg = onDocumentCreated('organizations/{orgId}/enrollments/{enrollmentId}', async (event) => {
  if (!event.data) return;
  const enrollment = event.data.data() as any;
  const orgId = event.params.orgId;
  const orgSnap = await db.collection('organizations').doc(orgId).get();
  const orgName = orgSnap.exists ? (orgSnap.data()?.name as string) : 'Tuutta';
  const memberSnap = await db.collection('orgMembers')
    .where('orgId', '==', orgId)
    .where('userId', '==', enrollment.userId)
    .limit(1)
    .get();
  const member = memberSnap.empty ? null : memberSnap.docs[0].data();
  const managerId = member?.managerId;
  const courseSnap = await db.collection('courses').doc(enrollment.courseId).get();
  const courseTitle = courseSnap.exists ? (courseSnap.data()?.title as string) : 'training';

  await createNotification({
    orgId,
    userId: enrollment.userId,
    type: 'enrollment_created',
    title: 'New training assigned',
    message: 'You have been enrolled in new training.',
    data: { enrollmentId: event.params.enrollmentId, courseId: enrollment.courseId }
  });
  await dispatchWebhooks(orgId, 'enrollment.created', {
    enrollmentId: event.params.enrollmentId,
    userId: enrollment.userId,
    courseId: enrollment.courseId
  });

  if (member?.email) {
    await sendEmail(
      orgId,
      [member.email],
      `Welcome to ${orgName}`,
      `
        <h2>Welcome to ${orgName}</h2>
        <p>You've been assigned: <strong>${courseTitle}</strong>.</p>
        <p>Please log in to start your training.</p>
      `
    );
  }

  if (managerId) {
    const managerSnap = await db.collection('orgMembers')
      .where('orgId', '==', orgId)
      .where('userId', '==', managerId)
      .limit(1)
      .get();
    const manager = managerSnap.empty ? null : managerSnap.docs[0].data();
    if (manager?.email) {
      await sendEmail(
        orgId,
        [manager.email],
        `Team member assigned training`,
        `
          <p>${member?.name || 'A learner'} was enrolled in <strong>${courseTitle}</strong>.</p>
        `
      );
    }
  }
});

export const memberCreated = onDocumentCreated('orgMembers/{memberId}', async (event) => {
  if (!event.data) return;
  const member = event.data.data() as any;
  if (!member.orgId) return;
  await applyAssignmentRules(member.orgId, 'on_join', member);
  await createAuditLogEntry({
    orgId: member.orgId,
    actorId: 'system',
    actorName: 'System',
    action: 'user.enrolled',
    targetType: 'user',
    targetId: member.userId || member.id,
    targetName: member.name || 'User'
  });
});

export const coursePublished = onDocumentUpdated('courses/{courseId}', async (event) => {
  if (!event.data) return;
  const beforeData = event.data.before.data() || {};
  const afterData = event.data.after.data() || {};
  if (beforeData.status === afterData.status) return;
  if (afterData.status !== 'published') return;
  if (!afterData.orgId) return;
  await applyAssignmentRules(afterData.orgId, 'scheduled', undefined, afterData);
  await createAuditLogEntry({
    orgId: afterData.orgId,
    actorId: 'system',
    actorName: 'System',
    action: 'course.published',
    targetType: 'course',
    targetId: event.params.courseId,
    targetName: afterData.title || 'Course'
  });
  await dispatchWebhooks(afterData.orgId, 'course.published', {
    courseId: event.params.courseId,
    title: afterData.title || 'Course'
  });
});

export const coursePublishedOrg = onDocumentUpdated('organizations/{orgId}/courses/{courseId}', async (event) => {
  if (!event.data) return;
  const beforeData = event.data.before.data() || {};
  const afterData = event.data.after.data() || {};
  if (beforeData.status === afterData.status) return;
  if (afterData.status !== 'published') return;
  await applyAssignmentRules(event.params.orgId, 'scheduled', undefined, afterData);
  await createAuditLogEntry({
    orgId: event.params.orgId,
    actorId: 'system',
    actorName: 'System',
    action: 'course.published',
    targetType: 'course',
    targetId: event.params.courseId,
    targetName: afterData.title || 'Course'
  });
  await dispatchWebhooks(event.params.orgId, 'course.published', {
    courseId: event.params.courseId,
    title: afterData.title || 'Course'
  });
});

export const policyUpdated = onDocumentUpdated({ document: 'organizations/{orgId}', secrets: [openAIKey] }, async (event) => {
  if (!event.data) return;
  const before = event.data.before.data() || {};
  const after = event.data.after.data() || {};
  const beforeCompliance = before.settings?.compliance || {};
  const afterCompliance = after.settings?.compliance || {};
  if (JSON.stringify(beforeCompliance) === JSON.stringify(afterCompliance)) return;
  await createAuditLogEntry({
    orgId: event.params.orgId,
    actorId: 'system',
    actorName: 'System',
    action: 'policy.updated',
    targetType: 'organization',
    targetId: event.params.orgId,
    targetName: after.name || 'Organization',
    metadata: { changedKeys: Object.keys(afterCompliance || {}) }
  });

  const adminsSnap = await db.collection('orgMembers')
    .where('orgId', '==', event.params.orgId)
    .where('role', 'in', ['org_admin', 'ld_manager'])
    .get();
  for (const adminDoc of adminsSnap.docs) {
    const admin = adminDoc.data() as any;
    await createNotification({
      orgId: event.params.orgId,
      userId: admin.userId || admin.id,
      type: 'policy_updated',
      title: 'Compliance policy updated',
      message: 'Compliance settings were updated. Review and re-publish impacted training if needed.',
    });
  }

  const sourcesSnap = await db.collection('genieSources')
    .where('orgId', '==', event.params.orgId)
    .get();
  const sources = sourcesSnap.docs.map(doc => doc.data());
  const sourceSummary = sources.map((source) => `${source.name || source.id} (${source.type || 'source'})`).slice(0, 5).join(', ');

  const objectivesPrompt = `
You are regenerating training objectives based on updated compliance policies.
Organization: ${after.name || 'Organization'}
Compliance changes: ${Object.keys(afterCompliance || {}).join(', ') || 'general updates'}
Available sources: ${sourceSummary || 'none'}
Provide updated learning objectives and compliance focus areas.
Return JSON: { "objectives": string[], "complianceFocus": string[] }
  `.trim();

  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You update compliance training objectives.' },
        { role: 'user', content: objectivesPrompt }
      ],
      temperature: 0.3
    });
    const content = response.choices[0]?.message?.content || '{}';
    const parsed = parseJsonFromContent<{ objectives?: string[]; complianceFocus?: string[] }>(content);

    await db.collection('organizations').doc(event.params.orgId).collection('genieRegenerationLogs').add({
      orgId: event.params.orgId,
      createdAt: Date.now(),
      objectives: parsed.objectives || [],
      complianceFocus: parsed.complianceFocus || [],
      model: response.model
    });
    await createAuditLogEntry({
      orgId: event.params.orgId,
      actorId: 'system',
      actorName: 'System',
      action: 'genie.regeneration',
      targetType: 'organization',
      targetId: event.params.orgId,
      metadata: { objectives: parsed.objectives || [], complianceFocus: parsed.complianceFocus || [] }
    });
  } catch (error) {
    await logSystemError({
      orgId: event.params.orgId,
      functionName: 'policyUpdated',
      message: error instanceof Error ? error.message : 'Failed to regenerate compliance objectives'
    });
  }
});

export const competencyRefreshScheduler = onSchedule('every monday 06:00', async () => {
  try {
    const orgs = await db.collection('organizations').get();
    if (orgs.empty) return;
    for (const orgDoc of orgs.docs) {
      const orgId = orgDoc.id;
      const scoresSnap = await db.collection('competencyScores').where('orgId', '==', orgId).get();
      if (scoresSnap.empty) continue;
      const scores = scoresSnap.docs.map(doc => doc.data());
      const byTag = new Map<string, { total: number; count: number }>();
      for (const score of scores) {
        const tag = score.competencyTag || 'general';
        const entry = byTag.get(tag) || { total: 0, count: 0 };
        entry.total += score.score || 0;
        entry.count += 1;
        byTag.set(tag, entry);
      }
      const snapshotRef = db.collection('competencySnapshots').doc();
      const snapshot = {
        id: snapshotRef.id,
        orgId,
        createdAt: Date.now(),
        metrics: Array.from(byTag.entries()).map(([tag, entry]) => ({
          tag,
          avgScore: entry.count ? Math.round(entry.total / entry.count) : 0,
          count: entry.count
        }))
      };
      await snapshotRef.set(snapshot);
      await db.collection('organizations').doc(orgId).collection('competencySnapshots').doc(snapshotRef.id).set(snapshot);
    }
  } catch (error) {
    await logSystemError({
      functionName: 'competencyRefreshScheduler',
      message: error instanceof Error ? error.message : 'Failed competency refresh'
    });
  }
});

const computeOrgAnalytics = async (orgId: string) => {
  const [enrollmentsSnap, assessmentsSnap, membersSnap, coursesSnap, moduleProgressSnap] = await Promise.all([
    db.collection('enrollments').where('orgId', '==', orgId).get(),
    db.collection('assessmentResults').where('orgId', '==', orgId).get(),
    db.collection('orgMembers').where('orgId', '==', orgId).get(),
    db.collection('courses').where('orgId', '==', orgId).get(),
    db.collection('moduleProgress').where('orgId', '==', orgId).get()
  ]);
  const enrollments = enrollmentsSnap.docs.map(doc => doc.data());
  const assessments = assessmentsSnap.docs.map(doc => doc.data());
  const members = membersSnap.docs.map(doc => doc.data());
  const courses = coursesSnap.docs.map(doc => doc.data());
  const moduleProgress = moduleProgressSnap.docs.map(doc => doc.data());
  const total = enrollments.length;
  const completed = enrollments.filter(e => e.status === 'completed').length;
  const overdue = enrollments.filter(e => e.status === 'overdue').length;
  const passRate = assessments.length
    ? Math.round(assessments.filter(a => a.passed).length / assessments.length * 100)
    : 0;
  const completionRate = total ? Math.round(completed / total * 100) : 0;
  const avgAssessmentScore = assessments.length
    ? Math.round(assessments.reduce((sum, a) => sum + (a.score || 0), 0) / assessments.length)
    : 0;
  const completedDurations = enrollments
    .filter(e => e.completedAt && e.assignedAt)
    .map(e => e.completedAt - e.assignedAt);
  const avgTimeToCompleteMs = completedDurations.length
    ? Math.round(completedDurations.reduce((sum, v) => sum + v, 0) / completedDurations.length)
    : 0;

  const memberStats = new Map<string, { total: number; completed: number }>();
  for (const enrollment of enrollments) {
    const userId = enrollment.userId;
    const stat = memberStats.get(userId) || { total: 0, completed: 0 };
    stat.total += 1;
    if (enrollment.status === 'completed') stat.completed += 1;
    memberStats.set(userId, stat);
  }

  const now = Date.now();
  const riskScores: Array<{
    id: string;
    orgId: string;
    userId: string;
    enrollmentId: string;
    courseId: string;
    riskScore: number;
    riskLevel: 'low' | 'medium' | 'high';
    reasons: string[];
    updatedAt: number;
  }> = [];
  const atRiskEnrollments: string[] = [];

  const completedOrOverdue = enrollments.filter((e) => e.dueDate && (e.status === 'completed' || e.status === 'overdue' || e.status === 'failed'));
  const thresholdCandidates = [45, 55, 65, 70, 75, 80];
  let bestThreshold = 70;
  let bestF1 = 0;

  const scoreForEnrollment = (enrollment: any) => {
    const userId = enrollment.userId;
    const assignedAt = enrollment.assignedAt || now;
    const lastAccessed = enrollment.lastAccessedAt || enrollment.startedAt || assignedAt;
    const daysSinceLast = Math.max(0, Math.floor((now - lastAccessed) / (1000 * 60 * 60 * 24)));
    const daysSinceAssigned = Math.max(1, Math.floor((now - assignedAt) / (1000 * 60 * 60 * 24)));
    const progress = enrollment.progress || 0;
    const velocity = progress / daysSinceAssigned;
    const attempts = enrollment.attempts || 0;
    const userStat = memberStats.get(userId) || { total: 0, completed: 0 };
    const userCompletionRate = userStat.total ? userStat.completed / userStat.total : 0;
    const reasons: string[] = [];
    let score = 0;

    if (enrollment.status === 'overdue') {
      score += 40;
      reasons.push('Overdue enrollment');
    }
    if (daysSinceLast > 14) {
      score += 30;
      reasons.push('Inactive > 14 days');
    } else if (daysSinceLast > 7) {
      score += 20;
      reasons.push('Inactive > 7 days');
    }
    if (velocity < 0.5) {
      score += 25;
      reasons.push('Very slow progress');
    } else if (velocity < 1) {
      score += 15;
      reasons.push('Slow progress');
    }
    if (attempts >= 3) {
      score += 10;
      reasons.push('Multiple attempts');
    }
    if (userCompletionRate < 0.5) {
      score += 10;
      reasons.push('Low historical completion');
    }
    score = Math.min(100, score);
    return { score, reasons };
  };

  for (const candidate of thresholdCandidates) {
    let tp = 0;
    let fp = 0;
    let fn = 0;
    for (const enrollment of completedOrOverdue) {
      const prediction = scoreForEnrollment(enrollment).score >= candidate;
      const actual = enrollment.status === 'overdue' || enrollment.status === 'failed';
      if (prediction && actual) tp += 1;
      if (prediction && !actual) fp += 1;
      if (!prediction && actual) fn += 1;
    }
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    if (f1 > bestF1) {
      bestF1 = f1;
      bestThreshold = candidate;
    }
  }

  let modelPrecision = 0;
  let modelRecall = 0;
  if (completedOrOverdue.length > 0) {
    let tp = 0;
    let fp = 0;
    let fn = 0;
    for (const enrollment of completedOrOverdue) {
      const prediction = scoreForEnrollment(enrollment).score >= bestThreshold;
      const actual = enrollment.status === 'overdue' || enrollment.status === 'failed';
      if (prediction && actual) tp += 1;
      if (prediction && !actual) fp += 1;
      if (!prediction && actual) fn += 1;
    }
    modelPrecision = tp + fp > 0 ? tp / (tp + fp) : 0;
    modelRecall = tp + fn > 0 ? tp / (tp + fn) : 0;
  }

  for (const enrollment of enrollments) {
    const userId = enrollment.userId;
    const { score, reasons } = scoreForEnrollment(enrollment);
    const riskLevel = score >= bestThreshold ? 'high' : score >= 45 ? 'medium' : 'low';
    if (riskLevel !== 'low') atRiskEnrollments.push(enrollment.id);

    riskScores.push({
      id: `${orgId}_${enrollment.id}`,
      orgId,
      userId,
      enrollmentId: enrollment.id,
      courseId: enrollment.courseId,
      riskScore: score,
      riskLevel,
      reasons,
      updatedAt: now
    });
  }

  const complianceRiskScore = total ? Math.round(((overdue + atRiskEnrollments.length) / total) * 100) : 0;
  const contentEffectiveness = Math.round((completionRate * avgAssessmentScore) / 100);

  const analytics = {
    orgId,
    totalEnrollments: total,
    completionRate,
    overdueCount: overdue,
    assessmentPassRate: passRate,
    avgTimeToCompleteMs,
    complianceRiskScore,
    avgAssessmentScore,
    contentEffectiveness,
    riskModel: {
      version: 'v1.0',
      threshold: bestThreshold,
      precision: Math.round(modelPrecision * 100) / 100,
      recall: Math.round(modelRecall * 100) / 100,
      f1: Math.round(bestF1 * 100) / 100,
      trainedAt: now
    },
    updatedAt: Date.now()
  };
  await db.collection('orgAnalytics').doc(orgId).set(analytics, { merge: true });
  await db.collection('organizations').doc(orgId).collection('orgAnalytics').doc('summary').set(analytics, { merge: true });

  const complianceSnapshotRef = db.collection('complianceSnapshots').doc();
  const complianceSnapshot = {
    id: complianceSnapshotRef.id,
    orgId,
    completionRate,
    overdueCount: overdue,
    assessmentPassRate: passRate,
    createdAt: Date.now()
  };
  await complianceSnapshotRef.set(complianceSnapshot);
  await db.collection('organizations').doc(orgId).collection('complianceSnapshots').doc(complianceSnapshotRef.id).set(complianceSnapshot);

  for (const risk of riskScores) {
    await db.collection('riskScores').doc(risk.id).set(risk, { merge: true });
    await db.collection('organizations').doc(orgId).collection('riskScores').doc(risk.id).set(risk, { merge: true });
  }

  const recommendations: Array<{ id: string; orgId: string; audience: 'learner' | 'manager' | 'ld'; title: string; message: string; severity: 'low' | 'medium' | 'high'; createdAt: number; userId?: string }> = [];
  if (atRiskEnrollments.length > 0) {
    recommendations.push({
      id: `${orgId}_manager_risk_${now}`,
      orgId,
      audience: 'manager',
      title: 'Learners at risk',
      message: `${atRiskEnrollments.length} learners are at risk of missing deadlines. Consider reminders or coaching.`,
      severity: 'high',
      createdAt: now
    });
  }
  if (contentEffectiveness < 60) {
    recommendations.push({
      id: `${orgId}_ld_content_${now}`,
      orgId,
      audience: 'ld',
      title: 'Content effectiveness low',
      message: `Content effectiveness score is ${contentEffectiveness}%. Review low-performing modules.`,
      severity: 'medium',
      createdAt: now
    });
  }
  const courseBuckets = new Map<string, { total: number; completed: number }>();
  for (const enrollment of enrollments) {
    const stat = courseBuckets.get(enrollment.courseId) || { total: 0, completed: 0 };
    stat.total += 1;
    if (enrollment.status === 'completed') stat.completed += 1;
    courseBuckets.set(enrollment.courseId, stat);
  }
  const topCourse = Array.from(courseBuckets.entries())
    .map(([courseId, stat]) => ({
      courseId,
      completionRate: stat.total ? Math.round(stat.completed / stat.total * 100) : 0
    }))
    .sort((a, b) => b.completionRate - a.completionRate)[0];
  const topCourseTitle = topCourse
    ? (courses.find((c) => c.id === topCourse.courseId)?.title || 'recommended course')
    : 'recommended course';
  const sampleMember = members[0];
  if (completionRate < 70 && sampleMember) {
    recommendations.push({
      id: `${orgId}_learner_completion_${now}`,
      orgId,
      audience: 'learner',
      title: 'Boost completion',
      message: `Based on your role (${sampleMember.role || 'learner'}), we recommend ${topCourseTitle}.`,
      severity: 'low',
      createdAt: now
    });
  }

  for (const rec of recommendations) {
    await db.collection('analyticsRecommendations').doc(rec.id).set(rec, { merge: true });
    await db.collection('organizations').doc(orgId).collection('analyticsRecommendations').doc(rec.id).set(rec, { merge: true });
  }

  for (const risk of riskScores.filter((r) => r.riskLevel === 'high')) {
    const recId = `${orgId}_learner_risk_${risk.enrollmentId}`;
    const learnerRec = {
      id: recId,
      orgId,
      audience: 'learner' as const,
      userId: risk.userId,
      title: 'You are at risk',
      message: 'You are behind on your training. Set a target date to finish this week.',
      severity: 'high' as const,
      createdAt: now
    };
    await db.collection('analyticsRecommendations').doc(recId).set(learnerRec, { merge: true });
    await db.collection('organizations').doc(orgId).collection('analyticsRecommendations').doc(recId).set(learnerRec, { merge: true });
    await createNotification({
      orgId,
      userId: risk.userId,
      type: 'risk_alert',
      title: 'Training at risk',
      message: 'You are at risk of missing your training deadline.',
      data: { enrollmentId: risk.enrollmentId, courseId: risk.courseId }
    });

    const member = members.find((m: any) => (m.userId || m.id) === risk.userId);
    const managerId = member?.managerId;
    if (managerId) {
      const managerRecId = `${orgId}_manager_risk_${risk.enrollmentId}_${managerId}`;
      const managerRec = {
        id: managerRecId,
        orgId,
        audience: 'manager' as const,
        userId: managerId,
        title: 'Team member at risk',
        message: `${member?.name || 'A learner'} is at risk of missing a deadline.`,
        severity: 'high' as const,
        createdAt: now
      };
      await db.collection('analyticsRecommendations').doc(managerRecId).set(managerRec, { merge: true });
      await db.collection('organizations').doc(orgId).collection('analyticsRecommendations').doc(managerRecId).set(managerRec, { merge: true });
      await createNotification({
        orgId,
        userId: managerId,
        type: 'risk_alert_manager',
        title: 'Team member at risk',
        message: `${member?.name || 'A learner'} is at risk of missing a training deadline.`,
        data: { enrollmentId: risk.enrollmentId, courseId: risk.courseId, learnerId: risk.userId }
      });
    }
  }

  const questionStats = new Map<string, { total: number; incorrect: number; courseId?: string; assessmentId?: string }>();
  for (const result of assessments) {
    const answers = Array.isArray(result.metadata?.questionResults) ? result.metadata.questionResults : [];
    for (const answer of answers) {
      const key = `${result.assessmentId}_${answer.questionId}`;
      const entry = questionStats.get(key) || { total: 0, incorrect: 0, courseId: result.courseId, assessmentId: result.assessmentId };
      entry.total += 1;
      if (!answer.isCorrect) entry.incorrect += 1;
      questionStats.set(key, entry);
    }
  }
  for (const [key, entry] of questionStats.entries()) {
    const difficulty = entry.total > 0 ? Math.round((entry.incorrect / entry.total) * 100) : 0;
    const record = {
      id: `${orgId}_${key}`,
      orgId,
      courseId: entry.courseId,
      assessmentId: entry.assessmentId,
      questionId: key.split('_').slice(1).join('_'),
      attempts: entry.total,
      incorrectRate: difficulty,
      updatedAt: now
    };
    await db.collection('questionAnalytics').doc(record.id).set(record, { merge: true });
    await db.collection('organizations').doc(orgId).collection('questionAnalytics').doc(record.id).set(record, { merge: true });
  }

  const moduleStats = new Map<string, { courseId: string; moduleId: string; started: number; completed: number }>();
  for (const entry of moduleProgress) {
    const key = `${entry.courseId}_${entry.moduleId}`;
    const stat = moduleStats.get(key) || { courseId: entry.courseId, moduleId: entry.moduleId, started: 0, completed: 0 };
    if (entry.status === 'started' || entry.status === 'in_progress') stat.started += 1;
    if (entry.status === 'completed') stat.completed += 1;
    moduleStats.set(key, stat);
  }
  for (const stat of moduleStats.values()) {
    const record = {
      id: `${orgId}_${stat.courseId}_${stat.moduleId}`,
      orgId,
      courseId: stat.courseId,
      moduleId: stat.moduleId,
      started: stat.started,
      completed: stat.completed,
      dropOffRate: stat.started > 0 ? Math.round(((stat.started - stat.completed) / stat.started) * 100) : 0,
      updatedAt: now
    };
    await db.collection('moduleAnalytics').doc(record.id).set(record, { merge: true });
    await db.collection('organizations').doc(orgId).collection('moduleAnalytics').doc(record.id).set(record, { merge: true });
  }

  const days = 30;
  const timeSeries: Array<{ date: string; completions: number; passRate: number }> = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const dayStart = new Date(now - i * 24 * 60 * 60 * 1000);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    const completions = enrollments.filter((e) => e.completedAt && e.completedAt >= dayStart.getTime() && e.completedAt <= dayEnd.getTime()).length;
    const dayAssessments = assessments.filter((a) => a.createdAt && a.createdAt >= dayStart.getTime() && a.createdAt <= dayEnd.getTime());
    const dayPassRate = dayAssessments.length
      ? Math.round(dayAssessments.filter((a) => a.passed).length / dayAssessments.length * 100)
      : 0;
    timeSeries.push({
      date: dayStart.toISOString().slice(0, 10),
      completions,
      passRate: dayPassRate
    });
  }
  const seriesDoc = {
    id: `${orgId}_last30`,
    orgId,
    points: timeSeries,
    updatedAt: now
  };
  await db.collection('analyticsTimeSeries').doc(seriesDoc.id).set(seriesDoc, { merge: true });
  await db.collection('organizations').doc(orgId).collection('analyticsTimeSeries').doc(seriesDoc.id).set(seriesDoc, { merge: true });
};

export const analyticsRefreshScheduler = onSchedule('every monday 07:00', async () => {
  try {
    const orgs = await db.collection('organizations').get();
    if (orgs.empty) return;
    for (const orgDoc of orgs.docs) {
      const jobId = await startAnalyticsJob(orgDoc.id, 'scheduled');
      try {
        await computeOrgAnalytics(orgDoc.id);
        await completeAnalyticsJob(orgDoc.id, jobId, 'success');
      } catch (error) {
        await completeAnalyticsJob(orgDoc.id, jobId, 'failed', error instanceof Error ? error.message : 'Failed analytics run');
      }
    }
  } catch (error) {
    await logSystemError({
      functionName: 'analyticsRefreshScheduler',
      message: error instanceof Error ? error.message : 'Failed analytics refresh'
    });
  }
});

export const archiveOldCoursesScheduler = onSchedule('0 3 1 * *', async () => {
  try {
    const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 365 * 2;
    const coursesSnap = await db.collection('courses')
      .where('updatedAt', '<=', cutoff)
      .where('status', 'in', ['draft', 'published'])
      .get();
    for (const courseDoc of coursesSnap.docs) {
      const course = courseDoc.data() as any;
      await courseDoc.ref.update({ status: 'archived', archivedAt: Date.now() });
      if (course.orgId) {
        await db.collection('organizations')
          .doc(course.orgId)
          .collection('courses')
          .doc(courseDoc.id)
          .set({ status: 'archived', archivedAt: Date.now() }, { merge: true });
      }
    }
  } catch (error) {
    await logSystemError({
      functionName: 'archiveOldCoursesScheduler',
      message: error instanceof Error ? error.message : 'Failed course archive'
    });
  }
});

export const retentionPolicyScheduler = onSchedule('0 4 1 * *', async () => {
  try {
    const orgs = await db.collection('organizations').get();
    for (const orgDoc of orgs.docs) {
      const org = orgDoc.data() as any;
      const policies = org.settings?.compliance?.retentionPolicies || [];
      for (const policy of policies) {
        const fieldMap: Record<string, string> = {
          enrollment: 'assignedAt',
          assessment: 'createdAt',
          certificate: 'issuedAt',
          auditLog: 'createdAt',
          progress: 'startedAt',
          user: 'joinedAt',
          course: 'updatedAt'
        };
        const collectionMap: Record<string, string> = {
          enrollment: 'enrollments',
          assessment: 'assessmentResults',
          certificate: 'certificates',
          auditLog: 'auditLogs',
          progress: 'progress',
          user: 'orgMembers',
          course: 'courses'
        };
        const field = fieldMap[policy.entityType];
        const collectionName = collectionMap[policy.entityType];
        if (!field || !collectionName) continue;
        const cutoff = Date.now() - policy.retentionPeriod * 24 * 60 * 60 * 1000;
        const snapshot = await db.collection(collectionName)
          .where('orgId', '==', orgDoc.id)
          .where(field, '<=', cutoff)
          .limit(200)
          .get();
        for (const docRef of snapshot.docs) {
          if (policy.action === 'delete') {
            await docRef.ref.delete();
            await db.collection('organizations').doc(orgDoc.id).collection(collectionName).doc(docRef.id).delete().catch(() => {});
          } else if (policy.action === 'anonymize') {
            const anonymized = policy.entityType === 'user'
              ? { name: 'Anonymized', email: null, anonymizedAt: Date.now() }
              : { anonymizedAt: Date.now(), anonymized: true };
            await docRef.ref.set(anonymized, { merge: true });
            await db.collection('organizations').doc(orgDoc.id).collection(collectionName).doc(docRef.id).set(anonymized, { merge: true });
          } else {
            await docRef.ref.set({ archivedAt: Date.now(), archived: true }, { merge: true });
            await db.collection('organizations').doc(orgDoc.id).collection(collectionName).doc(docRef.id).set({ archivedAt: Date.now(), archived: true }, { merge: true });
          }
        }
      }
    }
  } catch (error) {
    await logSystemError({
      functionName: 'retentionPolicyScheduler',
      message: error instanceof Error ? error.message : 'Failed retention policy'
    });
  }
});

const isRegression = (from: string, to: string) => {
  if (from === to) return false;
  if (to === 'completed') return false;
  const order: Record<string, number> = {
    not_started: 0,
    in_progress: 1,
    overdue: 2,
    failed: 3,
    completed: 4,
    expired: 5
  };
  const fromRank = order[from] ?? 0;
  const toRank = order[to] ?? 0;
  if (from === 'overdue' && to === 'failed') return false;
  return toRank < fromRank;
};

const enforceEnrollmentStatus = async (
  beforeData: FirebaseFirestore.DocumentData,
  afterData: FirebaseFirestore.DocumentData,
  ref: FirebaseFirestore.DocumentReference,
  orgId: string
) => {
  const beforeStatus = beforeData.status;
  const afterStatus = afterData.status;
  if (!beforeStatus || !afterStatus) return;
  if (!isRegression(beforeStatus, afterStatus)) return;
  await ref.update({ status: beforeStatus, updatedAt: Date.now() });
  await db.collection('organizations')
    .doc(orgId)
    .collection('enrollments')
    .doc(ref.id)
    .set({ status: beforeStatus, updatedAt: Date.now() }, { merge: true });
  await db.collection('auditLogs').add({
    orgId,
    actorId: 'system',
    actorName: 'System',
    action: 'enrollment_status_regression_blocked',
    targetType: 'enrollment',
    targetId: ref.id,
    targetName: beforeData.userId,
    metadata: { from: beforeStatus, to: afterStatus },
    createdAt: Date.now()
  });
  await dispatchWebhooks(orgId, 'certificate.issued', {
    certificateId: certRef.id,
    userId: enrollment.userId,
    courseId: enrollment.courseId,
    issuedAt: Date.now()
  });
};

export const enrollmentStatusGuard = onDocumentUpdated('enrollments/{enrollmentId}', async (event) => {
  if (!event.data) return;
  const beforeData = event.data.before.data() || {};
  const afterData = event.data.after.data() || {};
  const orgId = afterData.orgId || beforeData.orgId;
  if (!orgId) return;
  await enforceEnrollmentStatus(beforeData, afterData, event.data.after.ref, orgId);
});

export const enrollmentStatusGuardOrg = onDocumentUpdated('organizations/{orgId}/enrollments/{enrollmentId}', async (event) => {
  if (!event.data) return;
  const beforeData = event.data.before.data() || {};
  const afterData = event.data.after.data() || {};
  const orgId = event.params.orgId;
  await enforceEnrollmentStatus(beforeData, afterData, event.data.after.ref, orgId);
});

export const assessmentResultGuard = onDocumentUpdated('assessmentResults/{resultId}', async (event) => {
  if (!event.data) return;
  const beforeData = event.data.before.data() || {};
  const afterData = event.data.after.data() || {};
  const orgId = afterData.orgId || beforeData.orgId;
  if (!orgId) return;
  if (afterData.score < beforeData.score || afterData.attempts < beforeData.attempts) {
    await event.data.after.ref.update({
      score: beforeData.score,
      attempts: beforeData.attempts,
      updatedAt: Date.now()
    });
    await db.collection('organizations')
      .doc(orgId)
      .collection('assessments')
      .doc(event.params.resultId)
      .set({
        score: beforeData.score,
        attempts: beforeData.attempts,
        updatedAt: Date.now()
      }, { merge: true });
    await createAuditLogEntry({
      orgId,
      actorId: 'system',
      actorName: 'System',
      action: 'assessment_update_blocked',
      targetType: 'assessment',
      targetId: event.params.resultId,
      metadata: { reason: 'score_or_attempts_regression' }
    });
  }
});

export const assessmentResultGuardOrg = onDocumentUpdated('organizations/{orgId}/assessments/{resultId}', async (event) => {
  if (!event.data) return;
  const beforeData = event.data.before.data() || {};
  const afterData = event.data.after.data() || {};
  const orgId = event.params.orgId;
  if (afterData.score < beforeData.score || afterData.attempts < beforeData.attempts) {
    await event.data.after.ref.update({
      score: beforeData.score,
      attempts: beforeData.attempts,
      updatedAt: Date.now()
    });
    await db.collection('assessmentResults')
      .doc(event.params.resultId)
      .set({
        score: beforeData.score,
        attempts: beforeData.attempts,
        updatedAt: Date.now()
      }, { merge: true });
    await createAuditLogEntry({
      orgId,
      actorId: 'system',
      actorName: 'System',
      action: 'assessment_update_blocked',
      targetType: 'assessment',
      targetId: event.params.resultId,
      metadata: { reason: 'score_or_attempts_regression' }
    });
  }
});

const issueCertificateForEnrollment = async (enrollment: any, enrollmentId: string, orgId: string) => {
  if (enrollment.certificate) return;
  let courseSnap = await db.collection('courses').doc(enrollment.courseId).get();
  if (!courseSnap.exists) {
    courseSnap = await db.collection('organizations').doc(orgId).collection('courses').doc(enrollment.courseId).get();
  }
  const course = courseSnap.exists ? courseSnap.data() : null;
  if (course && course.settings && course.settings.enableCertificate === false) return;
  const courseTitle = course?.title || 'Course';
  const certRef = db.collection('certificates').doc();
  const certNumber = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  const verificationCode = `VER-${Math.random().toString(36).substr(2, 10).toUpperCase()}`;
  const baseUrl = process.env.PUBLIC_BASE_URL || 'https://tuutta.app';
  const verificationUrl = `${baseUrl}/verify/${certNumber}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(verificationUrl)}`;

  const assessmentSnap = await db.collection('assessmentResults')
    .where('orgId', '==', orgId)
    .where('enrollmentId', '==', enrollmentId)
    .get();
  const assessmentResultIds = assessmentSnap.docs.map(doc => doc.id);
  const assessmentScores = assessmentSnap.docs.map(doc => (doc.data().score as number) || 0);
  const assessmentScore = assessmentScores.length
    ? Math.round(assessmentScores.reduce((sum, value) => sum + value, 0) / assessmentScores.length)
    : undefined;

  const certificate = {
    id: certRef.id,
    odId: orgId,
    orgId,
    userId: enrollment.userId,
    courseId: enrollment.courseId,
    title: courseTitle,
    issuedAt: Date.now(),
    certificateNumber: certNumber,
    verificationCode,
    verificationUrl,
    qrImageUrl,
    evidence: {
      assessmentResultIds,
      completionProgress: enrollment.progress,
      issuedBy: 'system',
      assessmentScore,
      courseVersion: course?.version
    }
  };

  await certRef.set(certificate);
  await db.collection('organizations').doc(orgId).collection('certificates').doc(certRef.id).set(certificate);
  await db.collection('enrollments').doc(enrollmentId).set({ certificate }, { merge: true });
  await db.collection('organizations').doc(orgId).collection('enrollments').doc(enrollmentId).set({ certificate }, { merge: true });
  await db.collection('auditLogs').add({
    orgId,
    actorId: 'system',
    actorName: 'System',
    action: 'certificate_issued',
    targetType: 'certificate',
    targetId: certRef.id,
    targetName: enrollment.userId,
    metadata: { courseId: enrollment.courseId },
    createdAt: Date.now()
  });
  await createNotification({
    orgId,
    userId: enrollment.userId,
    type: 'certificate_issued',
    title: 'Certificate issued',
    message: `Your certificate for ${courseTitle} is ready.`,
    data: { courseId: enrollment.courseId, certificateId: certRef.id }
  });

  if (enrollment.dueDate && (enrollment.completedAt || Date.now()) <= enrollment.dueDate && !enrollment.complianceAttestationIssued) {
    const attestationRef = db.collection('certificates').doc();
    const attestationNumber = `COMP-${Date.now()}-${Math.random().toString(36).substr(2, 7).toUpperCase()}`;
    const attestationCode = `VER-${Math.random().toString(36).substr(2, 10).toUpperCase()}`;
    const attestationUrl = `${baseUrl}/verify/${attestationNumber}`;
    const attestation = {
      id: attestationRef.id,
      odId: orgId,
      orgId,
      userId: enrollment.userId,
      courseId: enrollment.courseId,
      title: `Compliance Attestation - ${courseTitle}`,
      issuedAt: Date.now(),
      certificateNumber: attestationNumber,
      verificationCode: attestationCode,
      verificationUrl: attestationUrl,
      qrImageUrl: `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(attestationUrl)}`,
      evidence: {
        assessmentResultIds,
        completionProgress: enrollment.progress,
        issuedBy: 'system',
        assessmentScore,
        courseVersion: course?.version,
        complianceAttestation: true
      }
    };
    await attestationRef.set(attestation);
    await db.collection('organizations').doc(orgId).collection('certificates').doc(attestationRef.id).set(attestation);
    await db.collection('enrollments').doc(enrollmentId).set({ complianceAttestationIssued: true }, { merge: true });
    await db.collection('organizations').doc(orgId).collection('enrollments').doc(enrollmentId).set({ complianceAttestationIssued: true }, { merge: true });
    await createNotification({
      orgId,
      userId: enrollment.userId,
      type: 'compliance_attestation',
      title: 'Compliance attestation issued',
      message: `Compliance attestation for ${courseTitle} has been issued.`,
      data: { courseId: enrollment.courseId, certificateId: attestationRef.id }
    });
  }
};

const issuePathCertificate = async (orgId: string, userId: string, learningPathId: string) => {
  let pathSnap = await db.collection('learningPaths').doc(learningPathId).get();
  if (!pathSnap.exists) {
    pathSnap = await db.collection('organizations').doc(orgId).collection('learningPaths').doc(learningPathId).get();
  }
  if (!pathSnap.exists) return;
  const path = pathSnap.data() as { id: string; title: string; courses: { courseId: string; isRequired: boolean }[]; certification?: { enabled: boolean; title?: string; validityPeriod?: number } };
  if (path.certification?.enabled === false) return;

  const enrollmentsSnap = await db.collection('enrollments')
    .where('orgId', '==', orgId)
    .where('userId', '==', userId)
    .where('learningPathId', '==', learningPathId)
    .get();
  const enrollments = enrollmentsSnap.docs.map(doc => doc.data());
  const requiredCourseIds = (path.courses || []).filter((c) => c.isRequired !== false).map((c) => c.courseId);
  const completedCourses = enrollments.filter((e) => e.status === 'completed').map((e) => e.courseId);
  const allComplete = requiredCourseIds.length > 0 && requiredCourseIds.every((id) => completedCourses.includes(id));
  if (!allComplete) return;

  const existingCert = await db.collection('certificates')
    .where('orgId', '==', orgId)
    .where('userId', '==', userId)
    .where('learningPathId', '==', learningPathId)
    .limit(1)
    .get();
  if (!existingCert.empty) return;

  const certRef = db.collection('certificates').doc();
  const certNumber = `PATH-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  const verificationCode = `VER-${Math.random().toString(36).substr(2, 10).toUpperCase()}`;
  const baseUrl = process.env.PUBLIC_BASE_URL || 'https://tuutta.app';
  const verificationUrl = `${baseUrl}/verify/${certNumber}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(verificationUrl)}`;
  const expiresAt = path.certification?.validityPeriod
    ? Date.now() + path.certification.validityPeriod * 24 * 60 * 60 * 1000
    : undefined;

  const certificate = {
    id: certRef.id,
    odId: orgId,
    orgId,
    userId,
    learningPathId,
    title: path.certification?.title || `Learning Path Certificate - ${path.title}`,
    issuedAt: Date.now(),
    expiresAt,
    certificateNumber: certNumber,
    verificationCode,
    verificationUrl,
    qrImageUrl,
    evidence: {
      issuedBy: 'system',
      complianceAttestation: false
    }
  };

  await certRef.set(certificate);
  await db.collection('organizations').doc(orgId).collection('certificates').doc(certRef.id).set(certificate);
  await db.collection('auditLogs').add({
    orgId,
    actorId: 'system',
    actorName: 'System',
    action: 'learning_path_certificate_issued',
    targetType: 'certificate',
    targetId: certRef.id,
    targetName: userId,
    metadata: { learningPathId },
    createdAt: Date.now()
  });
  await createNotification({
    orgId,
    userId,
    type: 'learning_path_certificate',
    title: 'Learning path certificate issued',
    message: `Your learning path certificate for ${path.title} is ready.`,
    data: { learningPathId, certificateId: certRef.id }
  });
};

export const enrollmentCompletionIssuer = onDocumentUpdated('enrollments/{enrollmentId}', async (event) => {
  if (!event.data) return;
  const beforeData = event.data.before.data() || {};
  const afterData = event.data.after.data() || {};
  if (beforeData.status === 'completed' || afterData.status !== 'completed') return;
  const orgId = afterData.orgId || beforeData.orgId;
  if (!orgId) return;
  await issueCertificateForEnrollment(afterData, event.params.enrollmentId, orgId);
  if (afterData.learningPathId) {
    await issuePathCertificate(orgId, afterData.userId, afterData.learningPathId);
  }
  await dispatchWebhooks(orgId, 'enrollment.completed', {
    enrollmentId: event.params.enrollmentId,
    userId: afterData.userId,
    courseId: afterData.courseId,
    completedAt: afterData.completedAt
  });
});

export const enrollmentCompletionIssuerOrg = onDocumentUpdated('organizations/{orgId}/enrollments/{enrollmentId}', async (event) => {
  if (!event.data) return;
  const beforeData = event.data.before.data() || {};
  const afterData = event.data.after.data() || {};
  if (beforeData.status === 'completed' || afterData.status !== 'completed') return;
  const orgId = event.params.orgId;
  await issueCertificateForEnrollment(afterData, event.params.enrollmentId, orgId);
  if (afterData.learningPathId) {
    await issuePathCertificate(orgId, afterData.userId, afterData.learningPathId);
  }
  await dispatchWebhooks(orgId, 'enrollment.completed', {
    enrollmentId: event.params.enrollmentId,
    userId: afterData.userId,
    courseId: afterData.courseId,
    completedAt: afterData.completedAt
  });
});

const handleAssessmentResultCreated = async (data: FirebaseFirestore.DocumentData, orgIdOverride?: string) => {
  const orgId = orgIdOverride || data.orgId;
  if (!orgId) return;
  const userId = data.userId;
  const enrollmentId = data.enrollmentId;
  const courseId = data.courseId;
  const score = typeof data.score === 'number' ? data.score : 0;
  const attempts = typeof data.attempts === 'number' ? data.attempts : 1;
  const passed = Boolean(data.passed);
  const metadata = data.metadata || {};

  await createAuditLogEntry({
    orgId,
    actorId: userId,
    actorName: 'Learner',
    action: 'assessment.submitted',
    targetType: 'assessment',
    targetId: data.assessmentId,
    targetName: userId,
    metadata: { enrollmentId, courseId, score, passed }
  });
  await createAuditLogEntry({
    orgId,
    actorId: userId,
    actorName: 'Learner',
    action: passed ? 'assessment.passed' : 'assessment.failed',
    targetType: 'assessment',
    targetId: data.assessmentId,
    targetName: userId,
    metadata: { enrollmentId, courseId, score }
  });
  await dispatchWebhooks(orgId, passed ? 'assessment.passed' : 'assessment.failed', {
    assessmentId: data.assessmentId,
    enrollmentId,
    courseId,
    userId,
    score,
    passed
  });

  const competencyTags = Array.isArray(metadata.competencyTags) ? metadata.competencyTags : [];
  const recertifyDays = typeof metadata.recertifyDays === 'number' ? metadata.recertifyDays : null;
  const expiresAt = recertifyDays ? Date.now() + recertifyDays * 24 * 60 * 60 * 1000 : undefined;

  for (const tag of competencyTags) {
    await createCompetencyScore({
      orgId,
      userId,
      courseId,
      enrollmentId,
      assessmentId: data.assessmentId,
      competencyTag: String(tag),
      score,
      assessedAt: Date.now(),
      expiresAt
    });
  }

  const passingScore = typeof metadata.passingScore === 'number' ? metadata.passingScore : 70;
  const weakTopics = Array.isArray(metadata.weakTopics) ? metadata.weakTopics : [];
  if (!passed && score < passingScore) {
    await createRemediationAssignment({
      orgId,
      userId,
      enrollmentId,
      courseId,
      moduleId: metadata.moduleId,
      lessonId: metadata.lessonId,
      status: 'assigned',
      reason: weakTopics.length
        ? `Weak topics: ${weakTopics.slice(0, 4).join(', ')}`
        : `Score ${score} below passing ${passingScore}`,
      scheduledReassessmentAt: Date.now() + 7 * 24 * 60 * 60 * 1000
    });
    await sendRemediationNotification({
      orgId,
      userId,
      title: 'Remediation assigned',
      message: 'You have been assigned remediation content based on your assessment results.',
      data: { enrollmentId, courseId }
    });
  } else if (passed) {
    await createNotification({
      orgId,
      userId,
      type: 'assessment_passed',
      title: 'Assessment passed',
      message: 'Great job! You passed the assessment.',
      data: { enrollmentId, courseId, assessmentId: data.assessmentId, score }
    });
  }

  if (!passed && attempts >= 2) {
    const memberSnap = await db.collection('orgMembers')
      .where('orgId', '==', orgId)
      .where('userId', '==', userId)
      .limit(1)
      .get();
    const member = memberSnap.empty ? null : memberSnap.docs[0].data();
    const managerId = member?.managerId;
    if (managerId) {
      await sendRemediationNotification({
        orgId,
        userId: managerId,
        title: 'Learner needs support',
        message: `${member?.name || 'A learner'} has failed an assessment multiple times.`,
        data: { enrollmentId, courseId, learnerId: userId }
      });
    }
  }

  if (passed && metadata.assessmentRole === 'module' && metadata.moduleId) {
    let moduleTitle = metadata.moduleId;
    if (courseId && metadata.moduleId) {
      let courseSnap = await db.collection('courses').doc(courseId).get();
      if (!courseSnap.exists) {
        courseSnap = await db.collection('organizations').doc(orgId).collection('courses').doc(courseId).get();
      }
      const course = courseSnap.exists ? courseSnap.data() : null;
      const module = course?.modules?.find((item: any) => item.id === metadata.moduleId);
      if (module?.title) moduleTitle = module.title;
    }
    await createCompetencyBadge({
      orgId,
      userId,
      courseId,
      moduleId: metadata.moduleId,
      assessmentId: data.assessmentId,
      title: `${moduleTitle} competency`,
      competencyTags: competencyTags.length ? competencyTags : undefined
    });
  }
};

export const assessmentResultCreated = onDocumentCreated('assessmentResults/{resultId}', async (event) => {
  if (!event.data) return;
  await handleAssessmentResultCreated(event.data.data());
});

export const assessmentResultCreatedOrg = onDocumentCreated('organizations/{orgId}/assessments/{resultId}', async (event) => {
  if (!event.data) return;
  await handleAssessmentResultCreated(event.data.data(), event.params.orgId);
});

export const notificationDispatcher = onSchedule('every 5 minutes', async () => {
  const snapshot = await db.collection('lmsNotifications')
    .where('status', '==', 'pending')
    .limit(50)
    .get();

  if (snapshot.empty) return;

  for (const docRef of snapshot.docs) {
    const notification = docRef.data() as {
      orgId: string;
      userId: string;
      title: string;
      message: string;
      channels: string[];
    };
    try {
      if (notification.channels.includes('email')) {
        const userSnap = await db.collection('orgMembers')
          .where('orgId', '==', notification.orgId)
          .where('userId', '==', notification.userId)
          .limit(1)
          .get();
        const email = userSnap.empty ? null : userSnap.docs[0].data().email;
        if (email) {
          await sendEmail(notification.orgId, [email], notification.title, `<p>${notification.message}</p>`);
        }
      }

      if (notification.channels.includes('push')) {
        const tokenSnap = await db.collection('pushTokens')
          .where('orgId', '==', notification.orgId)
          .where('userId', '==', notification.userId)
          .get();
        const tokens = tokenSnap.docs.map(doc => doc.data().token).filter(Boolean);
        if (tokens.length > 0) {
          await getMessaging().sendEachForMulticast({
            tokens,
            notification: {
              title: notification.title,
              body: notification.message
            },
            data: {
              orgId: notification.orgId,
              userId: notification.userId
            }
          });
        }
      }

      await docRef.ref.update({ status: 'sent', sentAt: Date.now() });
    } catch (error) {
      await docRef.ref.update({
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Delivery failed',
        sentAt: Date.now()
      });
      await logSystemError({
        orgId: notification.orgId,
        functionName: 'notificationDispatcher',
        message: error instanceof Error ? error.message : 'Notification delivery failed',
        metadata: { notificationId: docRef.id }
      });
    }
  }
});

export const genieEvidenceExport = onCall(async (request) => {
  requireAuth(request.auth);
  const orgId = String(request.data?.orgId || '');
  if (!orgId) {
    throw new HttpsError('invalid-argument', 'orgId is required.');
  }

  const memberDoc = await db.collection('orgMembers').doc(`${orgId}_${request.auth?.uid}`).get();
  if (!memberDoc.exists) {
    throw new HttpsError('permission-denied', 'Org membership required.');
  }

  const startRaw = request.data?.startDate ? Number(request.data.startDate) : null;
  const endRaw = request.data?.endDate ? Number(request.data.endDate) : null;
  const start = startRaw && !Number.isNaN(startRaw) ? startRaw : null;
  const end = endRaw && !Number.isNaN(endRaw) ? endRaw : null;
  const inRange = (ts?: number) => {
    if (!ts) return false;
    if (start && ts < start) return false;
    if (end && ts > end) return false;
    return true;
  };

  const orgSnap = await db.collection('organizations').doc(orgId).get();
  const orgName = orgSnap.exists ? (orgSnap.data()?.name as string) : 'Organization';

  const [membersSnap, coursesSnap, enrollmentsSnap, assessmentSnap, auditSnap, certSnap] = await Promise.all([
    db.collection('orgMembers').where('orgId', '==', orgId).get(),
    db.collection('courses').where('orgId', '==', orgId).get(),
    db.collection('enrollments').where('orgId', '==', orgId).get(),
    db.collection('assessmentResults').where('orgId', '==', orgId).get(),
    db.collection('auditLogs').where('orgId', '==', orgId).get(),
    db.collection('certificates').where('orgId', '==', orgId).get(),
  ]);

  const members = membersSnap.docs.map(doc => doc.data());
  const courses = coursesSnap.docs.map(doc => doc.data());

  const enrollments = enrollmentsSnap.docs.map(doc => doc.data())
    .filter((enrollment) => !start || inRange(enrollment.completedAt || enrollment.assignedAt || enrollment.createdAt));
  const assessmentResults = assessmentSnap.docs.map(doc => doc.data())
    .filter((result) => !start || inRange(result.createdAt));
  const auditLogs = auditSnap.docs.map(doc => doc.data())
    .filter((log) => !start || inRange(log.timestamp || log.createdAt));
  const certificates = certSnap.docs.map(doc => doc.data())
    .filter((cert) => !start || inRange(cert.issuedAt));

  const trainingCompletionColumns = [
    { id: 'learner', label: 'Learner' },
    { id: 'email', label: 'Email' },
    { id: 'course', label: 'Course' },
    { id: 'status', label: 'Status' },
    { id: 'completedAt', label: 'Completed At' },
    { id: 'dueDate', label: 'Due Date' }
  ];

  const assessmentColumns = [
    { id: 'learner', label: 'Learner' },
    { id: 'email', label: 'Email' },
    { id: 'course', label: 'Course' },
    { id: 'assessmentId', label: 'Assessment' },
    { id: 'score', label: 'Score' },
    { id: 'attempts', label: 'Attempts' },
    { id: 'passed', label: 'Passed' },
    { id: 'submittedAt', label: 'Submitted At' }
  ];

  const trainingCompletionData = enrollments
    .filter((enrollment) => enrollment.status === 'completed')
    .map((enrollment) => {
      const member = members.find((m) => m.userId === enrollment.userId);
      const course = courses.find((c) => c.id === enrollment.courseId);
      return {
        learner: member?.name || 'Learner',
        email: member?.email || '-',
        course: course?.title || enrollment.courseId,
        status: enrollment.status,
        completedAt: enrollment.completedAt ? new Date(enrollment.completedAt).toISOString() : '-',
        dueDate: enrollment.dueDate ? new Date(enrollment.dueDate).toISOString() : '-'
      };
    });

  const assessmentData = assessmentResults.map((result) => {
    const member = members.find((m) => m.userId === result.userId);
    const course = courses.find((c) => c.id === result.courseId);
    return {
      learner: member?.name || 'Learner',
      email: member?.email || '-',
      course: course?.title || result.courseId,
      assessmentId: result.assessmentId,
      score: result.score,
      attempts: result.attempts,
      passed: result.passed ? 'Yes' : 'No',
      submittedAt: new Date(result.createdAt).toISOString()
    };
  });

  const zip = new JSZip();

  const summaryBuffer = await createSummaryPdfBuffer({
    orgName,
    generatedAt: new Date().toISOString(),
    recordCount: trainingCompletionData.length,
    dateRange: start || end
      ? `${start ? new Date(start).toISOString().slice(0, 10) : 'Start'} - ${end ? new Date(end).toISOString().slice(0, 10) : 'Now'}`
      : undefined
  });
  zip.file('summary.pdf', summaryBuffer);
  zip.file('completion_records.csv', buildCSV(trainingCompletionColumns, trainingCompletionData));
  zip.file('assessment_scores.csv', buildCSV(assessmentColumns, assessmentData));
  zip.file('audit_log.json', JSON.stringify(auditLogs, null, 2));

  for (const cert of certificates) {
    const member = members.find((m) => m.userId === cert.userId);
    const course = courses.find((c) => c.id === cert.courseId);
    const pdfBuffer = await createCertificatePdfBuffer({
      orgName,
      learnerName: member?.name || 'Learner',
      courseTitle: course?.title || cert.courseId || 'Course',
      issuedAt: cert.issuedAt ? new Date(cert.issuedAt).toISOString().slice(0, 10) : '',
      certificateNumber: cert.certificateNumber || cert.id,
      verificationUrl: cert.verificationUrl || ''
    });
    zip.file(`certificates/${cert.certificateNumber || cert.id}.pdf`, pdfBuffer);
  }

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  const bucket = getStorage().bucket();
  const path = `evidenceExports/${orgId}/audit_export_${Date.now()}.zip`;
  const file = bucket.file(path);
  await file.save(zipBuffer, { contentType: 'application/zip' });

  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });

  return { url, path };
});

export const testOrgWebhook = onCall(async (request) => {
  requireAuth(request.auth);
  const orgId = String(request.data?.orgId || '');
  if (!orgId) {
    throw new HttpsError('invalid-argument', 'orgId is required.');
  }
  const memberDoc = await db.collection('orgMembers').doc(`${orgId}_${request.auth.uid}`).get();
  if (!memberDoc.exists) {
    throw new HttpsError('permission-denied', 'Org membership required.');
  }
  await dispatchWebhooks(orgId, 'webhook.test', {
    message: 'This is a signed test webhook from Tuutta.',
    sentAt: Date.now()
  });
  return { status: 'ok' };
});

export const recalculateAnalytics = onCall(async (request) => {
  requireAuth(request.auth);
  const orgId = String(request.data?.orgId || '');
  if (!orgId) {
    throw new HttpsError('invalid-argument', 'orgId is required.');
  }
  const memberDoc = await db.collection('orgMembers').doc(`${orgId}_${request.auth.uid}`).get();
  if (!memberDoc.exists) {
    throw new HttpsError('permission-denied', 'Org membership required.');
  }
  const jobId = await startAnalyticsJob(orgId, 'manual');
  try {
    await computeOrgAnalytics(orgId);
    await completeAnalyticsJob(orgId, jobId, 'success');
    return { status: 'ok' };
  } catch (error) {
    await completeAnalyticsJob(orgId, jobId, 'failed', error instanceof Error ? error.message : 'Failed analytics run');
    throw new HttpsError('internal', 'Analytics recalculation failed.');
  }
});
