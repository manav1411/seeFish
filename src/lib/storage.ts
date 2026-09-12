// =============================================================================
// Submission Storage
// Stores user preference submissions as JSON Lines for future analysis.
// =============================================================================

import { promises as fs } from 'fs';
import path from 'path';
import { UserPreferences, CalculationResult } from './types';

interface Submission {
  id: string;
  timestamp: string;
  preferences: UserPreferences;
  resultSummary: {
    matchingPopulation: number;
    percentage: number;
  };
}

const DATA_DIR = path.join(process.cwd(), 'data');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.jsonl');

/**
 * Ensure the data directory exists.
 */
async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // directory already exists
  }
}

/**
 * Generate a simple unique ID (timestamp + random suffix).
 */
function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

/**
 * Store a user's preference submission.
 * Appends to a JSON Lines file (one JSON object per line).
 */
export async function storeSubmission(
  preferences: UserPreferences,
  result: CalculationResult
): Promise<string> {
  await ensureDataDir();

  const submission: Submission = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    preferences,
    resultSummary: {
      matchingPopulation: result.matchingPopulation,
      percentage: result.percentage,
    },
  };

  const line = JSON.stringify(submission) + '\n';

  await fs.appendFile(SUBMISSIONS_FILE, line, 'utf-8');

  return submission.id;
}

/**
 * Get the total number of submissions stored.
 */
export async function getSubmissionCount(): Promise<number> {
  try {
    const content = await fs.readFile(SUBMISSIONS_FILE, 'utf-8');
    return content.trim().split('\n').filter(Boolean).length;
  } catch {
    return 0;
  }
}

/**
 * Read all stored submissions.
 */
export async function getAllSubmissions(): Promise<Submission[]> {
  try {
    const content = await fs.readFile(SUBMISSIONS_FILE, 'utf-8');
    return content
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}
