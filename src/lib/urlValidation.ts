/**
 * Validates a URL for safe redirect operations.
 * Only allows http:// and https:// protocols to prevent XSS attacks
 * via javascript:, data:, or other malicious URL schemes.
 */
export function isValidRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow http/https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
