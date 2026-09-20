import { BACKGROUNDS, calculate, MODEL_VERSION, SOURCES } from '../src/model/index';
import type { Estimate, Preferences } from '../src/model/types';

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
  ADMIN_RATE_LIMITER?: RateLimitBinding;
  ADMIN_PASSWORD?: string;
  ADMIN_SESSION_SECRET?: string;
}

const MAX_BODY_BYTES = 16_384;
const ADMIN_COOKIE = 'seefish_admin';
const ADMIN_SESSION_SECONDS = 43_200;
const ANALYTICS_RETENTION_SECONDS = 7_776_000;
const localLimits = new Map<string, { count: number; expires: number }>();
const cities = new Set(['australia', 'sydney', 'melbourne', 'brisbane', 'perth', 'adelaide', 'canberra', 'hobart', 'darwin']);
const genders = new Set(['men', 'women']);
const backgroundIds = new Set<string>(BACKGROUNDS.map((background) => background.id));

class ApiError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

const json = (data: unknown, status = 200, extraHeaders?: Record<string, string>) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', ...extraHeaders },
});

function fail(status: number, message: string): never { throw new ApiError(status, message); }
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function exactKeys(value: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(value).some((key) => !allowed.includes(key))) fail(400, 'Request contains unsupported fields.');
}
function limitedString(value: unknown, max: number, label: string): string {
  if (typeof value !== 'string' || value.length > max) fail(400, `Invalid ${label}.`);
  return value;
}
function identifier(value: unknown, label: string): string {
  const result = limitedString(value, 64, label);
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(result)) fail(400, `Invalid ${label}.`);
  return result;
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
type ClientContext = { visitorId: string; sessionId: string; language: string; timezone: string; viewportWidth: number; viewportHeight: number };
function clientContext(value: unknown): ClientContext {
  if (!isObject(value)) fail(400, 'Invalid analytics context.');
  exactKeys(value, ['visitorId', 'sessionId', 'language', 'timezone', 'viewportWidth', 'viewportHeight']);
  const viewportWidth = finiteNumber(value.viewportWidth, 1, 20_000, 'viewport width');
  const viewportHeight = finiteNumber(value.viewportHeight, 1, 20_000, 'viewport height');
  if (!Number.isInteger(viewportWidth) || !Number.isInteger(viewportHeight)) fail(400, 'Invalid viewport.');
  return {
    visitorId: identifier(value.visitorId, 'visitor ID'), sessionId: identifier(value.sessionId, 'session ID'),
    language: limitedString(value.language, 32, 'language'), timezone: limitedString(value.timezone, 64, 'timezone'),
    viewportWidth, viewportHeight,
  };
}
type RequestMeta = { ip: string; userAgent: string; referer: string; country: string; region: string; city: string; colo: string; asn: number | null; asOrganization: string };
function requestMeta(request: Request): RequestMeta {
  const cf = (request as Request & { cf?: Record<string, unknown> }).cf || {};
  const text = (value: unknown, max: number) => typeof value === 'string' ? value.slice(0, max) : '';
  const asn = typeof cf.asn === 'number' && Number.isFinite(cf.asn) ? cf.asn : null;
  return {
    ip: text(request.headers.get('cf-connecting-ip'), 64), userAgent: text(request.headers.get('user-agent'), 512),
    referer: text(request.headers.get('referer'), 500), country: text(cf.country, 8), region: text(cf.region, 100),
    city: text(cf.city, 100), colo: text(cf.colo, 8), asn, asOrganization: text(cf.asOrganization, 160),
  };
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
function requireDb(env: Env): D1Database {
  if (!env.DB) fail(503, 'Event capture is currently unavailable.');
  return env.DB;
}
async function rateLimit(request: Request, env: Env, key: string, maximum = 30) {
  const clientKey = `${key}:${request.headers.get('cf-connecting-ip') || 'unknown'}`;
  const binding = key === 'admin-login' ? env.ADMIN_RATE_LIMITER : env.RATE_LIMITER;
  if (binding) {
    const result = await binding.limit({ key: clientKey });
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
  if (++entry.count > maximum) fail(429, 'Too many requests. Please try again later.');
}
function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function base64UrlToBytes(value: string): Uint8Array | null {
  try {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
    return Uint8Array.from(atob(base64), char => char.charCodeAt(0));
  } catch { return null; }
}
async function adminSignature(expires: string, password: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`seefish-admin:${expires}`)));
}
async function createAdminSession(password: string): Promise<string> {
  const expires = String(Math.floor(Date.now() / 1000) + ADMIN_SESSION_SECONDS);
  return `${expires}.${bytesToBase64Url(await adminSignature(expires, password))}`;
}
function cookie(request: Request, name: string): string | null {
  for (const part of (request.headers.get('cookie') || '').split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return null;
}
async function hasAdminSession(request: Request, env: Env): Promise<boolean> {
  if (!env.ADMIN_SESSION_SECRET) return false;
  const token = cookie(request, ADMIN_COOKIE);
  if (!token) return false;
  const [expires, encoded, ...rest] = token.split('.');
  if (rest.length || !/^\d{10}$/.test(expires) || Number(expires) <= Math.floor(Date.now() / 1000)) return false;
  const supplied = base64UrlToBytes(encoded);
  if (!supplied) return false;
  const expected = await adminSignature(expires, env.ADMIN_SESSION_SECRET);
  if (supplied.length !== expected.length) return false;
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= expected[i] ^ supplied[i];
  return difference === 0;
}
async function passwordMatches(supplied: string, expected: string): Promise<boolean> {
  const digest = async (value: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  const [left, right] = await Promise.all([digest(supplied), digest(expected)]);
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i];
  return difference === 0;
}
function adminCookie(request: Request, value: string, maxAge: number): string {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${ADMIN_COOKIE}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`;
}
async function requireAdmin(request: Request, env: Env) {
  if (!await hasAdminSession(request, env)) fail(401, 'Admin authentication required.');
}
async function queryAll<T>(db: D1Database, sql: string, ...values: unknown[]): Promise<T[]> {
  const result = await db.prepare(sql).bind(...values).all<T>();
  if (!result.success) fail(503, 'Analytics are currently unavailable.');
  return result.results || [];
}
async function analytics(db: D1Database, days: number) {
  const since = Math.floor(Date.now() / 1000) - days * 86_400;
  const [summary, daily, cities, genders, backgroundsResult, visitors, activity] = await Promise.all([
    db.prepare(`SELECT
      (SELECT COUNT(*) FROM page_views WHERE viewed_at >= ?) AS page_views,
      (SELECT COUNT(DISTINCT visitor_id) FROM page_views WHERE viewed_at >= ?) AS unique_visitors,
      (SELECT COUNT(*) FROM reveal_events WHERE clicked_at >= ?) AS reveals,
      (SELECT COUNT(DISTINCT visitor_id) FROM reveal_events WHERE clicked_at >= ?) AS reveal_visitors,
      (SELECT AVG(estimated_matches) FROM reveal_events WHERE clicked_at >= ?) AS average_matches`).bind(since, since, since, since, since).first<Record<string, unknown>>(),
    queryAll<Record<string, unknown>>(db, `SELECT date(occurred_at, 'unixepoch') AS day,
      SUM(event_type = 'page_view') AS page_views, SUM(event_type = 'reveal') AS reveals,
      COUNT(DISTINCT visitor_id) AS unique_visitors
      FROM (SELECT viewed_at AS occurred_at, visitor_id, 'page_view' AS event_type FROM page_views WHERE viewed_at >= ?
        UNION ALL SELECT clicked_at, visitor_id, 'reveal' FROM reveal_events WHERE clicked_at >= ?)
      GROUP BY day ORDER BY day`, since, since),
    queryAll<Record<string, unknown>>(db, 'SELECT city AS label, COUNT(*) AS count FROM reveal_events WHERE clicked_at >= ? GROUP BY city ORDER BY count DESC', since),
    queryAll<Record<string, unknown>>(db, 'SELECT gender AS label, COUNT(*) AS count FROM reveal_events WHERE clicked_at >= ? GROUP BY gender ORDER BY count DESC', since),
    queryAll<Record<string, unknown>>(db, `SELECT COALESCE(j.value, 'Any') AS label, COUNT(*) AS count
      FROM reveal_events r LEFT JOIN json_each(r.backgrounds_json) j ON true
      WHERE r.clicked_at >= ? GROUP BY label ORDER BY count DESC`, since),
    queryAll<Record<string, unknown>>(db, `SELECT visitor_id, MIN(occurred_at) AS first_seen, MAX(occurred_at) AS last_seen,
      SUM(event_type = 'page_view') AS page_views, SUM(event_type = 'reveal') AS reveals,
      GROUP_CONCAT(DISTINCT NULLIF(ip_address, '')) AS ip_addresses,
      GROUP_CONCAT(DISTINCT NULLIF(cf_country, '')) AS countries
      FROM (SELECT viewed_at AS occurred_at, visitor_id, ip_address, cf_country, 'page_view' AS event_type FROM page_views WHERE viewed_at >= ?
        UNION ALL SELECT clicked_at, visitor_id, ip_address, cf_country, 'reveal' FROM reveal_events WHERE clicked_at >= ?)
      GROUP BY visitor_id ORDER BY last_seen DESC LIMIT 500`, since, since),
    queryAll<Record<string, unknown>>(db, `SELECT * FROM (
      SELECT 'page_view' AS event_type, viewed_at AS occurred_at, visitor_id, session_id, ip_address, user_agent, referer,
        client_language, client_timezone, viewport_width, viewport_height, cf_country, cf_region, cf_city, cf_colo, cf_asn,
        cf_as_organization, path, NULL AS gender, NULL AS city, NULL AS age_min, NULL AS age_max, NULL AS height_min,
        NULL AS height_max, NULL AS income_min, NULL AS income_max, NULL AS backgrounds_json, NULL AS estimated_matches,
        NULL AS match_share FROM page_views WHERE viewed_at >= ?
      UNION ALL
      SELECT 'reveal', clicked_at, visitor_id, session_id, ip_address, user_agent, referer, client_language, client_timezone,
        viewport_width, viewport_height, cf_country, cf_region, cf_city, cf_colo, cf_asn, cf_as_organization, NULL,
        gender, city, age_min, age_max, height_min, height_max, income_min, income_max, backgrounds_json,
        estimated_matches, match_share FROM reveal_events WHERE clicked_at >= ?)
      ORDER BY occurred_at DESC LIMIT 500`, since, since),
  ]);
  return { generatedAt: new Date().toISOString(), days, summary: summary || { page_views: 0, unique_visitors: 0, reveals: 0, reveal_visitors: 0, average_matches: null }, daily, cities, genders, backgrounds: backgroundsResult, visitors, activity };
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
  if (request.method === 'GET' && url.pathname === '/api/admin/session') return json({ authenticated: await hasAdminSession(request, env) });
  if (request.method === 'GET' && url.pathname === '/api/admin/analytics') {
    await requireAdmin(request, env);
    const rawDays = Number(url.searchParams.get('days') || 30);
    if (![7, 30, 90, 365].includes(rawDays)) fail(400, 'Invalid analytics range.');
    return json(await analytics(requireDb(env), rawDays));
  }
  if (['POST', 'DELETE'].includes(request.method)) requireWriteOrigin(request);
  if (request.method === 'POST' && url.pathname === '/api/admin/login') {
    await rateLimit(request, env, 'admin-login', 5);
    if (!env.ADMIN_PASSWORD || !env.ADMIN_SESSION_SECRET) fail(503, 'Admin access is not configured.');
    const data = await body(request); exactKeys(data, ['password']);
    const supplied = limitedString(data.password, 256, 'password');
    if (!await passwordMatches(supplied, env.ADMIN_PASSWORD)) fail(401, 'Incorrect password.');
    const session = await createAdminSession(env.ADMIN_SESSION_SECRET);
    return json({ authenticated: true }, 200, { 'set-cookie': adminCookie(request, session, ADMIN_SESSION_SECONDS) });
  }
  if (request.method === 'POST' && url.pathname === '/api/admin/logout') {
    return json({ authenticated: false }, 200, { 'set-cookie': adminCookie(request, '', 0) });
  }
  if (request.method === 'POST' && url.pathname === '/api/page-views') {
    await rateLimit(request, env, 'page-view');
    const db = requireDb(env); const data = await body(request); exactKeys(data, ['path', 'context']);
    const path = limitedString(data.path, 120, 'path');
    if (!path.startsWith('/') || path.startsWith('/admin')) fail(400, 'Invalid path.');
    const context = clientContext(data.context); const meta = requestMeta(request);
    const saved = await db.prepare(`INSERT INTO page_views
      (visitor_id, session_id, path, ip_address, user_agent, referer, client_language, client_timezone,
       viewport_width, viewport_height, cf_country, cf_region, cf_city, cf_colo, cf_asn, cf_as_organization, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch() + ?)`).bind(
      context.visitorId, context.sessionId, path, meta.ip, meta.userAgent, meta.referer, context.language, context.timezone,
      context.viewportWidth, context.viewportHeight, meta.country, meta.region, meta.city, meta.colo, meta.asn, meta.asOrganization,
      ANALYTICS_RETENTION_SECONDS,
    ).run();
    if (!saved.success) fail(503, 'Event capture is currently unavailable.');
    return json({ saved: true }, 201);
  }
  if (request.method === 'POST' && url.pathname === '/api/reveal-events') {
    await rateLimit(request, env, 'reveal');
    const db = requireDb(env);
    const data = await body(request);
    exactKeys(data, ['preferences', 'context']);
    const prefs = preferences(data.preferences);
    const context = clientContext(data.context);
    const meta = requestMeta(request);
    const result: Estimate = calculate(prefs);
    const saved = await db.prepare(`INSERT INTO reveal_events
      (gender, city, age_min, age_max, height_min, height_max, income_min, income_max, backgrounds_json,
       estimated_matches, eligible_population, match_share, model_version, visitor_id, session_id, ip_address, user_agent,
       referer, client_language, client_timezone, viewport_width, viewport_height, cf_country, cf_region, cf_city, cf_colo,
       cf_asn, cf_as_organization, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch() + ?)`).bind(
      prefs.gender, prefs.city, prefs.age[0], prefs.age[1], prefs.height?.[0] ?? null, prefs.height?.[1] ?? null,
      prefs.income?.[0] ?? null, prefs.income?.[1] ?? null, JSON.stringify(prefs.backgrounds),
      result.estimate, result.denominator, result.share, result.modelVersion, context.visitorId, context.sessionId,
      meta.ip, meta.userAgent, meta.referer, context.language, context.timezone, context.viewportWidth, context.viewportHeight,
      meta.country, meta.region, meta.city, meta.colo, meta.asn, meta.asOrganization, ANALYTICS_RETENTION_SECONDS,
    ).run();
    if (!saved.success) fail(503, 'Event capture is currently unavailable.');
    return json({ saved: true }, 201);
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
    const fallback = await env.ASSETS.fetch(new Request(new URL('/', url), request));
    if (!url.pathname.startsWith('/admin')) return fallback;
    const headers = new Headers(fallback.headers);
    headers.set('cache-control', 'no-store');
    headers.set('content-security-policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    headers.set('x-frame-options', 'DENY');
    return new Response(fallback.body, { status: fallback.status, statusText: fallback.statusText, headers });
  },
  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    if (env.DB) {
      await env.DB.prepare('DELETE FROM page_views WHERE expires_at <= unixepoch()').run();
      await env.DB.prepare('DELETE FROM reveal_events WHERE expires_at <= unixepoch()').run();
      await env.DB.prepare('DELETE FROM contributions WHERE expires_at <= unixepoch()').run();
    }
  },
};
