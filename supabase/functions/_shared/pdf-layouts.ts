/**
 * Shared PDF layout templates for consistent rendering
 */

/**
 * Generates the inside card HTML layout - MUST be identical across all PDF generators
 */
export function generateInsideCardHTML(
  order: any,
  logoDataUrl: string | null,
  signatureDataUrl: string | null
): string {
  const message = order.custom_message || order.selected_message || 'Warmest wishes for a joyful and restful holiday season.';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        @page {
          size: 5.125in 7in;
          margin: 0;
        }
        body {
          margin: 0;
          padding: 0;
          width: 5.125in;
          height: 7in;
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
            <p class="text-lg leading-relaxed italic text-foreground opacity-90">${message}</p>
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
 * Alternative layout for generate-card-pdfs compatibility (7" x 5.125")
 */
export function generateBackCardHTML(
  order: any,
  logoDataUrl: string | null,
  signatureDataUrl: string | null
): string {
  const message = order.custom_message || order.selected_message || 'Warmest wishes for a joyful and restful holiday season.';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        @page {
          size: 7in 5.125in;
          margin: 0;
        }
        body {
          margin: 0;
          padding: 0;
          width: 7in;
          height: 5.125in;
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
            <p class="text-lg leading-relaxed italic text-foreground opacity-90">${message}</p>
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