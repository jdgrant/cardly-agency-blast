/**
 * Shared signature utilities for PDF generation
 */

/**
 * Gets the best signature URL - prioritizes cropped signature over original
 */
export function getSignatureUrl(order: any): string | null {
  return order.cropped_signature_url || order.signature_url || null;
}

/**
 * Gets the logo URL from order
 */
export function getLogoUrl(order: any): string | null {
  return order.logo_url || null;
}