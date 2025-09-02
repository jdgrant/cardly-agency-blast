/**
 * Unified layout configuration for all card rendering
 * Content is always 7in x 5.125in, overall dimensions vary by format
 */

export interface LayoutConfig {
  contentWidth: string;
  contentHeight: string;
  overallWidth: string;
  overallHeight: string;
  aspectRatio: number;
  isSpread: boolean;
}

export interface CardContent {
  message: string;
  logoUrl?: string;
  signatureUrl?: string;
  templatePreviewUrl?: string;
}

export const LAYOUT_CONFIGS = {
  // Front card - always portrait 5.125" x 7"
  front: {
    contentWidth: '5.125in',
    contentHeight: '7in', 
    overallWidth: '5.125in',
    overallHeight: '7in',
    aspectRatio: 41/56, // 5.125/7
    isSpread: false,
  } as LayoutConfig,

  // Front card spread - landscape 10.25" x 7" (left blank, right content)
  frontSpread: {
    contentWidth: '5.125in',
    contentHeight: '7in',
    overallWidth: '10.25in',
    overallHeight: '7in',
    aspectRatio: 10.25/7,
    isSpread: true,
  } as LayoutConfig,

  // Inside card - portrait 5.125" x 7"
  inside: {
    contentWidth: '5.125in',
    contentHeight: '7in',
    overallWidth: '5.125in', 
    overallHeight: '7in',
    aspectRatio: 5.125/7,
    isSpread: false,
  } as LayoutConfig,

  // Inside card spread - landscape 10.25" x 7" (left blank, right content)
  insideSpread: {
    contentWidth: '5.125in',
    contentHeight: '7in',
    overallWidth: '10.25in',
    overallHeight: '7in', 
    aspectRatio: 10.25/7,
    isSpread: true,
  } as LayoutConfig,

  // Production format - landscape 10.25" x 7"
  production: {
    contentWidth: '5.125in',
    contentHeight: '7in',
    overallWidth: '10.25in',
    overallHeight: '7in',
    aspectRatio: 10.25/7,
    isSpread: true,
  } as LayoutConfig,
} as const;

export type LayoutType = keyof typeof LAYOUT_CONFIGS;

export function getLayoutConfig(
  type: 'front' | 'inside', 
  format: 'preview' | 'production' = 'preview',
  isSpread: boolean = false
): LayoutConfig {
  if (type === 'front') {
    if (format === 'production' || isSpread) {
      return LAYOUT_CONFIGS.frontSpread;
    }
    return LAYOUT_CONFIGS.front;
  }
  
  if (type === 'inside') {
    if (format === 'production' || isSpread) {
      return LAYOUT_CONFIGS.insideSpread;
    }
    return LAYOUT_CONFIGS.inside;
  }
  
  return LAYOUT_CONFIGS.inside;
}

/**
 * Format message with line break at halfway point by character length
 */
export function formatMessageWithLineBreak(message: string): { 
  firstLine: string; 
  secondLine: string; 
  shouldBreak: boolean;
} {
  if (!message || message.length <= 30) {
    return { firstLine: message, secondLine: '', shouldBreak: false };
  }

  const halfLength = Math.floor(message.length / 2);
  const words = message.split(' ');
  let characterCount = 0;
  let splitIndex = 0;

  for (let i = 0; i < words.length; i++) {
    const wordLength = words[i].length + (i > 0 ? 1 : 0); // +1 for space
    if (characterCount + wordLength >= halfLength) {
      const beforeSplit = characterCount;
      const afterSplit = characterCount + wordLength;
      splitIndex = Math.abs(halfLength - beforeSplit) <= Math.abs(halfLength - afterSplit) ? i : i + 1;
      break;
    }
    characterCount += wordLength;
  }

  if (splitIndex > 0 && splitIndex < words.length) {
    const firstLine = words.slice(0, splitIndex).join(' ');
    const secondLine = words.slice(splitIndex).join(' ');
    return { firstLine, secondLine, shouldBreak: true };
  }

  return { firstLine: message, secondLine: '', shouldBreak: false };
}