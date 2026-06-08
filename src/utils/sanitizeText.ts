/**
 * sanitizeText — SEC-01 plain-text sanitizer for non-React render surfaces.
 *
 * Use this before passing Notion-sourced strings to Chart.js labels, canvas
 * drawing operations, or any other surface that does NOT benefit from React's
 * automatic escaping of text children.
 *
 * React text children (e.g. `<span>{name}</span>`) are auto-escaped by React
 * and do NOT need this function. Use sanitizeText only for:
 *   - Chart.js dataset labels (passed to canvas 2D API, not React)
 *   - Chart.js axis tick labels
 *   - Any other non-React render target that receives user-controlled strings
 */
import DOMPurify from 'dompurify';

/**
 * Strip all HTML from `input` and return plain text.
 * Safe to pass to Chart.js labels or other non-React render surfaces.
 *
 * @param input - A string that may contain HTML (e.g. a Notion exercise or muscle name)
 * @returns Plain text with all HTML tags and attributes removed
 */
export function sanitizeText(input: string): string {
  return DOMPurify.sanitize(input ?? '', { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}
