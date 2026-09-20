import type { Preferences } from '../model/types';

export async function recordRevealEvent(preferences: Preferences): Promise<void> {
  const response = await fetch('/api/reveal-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ preferences }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error('Reveal event could not be recorded.');
}
