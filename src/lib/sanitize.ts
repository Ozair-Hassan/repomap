/**
 * Strip HTML / script tags, null bytes, and dangerous control characters.
 * Collapses repeated whitespace and trims the result.
 */
export function sanitizeText(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, '')
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
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
    } catch {}
  }

  return trimmed.replace(/[^a-zA-Z0-9/_.\-]/g, '').slice(0, 200)
}
