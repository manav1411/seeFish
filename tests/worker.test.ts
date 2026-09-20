import { beforeEach, describe, expect, it } from 'vitest';
import worker, { type Env } from '../worker/index';
import { DEFAULT_PREFERENCES } from '../src/model/types';

class MemoryDb {
  events: unknown[][] = [];
  pageViews: unknown[][] = [];
  seenBindings: unknown[][] = [];
  prepare(sql: string) {
    let values: unknown[] = [];
    const statement = {
      bind: (...input: unknown[]) => { values = input; this.seenBindings.push(input); return statement; },
      run: async () => {
        if (sql.startsWith('INSERT INTO reveal_events')) this.events.push([...values]);
        if (sql.startsWith('INSERT INTO page_views')) this.pageViews.push([...values]);
        return { success: true };
      },
      first: async <T>() => null as T | null,
      all: async <T>() => ({ success: true, results: [] as T[] }),
    };
    return statement;
  }
}

const origin = 'https://seefish.test';
const context = { visitorId: 'visitor_123456789', sessionId: 'session_123456789', language: 'en-AU', timezone: 'Australia/Melbourne', viewportWidth: 390, viewportHeight: 844 };
const post = (path: string, data: unknown, headers: Record<string, string> = {}) => new Request(`${origin}${path}`, {
  method: 'POST', body: JSON.stringify(data), headers: { 'content-type': 'application/json', origin, ...headers },
});

describe('SeeFish Worker API', () => {
  let db: MemoryDb;
  beforeEach(() => { db = new MemoryDb(); });

  it('serves a no-store model manifest', async () => {
    const response = await worker.fetch(new Request(`${origin}/api/model-manifest`), {});
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toMatchObject({ modelVersion: expect.any(String), sources: expect.any(Array) });
  });

  it('strictly rejects underage preference ranges', async () => {
    const response = await worker.fetch(post('/api/calculate', { preferences: { ...DEFAULT_PREFERENCES, age: [17, 30] } }), {});
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid age range.' });
  });

  it('enforces the product preference ranges and known background IDs', async () => {
    const tooOld = await worker.fetch(post('/api/calculate', { preferences: { ...DEFAULT_PREFERENCES, age: [25, 81] } }), {});
    const tooShort = await worker.fetch(post('/api/calculate', { preferences: { ...DEFAULT_PREFERENCES, height: [139, 180] } }), {});
    const tooHighIncome = await worker.fetch(post('/api/calculate', { preferences: { ...DEFAULT_PREFERENCES, income: [0, 182001] } }), {});
    const unknownBackground = await worker.fetch(post('/api/calculate', { preferences: { ...DEFAULT_PREFERENCES, backgrounds: ['made-up'] } }), {});
    expect([tooOld.status, tooShort.status, tooHighIncome.status, unknownBackground.status]).toEqual([400, 400, 400, 400]);
  });

  it('does not claim an event was saved without D1', async () => {
    const response = await worker.fetch(post('/api/reveal-events', { preferences: DEFAULT_PREFERENCES }), {});
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Event capture is currently unavailable.' });
  });

  it('rejects cross-origin writes', async () => {
    const request = post('/api/reveal-events', { preferences: DEFAULT_PREFERENCES, context }, { origin: 'https://attacker.test' });
    expect((await worker.fetch(request, { DB: db } as Env)).status).toBe(403);
  });

  it('appends every reveal click with filters and the calculated result', async () => {
    const preferences = { ...DEFAULT_PREFERENCES, city: 'melbourne' as const, backgrounds: ['indian'] };
    const payload = { preferences, context };
    const requestHeaders = { 'cf-connecting-ip': '203.0.113.8', 'user-agent': 'Test browser', referer: `${origin}/` };
    const first = await worker.fetch(post('/api/reveal-events', payload, requestHeaders), { DB: db } as Env);
    const second = await worker.fetch(post('/api/reveal-events', payload, requestHeaders), { DB: db } as Env);
    expect(first.status).toBe(201); expect(second.status).toBe(201);
    expect(await second.json()).toEqual({ saved: true });
    expect(db.events).toHaveLength(2);
    expect(db.events[0]).toEqual([
      'men', 'melbourne', 25, 38, null, null, null, null, '["indian"]',
      expect.any(Number), expect.any(Number), expect.any(Number), expect.any(String),
      context.visitorId, context.sessionId, '203.0.113.8', 'Test browser', `${origin}/`, 'en-AU', 'Australia/Melbourne', 390, 844,
      '', '', '', '', null, '', expect.any(Number),
    ]);
    expect(db.events[1]).toEqual(db.events[0]);
  });

  it('rejects client-supplied tracking metadata', async () => {
    const response = await worker.fetch(post('/api/reveal-events', { preferences: DEFAULT_PREFERENCES, context, userAgent: 'fingerprint' }), { DB: db } as Env);
    expect(response.status).toBe(400);
    expect(db.events).toHaveLength(0);
  });

  it('records page views with a visitor, session, and server-derived request data', async () => {
    const response = await worker.fetch(post('/api/page-views', { path: '/', context }, { 'cf-connecting-ip': '203.0.113.9', 'user-agent': 'Mobile test' }), { DB: db } as Env);
    expect(response.status).toBe(201);
    expect(db.pageViews).toHaveLength(1);
    expect(db.pageViews[0]).toEqual([
      context.visitorId, context.sessionId, '/', '203.0.113.9', 'Mobile test', '', 'en-AU', 'Australia/Melbourne', 390, 844,
      '', '', '', '', null, '', expect.any(Number),
    ]);
  });

  it('creates a signed HttpOnly admin session without exposing the password', async () => {
    const env = { ADMIN_PASSWORD: 'test-only-password', ADMIN_SESSION_SECRET: 'test-only-signing-secret' } as Env;
    const login = await worker.fetch(post('/api/admin/login', { password: 'test-only-password' }), env);
    expect(login.status).toBe(200);
    const sessionCookie = login.headers.get('set-cookie') || '';
    expect(sessionCookie).toContain('seefish_admin=');
    expect(sessionCookie).toContain('HttpOnly');
    expect(sessionCookie).toContain('SameSite=Strict');
    expect(sessionCookie).not.toContain('test-only-password');
    const session = await worker.fetch(new Request(`${origin}/api/admin/session`, { headers: { cookie: sessionCookie.split(';')[0] } }), env);
    expect(await session.json()).toEqual({ authenticated: true });
  });

  it('rejects an incorrect admin password and unauthenticated analytics reads', async () => {
    const env = { DB: db, ADMIN_PASSWORD: 'test-only-password', ADMIN_SESSION_SECRET: 'test-only-signing-secret' } as Env;
    expect((await worker.fetch(post('/api/admin/login', { password: 'wrong-password' }), env)).status).toBe(401);
    expect((await worker.fetch(new Request(`${origin}/api/admin/analytics?days=30`), env)).status).toBe(401);
  });
});
