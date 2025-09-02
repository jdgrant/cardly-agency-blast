/**
 * Unified HTML layout generator for consistent PDF rendering
 * Replaces the scattered layout logic across multiple files
 */

interface LayoutConfig {
  contentWidth: string;
  contentHeight: string;
  overallWidth: string;
  overallHeight: string;
  isSpread: boolean;
}

interface CardContent {
  message: string;
  logoDataUrl?: string | null;
  signatureDataUrl?: string | null;
  templatePreviewUrl?: string;
}

const LAYOUT_CONFIGS = {
  front: {
    contentWidth: '5.125in',
    contentHeight: '7in', 
    overallWidth: '5.125in',
    overallHeight: '7in',
    isSpread: false,
  },
  frontSpread: {
    contentWidth: '5.125in',
    contentHeight: '7in',
    overallWidth: '10.25in',
    overallHeight: '7in', 
    isSpread: true,
  },
  inside: {
    contentWidth: '5.125in',
    contentHeight: '7in',
    overallWidth: '5.125in', 
    overallHeight: '7in',
    isSpread: false,
  },
  insideSpread: {
    contentWidth: '5.125in',
    contentHeight: '7in',
    overallWidth: '10.25in',
    overallHeight: '7in', 
    isSpread: true,
  },
} as const;

