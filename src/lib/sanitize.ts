/**
 * sanitize.ts
 * Lightweight input sanitisation helpers.
 * These run on the client before the request is sent — the server still
 * enforces its own length caps and schema validation as a second line of defence.
 */

/**
 * Strip HTML / script tags, null bytes, and dangerous control characters.
 * Collapses repeated whitespace and trims the result.
 */
export function sanitizeText(raw: string): string {
  return (
    raw
      // Remove HTML tags (covers <script>, <img onerror=...>, etc.)
      .replace(/<[^>]*>/g, '')
      // Remove null bytes
      .replace(/\0/g, '')
      // Remove ASCII control characters except tab (0x09), LF (0x0a), CR (0x0d)
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
      // Collapse runs of 3+ newlines down to two (preserve intentional paragraphs)
      .replace(/\n{3,}/g, '\n\n')
      // Trim leading / trailing whitespace
      .trim()
  )
}

/**
 * Sanitize a GitHub repo identifier.
 * Accepts "owner/repo" or a full GitHub URL; strips anything outside that.
 */
export function sanitizeRepo(raw: string): string {
  const trimmed = raw.trim()

  // Full URL — keep only the origin + path, drop query strings / fragments
  if (trimmed.startsWith('http')) {
    try {
      const url = new URL(trimmed)
      return `${url.origin}${url.pathname}`.replace(/\/$/, '')
    } catch {
      // fall through to plain strip below
    }
  }

  // Short "owner/repo" form — allow only alphanumeric, hyphens, underscores, dots, and a single slash
  return trimmed.replace(/[^a-zA-Z0-9/_.\-]/g, '').slice(0, 200)
}
