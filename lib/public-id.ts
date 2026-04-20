import { nanoid } from "nanoid";

/**
 * Generate a URL-safe public ID for external use.
 * These replace internal CUID database IDs in public URLs and HTML.
 */
export function generatePublicId(): string {
  return nanoid(12);
}
