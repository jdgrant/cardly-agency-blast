/**
 * Shared PDF layout templates for consistent rendering
 */

/**
 * Unified function to generate inside card HTML with consistent layout
 * @param order - Order data containing message, logo, and signature info
 * @param logoDataUrl - Base64 encoded logo image
 * @param signatureDataUrl - Base64 encoded signature image
 * @param orientation - 'portrait' for 5.125"x7" or 'landscape' for 7"x5.125"
 * @param format - 'preview' for standard layout or 'production' for print layout
 */
export function generateInsideCardHTML(
  order: any,
  logoDataUrl: string | null,
  signatureDataUrl: string | null,
  orientation: 'portrait' | 'landscape' = 'portrait',
  format: 'preview' | 'production' = 'preview'
): string {
  const message = order.custom_message || order.selected_message || 'Warmest wishes for a joyful and restful holiday season.';
  
  // Helper function to escape HTML
  const escapeHtml = (str: string) => {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  if (format === 'production') {
    // Production format: 10.25" x 7" landscape with left half blank, inside content on right half
    const text = String(message || '');
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
    
    let first = escapeHtml(text);
    let second = '';
    if (splitIndex > 0 && splitIndex < words.length && text.length > 30) {
      first = escapeHtml(words.slice(0, splitIndex).join(' '));
      second = escapeHtml(words.slice(splitIndex).join(' '));
    }

    return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        @page { size: 10.25in 7in; margin: 0; }
        html, body { margin: 0; padding: 0; width: 10.25in; height: 7in; }
        body { font-family: Georgia, serif; background: #ffffff; }
        .production-layout { width: 100%; height: 100%; display: flex; }
        .blank-half { width: 5.125in; height: 7in; background: #ffffff; }
        .inside-half { width: 5.125in; height: 7in; position: relative; }
        .inside-content { width: 100%; height: 100%; box-sizing: border-box; border: none; border-radius: 0; overflow: hidden; background: #ffffff; }
        .grid { position: relative; display: grid; grid-template-rows: 1fr 1fr 1fr; width: 100%; height: 100%; padding: 24px; box-sizing: border-box; }
        .top { grid-row: 1 / 2; display: flex; align-items: center; justify-content: center; }
        .msg { text-align: center; max-width: 85%; font-size: 20px; line-height: 1.6; color: #111827; font-style: italic; margin: 0 auto; }
        .msgRow { position: absolute; left: 50%; transform: translateX(-50%); top: 28%; display: flex; align-items: center; justify-content: center; width: 100%; padding: 0 20px; box-sizing: border-box; }
        .logoRow { position: absolute; left: 50%; transform: translateX(-50%); top: 56%; display: flex; align-items: center; justify-content: center; width: 100%; padding: 0 20px; box-sizing: border-box; }
        .logo { max-width: 180px; max-height: 56px; object-fit: contain; }
        .sigRow { position: absolute; left: 0; right: 0; top: 68%; display: flex; justify-content: center; }
        .sig { width: 380px; object-fit: contain; }
      </style>
    </head>
    <body>
      <div class="production-layout">
        <div class="blank-half"></div>
        <div class="inside-half">
          <div class="inside-content">
            <div class="grid">
              <div class="msgRow">
                <p class="msg">${first}${second ? '<br />' + second : ''}</p>
              </div>
              ${logoDataUrl ? `<div class="logoRow"><img class="logo" src="${logoDataUrl}" alt="Logo"/></div>` : ``}
              ${signatureDataUrl ? `<div class="sigRow"><img class="sig" src="${signatureDataUrl}" alt="Signature"/></div>` : ``}
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>`;
  }

  // Preview format - unified layout for both orientations
  const pageSize = orientation === 'portrait' ? '5.125in 7in' : '7in 5.125in';
  const containerDimensions = orientation === 'portrait' 
    ? { width: '5.125in', height: '7in' }
    : { width: '7in', height: '5.125in' };
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        @page {
          size: ${pageSize};
          margin: 0;
        }
        body {
          margin: 0;
          padding: 0;
          width: ${containerDimensions.width};
          height: ${containerDimensions.height};
          font-family: 'Georgia', serif;
          background: white;
          overflow: hidden;
        }
        .w-full { width: 100%; }
        .h-full { height: 100%; }
        .grid { display: grid; }
        .grid-rows-3 { grid-template-rows: repeat(3, minmax(0, 1fr)); }
        .p-8 { padding: 2rem; }
        .relative { position: relative; }
        .row-start-1 { grid-row-start: 1; }
        .row-end-2 { grid-row-end: 2; }
        .row-start-2 { grid-row-start: 2; }
        .row-end-3 { grid-row-end: 3; }
        .flex { display: flex; }
        .items-center { align-items: center; }
        .justify-center { justify-content: center; }
        .text-center { text-align: center; }
        .max-w-4xl { max-width: 80%; }
        .text-lg { font-size: 1.125rem; }
        .leading-relaxed { line-height: 1.625; }
        .italic { font-style: italic; }
        .text-foreground { color: #0f172a; }
        .opacity-90 { opacity: 0.9; }
        .absolute { position: absolute; }
        .left-1-2 { left: 50%; }
        .transform { transform: translateX(-50%); }
        .top-56 { top: 56%; }
        .top-68 { top: 68%; }
        .left-0 { left: 0; }
        .right-0 { right: 0; }
        .max-h-14 { max-height: 3.5rem; }
        .max-w-180 { max-width: 180px; }
        .object-contain { object-fit: contain; }
        .w-380 { width: 380px; }
      </style>
    </head>
    <body>
      <div class="w-full h-full grid grid-rows-3 p-8 relative">
        <div class="row-start-1 row-end-2 flex items-center justify-center">
          <div class="text-center max-w-4xl">
            <p class="text-lg leading-relaxed italic text-foreground opacity-90">${escapeHtml(message)}</p>
          </div>
        </div>
        
        <div class="row-start-2 row-end-3"></div>
        
        ${logoDataUrl ? `
        <div class="absolute left-1-2 transform top-56 flex items-center justify-center">
          <img src="${logoDataUrl}" alt="Company logo" class="max-h-14 max-w-180 object-contain" loading="lazy">
        </div>
        ` : ''}
        
        ${signatureDataUrl ? `
        <div class="absolute left-0 right-0 top-68 flex justify-center">
          <img src="${signatureDataUrl}" alt="Signature" loading="lazy" class="w-380">
        </div>
        ` : ''}
      </div>
    </body>
    </html>
  `;
}

/**
 * Legacy wrapper for backward compatibility - landscape orientation (7" x 5.125")
 */
export function generateBackCardHTML(
  order: any,
  logoDataUrl: string | null,
  signatureDataUrl: string | null
): string {
  return generateInsideCardHTML(order, logoDataUrl, signatureDataUrl, 'landscape');
}