function getLayoutConfig(
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

function formatMessageWithLineBreak(message: string): { 
  firstLine: string; 
  secondLine: string; 
  shouldBreak: boolean;
} {
  const text = String(message || '');
  
  if (text.length <= 30) {
    return { firstLine: text, secondLine: '', shouldBreak: false };
  }

  const halfLength = Math.floor(text.length / 2);
  const words = text.split(' ');
  let characterCount = 0;
  let splitIndex = 0;

  for (let i = 0; i < words.length; i++) {
    const wordLength = words[i].length + (i > 0 ? 1 : 0);
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

  return { firstLine: text, secondLine: '', shouldBreak: false };
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate unified HTML for any card layout
 */
export function generateUnifiedCardHTML(
  type: 'front' | 'inside',
  content: CardContent,
  format: 'preview' | 'production' = 'preview',
  isSpread: boolean = false
): string {
  const layout = getLayoutConfig(type, format, isSpread);
  
  if (type === 'front') {
    return generateFrontHTML(layout, content);
  }
  
  return generateInsideHTML(layout, content);
}

function generateFrontHTML(layout: LayoutConfig, content: CardContent): string {
  const imgSrc = content.templatePreviewUrl || '';
  
  if (layout.isSpread) {
    // Production format: front on left half, blank on right half
    return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        @page { size: ${layout.overallWidth} ${layout.overallHeight}; margin: 0; }
        html, body { margin: 0; padding: 0; width: ${layout.overallWidth}; height: ${layout.overallHeight}; }
        body { font-family: Arial, sans-serif; background: #ffffff; }
        .production-layout { width: 100%; height: 100%; display: flex; }
        .front-half { width: ${layout.contentWidth}; height: ${layout.contentHeight}; overflow: hidden; }
        .blank-half { width: ${layout.contentWidth}; height: ${layout.contentHeight}; background: #ffffff; }
        .front-img { width: 100%; height: 100%; object-fit: cover; display: block; }
      </style>
    </head>
    <body>
      <div class="production-layout">
        <div class="front-half">
          ${imgSrc ? `<img class="front-img" src="${imgSrc}" alt="Card front"/>` : ''}
        </div>
        <div class="blank-half"></div>
      </div>
    </body>
    </html>`;
  }
  
  // Preview format
  return `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      @page { size: ${layout.overallWidth} ${layout.overallHeight}; margin: 0; }
      html, body { margin: 0; padding: 0; width: ${layout.overallWidth}; height: ${layout.overallHeight}; }
      body { font-family: Arial, sans-serif; background: #ffffff; }
      .wrap { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
      .frame { width: 100%; height: 100%; box-sizing: border-box; border: 2px solid #e5e7eb; border-radius: 8px; overflow: hidden; background: #ffffff; }
      .img { width: 100%; height: 100%; object-fit: contain; display: block; background: #ffffff; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="frame">
        ${imgSrc ? `<img class="img" src="${imgSrc}" alt="Card front preview"/>` : ''}
      </div>
    </div>
  </body>
  </html>`;
}

function generateInsideHTML(layout: LayoutConfig, content: CardContent): string {
  const { firstLine, secondLine, shouldBreak } = formatMessageWithLineBreak(content.message);
  const escapedFirst = escapeHtml(firstLine);
  const escapedSecond = escapeHtml(secondLine);
  
  const baseStyles = `
    @page { size: ${layout.overallWidth} ${layout.overallHeight}; margin: 0; }
    html, body { margin: 0; padding: 0; width: ${layout.overallWidth}; height: ${layout.overallHeight}; }
    body { font-family: Georgia, serif; background: #ffffff; }
    .msg { text-align: center; max-width: 85%; font-size: 20px; line-height: 1.6; color: #111827; font-style: italic; margin: 0 auto; }
    .msgRow { position: absolute; left: 50%; transform: translateX(-50%); top: 28%; display: flex; align-items: center; justify-content: center; width: 100%; padding: 0 20px; box-sizing: border-box; }
    .logoRow { position: absolute; left: 50%; transform: translateX(-50%); top: 56%; display: flex; align-items: center; justify-content: center; width: 100%; padding: 0 20px; box-sizing: border-box; }
    .logo { max-width: 180px; max-height: 56px; object-fit: contain; }
    .sigRow { position: absolute; left: 0; right: 0; top: 68%; display: flex; justify-content: center; }
    .sig { width: 480px; object-fit: contain; }
    .grid { position: relative; display: grid; grid-template-rows: 1fr 1fr 1fr; width: 100%; height: 100%; padding: 24px; box-sizing: border-box; }
  `;

  if (layout.isSpread) {
    // Spread layout: left blank, right content  
    return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        ${baseStyles}
        .spread-layout { width: 100%; height: 100%; display: flex; }
        .blank-half { width: ${layout.contentWidth}; height: ${layout.contentHeight}; background: #ffffff; }
        .inside-half { width: ${layout.contentWidth}; height: ${layout.contentHeight}; position: relative; }
        .inside-content { width: 100%; height: 100%; box-sizing: border-box; border: none; border-radius: 0; overflow: hidden; background: #ffffff; }
      </style>
    </head>
    <body>
      <div class="spread-layout">
        <div class="blank-half"></div>
        <div class="inside-half">
          <div class="inside-content">
            <div class="grid">
              <div class="msgRow">
                <p class="msg">${escapedFirst}${shouldBreak ? '<br />' + escapedSecond : ''}</p>
              </div>
              ${content.logoDataUrl ? `<div class="logoRow"><img class="logo" src="${content.logoDataUrl}" alt="Logo"/></div>` : ''}
              ${content.signatureDataUrl ? `<div class="sigRow"><img class="sig" src="${content.signatureDataUrl}" alt="Signature"/></div>` : ''}
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>`;
  }
  
  // Normal inside layout
  return `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      ${baseStyles}
      .inside-content { width: 100%; height: 100%; box-sizing: border-box; border: 2px solid #e5e7eb; border-radius: 8px; overflow: hidden; background: #ffffff; }
    </style>
  </head>
  <body>
    <div class="inside-content">
      <div class="grid">
        <div class="msgRow">
          <p class="msg">${escapedFirst}${shouldBreak ? '<br />' + escapedSecond : ''}</p>
        </div>
        ${content.logoDataUrl ? `<div class="logoRow"><img class="logo" src="${content.logoDataUrl}" alt="Logo"/></div>` : ''}
        ${content.signatureDataUrl ? `<div class="sigRow"><img class="sig" src="${content.signatureDataUrl}" alt="Signature"/></div>` : ''}
      </div>
    </div>
  </body>
  </html>`;
}

// Legacy compatibility exports
export function generateInsideCardHTML(
  order: any,
  logoDataUrl: string | null,
  signatureDataUrl: string | null,
  orientation: 'portrait' | 'landscape' = 'portrait',
  format: 'preview' | 'production' = 'preview'
): string {
  const message = order.custom_message || order.selected_message || 'Warmest wishes for a joyful and restful holiday season.';
  const isSpread = format === 'production' || orientation === 'landscape';
  
  return generateUnifiedCardHTML('inside', {
    message,
    logoDataUrl,
    signatureDataUrl,
  }, format, isSpread);
}

export function generateBackCardHTML(
  order: any,
  logoDataUrl: string | null,
  signatureDataUrl: string | null
): string {
  return generateInsideCardHTML(order, logoDataUrl, signatureDataUrl, 'landscape');
}