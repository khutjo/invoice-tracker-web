/**
 * Validates a `redirect` query parameter and returns it only if it is a safe
 * internal path starting with a single `/` (rejecting `//evil.com`, full URLs, etc.).
 */
export function safeRedirect(redirect: unknown): string {
  if (typeof redirect !== 'string') {
    return '/'
  }

  const trimmed = redirect.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return '/'
  }

  return trimmed
}
