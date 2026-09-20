import { beforeEach, describe, expect, it } from 'vitest';
import worker, { type Env } from '../worker/index';
import { DEFAULT_PREFERENCES } from '../src/model/types';

class MemoryDb {
  events: unknown[][] = [];
  seenBindings: unknown[][] = [];
  prepare(sql: string) {
    let values: unknown[] = [];
    const statement = {
      bind: (...input: unknown[]) => { values = input; this.seenBindings.push(input); return statement; },
      run: async () => {
        if (sql.startsWith('INSERT INTO reveal_events')) this.events.push([...values]);
        return { success: true };
      },
      first: async <T>() => null as T | null,
      all: async <T>() => ({ success: true, results: [] as T[] }),
    };
    return statement;
  }
}

const origin = 'https://seefish.test';
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
    const request = post('/api/reveal-events', { preferences: DEFAULT_PREFERENCES }, { origin: 'https://attacker.test' });
    expect((await worker.fetch(request, { DB: db } as Env)).status).toBe(403);
  });

  it('appends every reveal click with filters and the calculated result', async () => {
    const preferences = { ...DEFAULT_PREFERENCES, city: 'melbourne' as const, backgrounds: ['indian'] };
    const payload = { preferences };
    const first = await worker.fetch(post('/api/reveal-events', payload), { DB: db } as Env);
    const second = await worker.fetch(post('/api/reveal-events', payload), { DB: db } as Env);
    expect(first.status).toBe(201); expect(second.status).toBe(201);
    expect(await second.json()).toEqual({ saved: true });
    expect(db.events).toHaveLength(2);
    expect(db.events[0]).toEqual([
      'men', 'melbourne', 25, 38, null, null, null, null, '["indian"]',
      expect.any(Number), expect.any(Number), expect.any(Number), expect.any(String),
    ]);
    expect(db.events[1]).toEqual(db.events[0]);
  });

  it('rejects client-supplied tracking metadata', async () => {
    const response = await worker.fetch(post('/api/reveal-events', { preferences: DEFAULT_PREFERENCES, userAgent: 'fingerprint' }), { DB: db } as Env);
    expect(response.status).toBe(400);
    expect(db.events).toHaveLength(0);
  });
});
