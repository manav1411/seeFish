import { DISCLOSURE_VERSION, type Preferences, type Estimate } from '../model/types';

const KEY = 'seefish-contribution-key';
let memoryToken: string | null = null;
export function getToken(create = false): string | null {
  try { memoryToken = localStorage.getItem(KEY) || memoryToken; } catch { /* Private storage may be unavailable. */ }
  if (!memoryToken && create) {
    memoryToken = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
    try { localStorage.setItem(KEY, memoryToken); } catch { /* Keep capability for this page session. */ }
  }
  return memoryToken;
}
export function forgetToken() { memoryToken = null; try { localStorage.removeItem(KEY); } catch { /* Nothing persisted. */ } }
export function recoverToken(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token.trim())) throw new Error('Please enter the full 64-character recovery key.');
  memoryToken = token.trim();
  try { localStorage.setItem(KEY, memoryToken); } catch { /* Kept for this session. */ }
}

async function request<T>(path: string, method: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken(true)}` },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error(response.status === 429 ? 'A few too many splashes. Please try again in a minute.' : 'Your result is ready, but your contribution couldn’t be saved. You can keep exploring.');
  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}

export const submitPreferences = (preferences: Preferences) => request<{ result: Estimate; saved: boolean }>('/api/submissions', 'POST', { preferences, disclosureVersion: DISCLOSURE_VERSION, acknowledged: true });
export async function deleteContribution() { if (!getToken()) throw new Error('No contribution key in this browser. Restore your key first.'); await request('/api/contribution', 'DELETE'); forgetToken(); }
