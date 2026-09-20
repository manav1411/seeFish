import type { Preferences } from '../model/types';

const VISITOR_KEY = 'seefish-visitor-id';
const SESSION_KEY = 'seefish-session-id';

function identifier(storage: Storage, key: string): string {
  try {
    const existing = storage.getItem(key);
    if (existing) return existing;
    const created = crypto.randomUUID();
    storage.setItem(key, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}

function context() {
  return {
    visitorId: identifier(localStorage, VISITOR_KEY),
    sessionId: identifier(sessionStorage, SESSION_KEY),
    language: navigator.language.slice(0, 32),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone.slice(0, 64),
    viewportWidth: Math.round(window.innerWidth),
    viewportHeight: Math.round(window.innerHeight),
  };
}

async function post(path: string, payload: unknown): Promise<void> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error('Analytics event could not be recorded.');
}

let pageViewSent = false;
export async function recordPageView(): Promise<void> {
  if (pageViewSent) return;
  pageViewSent = true;
  try { await post('/api/page-views', { path: window.location.pathname, context: context() }); }
  catch { pageViewSent = false; }
}

export async function recordRevealEvent(preferences: Preferences): Promise<void> {
  await post('/api/reveal-events', { preferences, context: context() });
}
