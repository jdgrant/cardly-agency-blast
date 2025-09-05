/**
 * Shared image processing utilities for PDF generation
 */

/**
 * Downloads an image from Supabase storage and converts it to base64 data URL
 */
export async function downloadAndEncodeImage(
  supabase: any, 
  imagePath: string
): Promise<string | null> {
  try {
    const { data } = await supabase.storage
      .from('holiday-cards')
      .download(imagePath);
    
    if (data) {
      const buf = await data.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      return `data:image/png;base64,${base64}`;
    }
  } catch (error) {
    console.error('Error downloading image:', error);
  }
  return null;
}

/**
 * Downloads an image and encodes it using different encoding method (for gotenberg)
 */
export async function downloadAndEncodeImageForGotenberg(
  supabase: any, 
  imagePath: string
): Promise<string | null> {
  try {
    const { data } = await supabase.storage
      .from('holiday-cards')
      .download(imagePath);
    
    if (data) {
      const buf = await data.arrayBuffer();
      const uint8Array = new Uint8Array(buf);
      
      // Process in chunks to avoid stack overflow with large images
      let binary = '';
      const chunkSize = 8192; // Process 8KB at a time
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      
      const base64 = btoa(binary);
      return `data:image/png;base64,${base64}`;
    }
  } catch (error) {
    console.error('Error downloading image for gotenberg:', error);
  }
  return null;
}