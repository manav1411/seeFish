import { BACKGROUNDS, calculate, MODEL_VERSION, SOURCES } from '../src/model/index';
import { DISCLOSURE_VERSION, type Estimate, type Preferences } from '../src/model/types';

interface D1Result<T = unknown> { results?: T[]; success: boolean }
interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}
interface D1Database { prepare(query: string): D1Statement }
interface AssetFetcher { fetch(request: Request): Promise<Response> }
interface RateLimitBinding { limit(input: { key: string }): Promise<{ success: boolean }> }

export interface Env {
  DB?: D1Database;
  ASSETS?: AssetFetcher;
  RATE_LIMITER?: RateLimitBinding;
}

const MAX_BODY_BYTES = 16_384;
const localLimits = new Map<string, { count: number; expires: number }>();
const cities = new Set(['australia', 'sydney', 'melbourne', 'brisbane', 'perth', 'adelaide', 'canberra', 'hobart', 'darwin']);
const genders = new Set(['men', 'women']);
const backgroundIds = new Set<string>(BACKGROUNDS.map((background) => background.id));
const PREFERENCES_SCHEMA_VERSION = 2;

class ApiError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' },
});

function fail(status: number, message: string): never { throw new ApiError(status, message); }
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function exactKeys(value: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(value).some((key) => !allowed.includes(key))) fail(400, 'Request contains unsupported fields.');
}
function finiteNumber(value: unknown, min: number, max: number, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) fail(400, `Invalid ${label}.`);
  return value;
}
function backgrounds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > backgroundIds.size || value.some((v) => typeof v !== 'string' || !backgroundIds.has(v))) {
    fail(400, 'Invalid backgrounds.');
  }
  return [...new Set(value as string[])];
}
function preferences(value: unknown): Preferences {
  if (!isObject(value)) fail(400, 'Invalid preferences.');
  exactKeys(value, ['gender', 'city', 'age', 'height', 'income', 'backgrounds']);
  if (!genders.has(String(value.gender)) || !cities.has(String(value.city))) fail(400, 'Invalid preferences.');
  if (!Array.isArray(value.age) || value.age.length !== 2) fail(400, 'Invalid age range.');
  const age: [number, number] = [finiteNumber(value.age[0], 18, 80, 'age range'), finiteNumber(value.age[1], 18, 80, 'age range')];
  if (!Number.isInteger(age[0]) || !Number.isInteger(age[1]) || age[0] > age[1]) fail(400, 'Invalid age range.');
  let height: [number, number] | null = null;
  if (value.height !== null) {
    if (!Array.isArray(value.height) || value.height.length !== 2) fail(400, 'Invalid height range.');
    height = [finiteNumber(value.height[0], 140, 210, 'height range'), finiteNumber(value.height[1], 140, 210, 'height range')];
    if (height[0] > height[1]) fail(400, 'Invalid height range.');
  }
  let income: [number, number] | null = null;
  if (value.income !== null) {
    if (!Array.isArray(value.income) || value.income.length !== 2) fail(400, 'Invalid income range.');
    income = [finiteNumber(value.income[0], 0, 182_000, 'income range'), finiteNumber(value.income[1], 0, 182_000, 'income range')];
    if (!Number.isInteger(income[0]) || !Number.isInteger(income[1]) || income[0] > income[1]) fail(400, 'Invalid income range.');
  }
  return { gender: value.gender as Preferences['gender'], city: value.city as Preferences['city'], age, height, income, backgrounds: backgrounds(value.backgrounds) };
}
function storedPreferences(value: unknown): Preferences {
  if (isObject(value) && value.schemaVersion === PREFERENCES_SCHEMA_VERSION && 'preferences' in value) return preferences(value.preferences);
  return preferences(value);
}
async function body(request: Request): Promise<Record<string, unknown>> {
  if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) fail(415, 'Content-Type must be application/json.');
  const length = Number(request.headers.get('content-length') || 0);
  if (length > MAX_BODY_BYTES) fail(413, 'Request body is too large.');
  const reader = request.body?.getReader();
  if (!reader) fail(400, 'A request body is required.');
  const decoder = new TextDecoder(); let size = 0; let text = '';
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > MAX_BODY_BYTES) { await reader.cancel(); fail(413, 'Request body is too large.'); }
    text += decoder.decode(chunk.value, { stream: true });
  }
  text += decoder.decode();
  try { const value: unknown = JSON.parse(text); if (!isObject(value)) fail(400, 'Expected a JSON object.'); return value; }
  catch (error) { if (error instanceof ApiError) throw error; fail(400, 'Invalid JSON.'); }
}
function requireWriteOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) fail(403, 'Cross-origin writes are not allowed.');
}
function capability(request: Request): string {
  const match = /^Bearer ([A-Za-z0-9_-]{43,128})$/.exec(request.headers.get('authorization') || '');
  if (!match) fail(401, 'A valid contribution capability is required.');
  return match[1];
}
async function hashCapability(secret: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function requireDb(env: Env): D1Database {
  if (!env.DB) fail(503, 'Contribution capture is currently unavailable.');
  return env.DB;
}
async function rateLimit(request: Request, env: Env, key: string) {
  const clientKey = `${key}:${request.headers.get('cf-connecting-ip') || 'unknown'}`;
  if (env.RATE_LIMITER) {
    const result = await env.RATE_LIMITER.limit({ key: clientKey });
    if (!result.success) fail(429, 'Too many requests. Please try again later.');
    return;
  }
  // Per-isolate fallback only. Production should configure RATE_LIMITER.
  const now = Date.now();
  if (localLimits.size > 1_000) {
    for (const [id, value] of localLimits) if (value.expires <= now) localLimits.delete(id);
    while (localLimits.size > 5_000) localLimits.delete(localLimits.keys().next().value as string);
  }
  const entry = localLimits.get(clientKey);
  if (!entry || entry.expires <= now) { localLimits.set(clientKey, { count: 1, expires: now + 60_000 }); return; }
  if (++entry.count > 30) fail(429, 'Too many requests. Please try again later.');
}
function disclosure(data: Record<string, unknown>) {
  if (data.acknowledged !== true || data.disclosureVersion !== DISCLOSURE_VERSION) fail(400, 'Current disclosure acknowledgement is required.');
}

async function api(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === 'GET' && url.pathname === '/api/model-manifest') return json({ modelVersion: MODEL_VERSION, sources: SOURCES });
  if (request.method === 'POST' && url.pathname === '/api/calculate') {
    await rateLimit(request, env, 'calculate');
    const data = await body(request); exactKeys(data, ['preferences']);
    const result: Estimate = calculate(preferences(data.preferences));
    return json({ result });
  }
  if (['POST', 'DELETE'].includes(request.method)) requireWriteOrigin(request);
  if (request.method === 'POST' && url.pathname === '/api/submissions') {
    await rateLimit(request, env, 'write'); const db = requireDb(env); const token = capability(request); const data = await body(request);
    exactKeys(data, ['preferences', 'disclosureVersion', 'acknowledged']); disclosure(data);
    const prefs = preferences(data.preferences); const result: Estimate = calculate(prefs); const hash = await hashCapability(token);
    const saved = await db.prepare(`INSERT INTO contributions (capability_hash, preferences_json, disclosure_version, preferences_updated_at, expires_at)
      VALUES (?, ?, ?, unixepoch(), unixepoch() + 31536000)
      ON CONFLICT(capability_hash) DO UPDATE SET preferences_json=excluded.preferences_json, disclosure_version=excluded.disclosure_version,
      preferences_updated_at=unixepoch(), expires_at=unixepoch() + 31536000`).bind(hash, JSON.stringify({ schemaVersion: PREFERENCES_SCHEMA_VERSION, preferences: prefs }), DISCLOSURE_VERSION).run();
    if (!saved.success) fail(503, 'Contribution capture is currently unavailable.');
    return json({ result, saved: true });
  }
  if (request.method === 'DELETE' && url.pathname === '/api/contribution') {
    await rateLimit(request, env, 'write'); const db = requireDb(env); const hash = await hashCapability(capability(request));
    const deleted = await db.prepare('DELETE FROM contributions WHERE capability_hash = ?').bind(hash).run();
    if (!deleted.success) fail(503, 'Contribution capture is currently unavailable.');
    return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
  }
  fail(404, 'Not found.');
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      try { return await api(request, env); }
      catch (error) {
        if (error instanceof ApiError) return json({ error: error.message }, error.status);
        return json({ error: 'The request could not be completed.' }, 500);
      }
    }
    if (!env.ASSETS) return new Response('Static assets are unavailable.', { status: 503 });
    const asset = await env.ASSETS.fetch(request);
    if (asset.status !== 404 || request.method !== 'GET' || url.pathname.includes('.')) return asset;
    return env.ASSETS.fetch(new Request(new URL('/index.html', url), request));
  },
  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    if (env.DB) await env.DB.prepare('DELETE FROM contributions WHERE expires_at <= unixepoch()').run();
  },
};
