import { beforeEach, describe, expect, it } from 'vitest';
import worker, { type Env } from '../worker/index';
import { DISCLOSURE_VERSION, DEFAULT_PREFERENCES } from '../src/model/types';

type Row = { capability_hash: string; preferences_json: string; profile_json: string | null; expires_at: number };

class MemoryDb {
  rows = new Map<string, Row>();
  seenBindings: unknown[][] = [];
  prepare(sql: string) {
    let values: unknown[] = [];
    const statement = {
      bind: (...input: unknown[]) => { values = input; this.seenBindings.push(input); return statement; },
      run: async () => {
        if (sql.startsWith('INSERT INTO contributions')) {
          const [hash, prefs] = values as [string, string];
          const old = this.rows.get(hash);
          this.rows.set(hash, { capability_hash: hash, preferences_json: prefs, profile_json: old?.profile_json ?? null, expires_at: Math.floor(Date.now() / 1000) + 31_536_000 });
        } else if (sql.startsWith('UPDATE contributions')) {
          const [profile, , hash] = values as [string, string, string];
          const row = this.rows.get(hash); if (row) row.profile_json = profile;
        } else if (sql.startsWith('DELETE FROM contributions WHERE capability_hash')) this.rows.delete(values[0] as string);
        return { success: true };
      },
      first: async <T>() => {
        const row = this.rows.get(values[0] as string);
        return (row ? { preferences_json: row.preferences_json } : null) as unknown as T | null;
      },
      all: async <T>() => ({ success: true, results: [...this.rows.values()].filter((row) => row.capability_hash !== values[0] && row.profile_json !== null) as unknown as T[] }),
    };
    return statement;
  }
}

const origin = 'https://seefish.test';
const token = 'A'.repeat(43);
const post = (path: string, data: unknown, headers: Record<string, string> = {}) => new Request(`${origin}${path}`, {
  method: 'POST', body: JSON.stringify(data), headers: { 'content-type': 'application/json', origin, authorization: `Bearer ${token}`, ...headers },
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

  it('does not claim a contribution was saved without D1', async () => {
    const response = await worker.fetch(post('/api/submissions', { preferences: DEFAULT_PREFERENCES, disclosureVersion: DISCLOSURE_VERSION, acknowledged: true }), {});
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Contribution capture is currently unavailable.' });
  });

  it('rejects cross-origin writes', async () => {
    const request = post('/api/submissions', { preferences: DEFAULT_PREFERENCES, disclosureVersion: DISCLOSURE_VERSION, acknowledged: true }, { origin: 'https://attacker.test' });
    expect((await worker.fetch(request, { DB: db } as Env)).status).toBe(403);
  });

  it('upserts one contribution and stores only a capability hash', async () => {
    const payload = { preferences: DEFAULT_PREFERENCES, disclosureVersion: DISCLOSURE_VERSION, acknowledged: true };
    const first = await worker.fetch(post('/api/submissions', payload), { DB: db } as Env);
    const second = await worker.fetch(post('/api/submissions', payload), { DB: db } as Env);
    expect(first.status).toBe(200); expect(second.status).toBe(200);
    expect(await second.json()).toMatchObject({ saved: true, result: { modelVersion: expect.any(String) } });
    expect(db.rows.size).toBe(1);
    const stored = [...db.rows.values()][0];
    expect(stored.capability_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify([...db.seenBindings, ...db.rows.values()])).not.toContain(token);
  });

  it('deletes the contribution using the same capability', async () => {
    await worker.fetch(post('/api/submissions', { preferences: DEFAULT_PREFERENCES, disclosureVersion: DISCLOSURE_VERSION, acknowledged: true }), { DB: db } as Env);
    const request = new Request(`${origin}/api/contribution`, { method: 'DELETE', headers: { origin, authorization: `Bearer ${token}` } });
    const response = await worker.fetch(request, { DB: db } as Env);
    expect(response.status).toBe(204); expect(db.rows.size).toBe(0);
  });
});
