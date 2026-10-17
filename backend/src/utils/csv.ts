/**
 * CSV and email parsing utilities.
 */

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export interface CsvParseResult {
  validEmails: string[];
  invalidCount: number;
  duplicateCount: number;
}

/**
 * Validates a single email address string.
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length > 254) return false;
  return EMAIL_REGEX.test(trimmed);
}

/**
 * Parses raw CSV / text string content to extract, clean, and deduplicate email addresses.
 */
export function parseAndValidateEmails(csvContent: string): CsvParseResult {
  const lines = csvContent.split(/\r?\n/);
  const seen = new Set<string>();
  const validEmails: string[] = [];
  let invalidCount = 0;
  let duplicateCount = 0;

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Handle common CSV header lines
    const lower = line.toLowerCase();
    if (lower === 'email' || lower === 'emails' || lower === 'recipient' || lower === 'email address') {
      continue;
    }

    // Split on comma or semicolon in case line contains multiple fields (e.g. name,email)
    const tokens = line.split(/[,;\t]/).map((t) => t.trim().replace(/^["']|["']$/g, ''));
    
    // Find first token that looks like an email or validate first column
    const emailCandidate = tokens.find((t) => t.includes('@')) || tokens[0];

    if (isValidEmail(emailCandidate)) {
      const normalized = emailCandidate.toLowerCase();
      if (seen.has(normalized)) {
        duplicateCount++;
      } else {
        seen.add(normalized);
        validEmails.push(normalized);
      }
    } else {
      invalidCount++;
    }
  }

  return {
    validEmails,
    invalidCount,
    duplicateCount,
  };
}
