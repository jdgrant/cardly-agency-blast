
import { supabase } from '@/integrations/supabase/client';

export const convertPdfToImage = async (file: File): Promise<File> => {
  try {
    // Convert file to base64 for the edge function
    const arrayBuffer = await file.arrayBuffer();
    const base64File = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    console.log('Converting PDF server-side...');
    
    const { data, error } = await supabase.functions.invoke('convert-pdf-to-image', {
      body: {
        file: base64File,
        fileName: file.name
      }
    });

    if (error) {
      console.error('PDF conversion error:', error);
      throw new Error(`PDF conversion failed: ${error.message}`);
    }

    if (!data.imageData) {
      throw new Error('No image data returned from conversion');
    }

    // Check if this is a PDF passthrough (conversion not possible)
    if (data.isPdf) {
      throw new Error('PDF conversion not available. Please upload an image file (JPG, PNG) of your signature instead.');
    }

    // Handle SVG content returned from the edge function
    if (data.imageData.startsWith('data:image/svg+xml')) {
      // Extract SVG content from data URL
      const base64Data = data.imageData.split(',')[1];
      const svgContent = atob(base64Data);
      
      // Create a File object with SVG content and proper mime type
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const imageFile = new File([blob], data.fileName || file.name.replace('.pdf', '.svg'), {
        type: 'image/svg+xml',
        lastModified: Date.now()
      });

      console.log('PDF converted successfully to SVG');
      return imageFile;
    }

    // Handle PNG content (fallback)
    const base64Data = data.imageData.split(',')[1];
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });
    
    const imageFile = new File([blob], data.fileName || file.name.replace('.pdf', '.png'), {
      type: 'image/png',
      lastModified: Date.now()
    });

    console.log('PDF converted successfully server-side');
    return imageFile;
    
  } catch (error) {
    console.error('Error in PDF conversion:', error);
    throw new Error(`Failed to convert PDF: ${error.message}`);
  }
};
