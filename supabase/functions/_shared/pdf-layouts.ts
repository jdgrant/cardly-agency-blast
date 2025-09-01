/**
 * DEPRECATED: This file is being replaced by unified-layouts.ts
 * Keeping exports for backward compatibility during migration
 */

import { 
  generateUnifiedCardHTML, 
  generateInsideCardHTML as newGenerateInsideCardHTML,
  generateBackCardHTML as newGenerateBackCardHTML
} from './unified-layouts.ts';

/**
 * @deprecated Use generateUnifiedCardHTML from unified-layouts.ts instead
 */
export function generateInsideCardHTML(
  order: any,
  logoDataUrl: string | null,
  signatureDataUrl: string | null,
  orientation: 'portrait' | 'landscape' = 'portrait',
  format: 'preview' | 'production' = 'preview'
): string {
  return newGenerateInsideCardHTML(order, logoDataUrl, signatureDataUrl, orientation, format);
}

/**
 * @deprecated Use generateUnifiedCardHTML from unified-layouts.ts instead
 */
export function generateBackCardHTML(
  order: any,
  logoDataUrl: string | null,
  signatureDataUrl: string | null
): string {
  return newGenerateBackCardHTML(order, logoDataUrl, signatureDataUrl);
}