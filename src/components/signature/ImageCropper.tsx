import React, { useEffect, useRef, useState } from 'react';
import { Canvas as FabricCanvas, Rect, FabricImage } from 'fabric';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Crop, Download, RotateCcw } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

interface ImageCropperProps {
  imageFile: File;
  onCropComplete: (croppedImageBlob: Blob) => void;
  onCancel: () => void;
}

const ImageCropper: React.FC<ImageCropperProps> = ({ imageFile, onCropComplete, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [originalImage, setOriginalImage] = useState<FabricImage | null>(null);
  const [cropRect, setCropRect] = useState<Rect | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#f8f9fa',
    });

    setFabricCanvas(canvas);

    // Configure PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    // Load the file (PDF or image)
    if (imageFile.type === 'application/pdf') {
      loadPdf(canvas, imageFile);
    } else {
      loadImage(canvas, imageFile);
    }

    return () => {
      canvas.dispose();
    };
  }, [imageFile]);

  const loadImage = async (canvas: FabricCanvas, file: File) => {
    const imageUrl = URL.createObjectURL(file);
    console.log('Loading image:', file.name, file.type);
    
    try {
      const img = await FabricImage.fromURL(imageUrl);
      console.log('Image loaded:', img.width, img.height);
      
      setupImageOnCanvas(canvas, img);
      URL.revokeObjectURL(imageUrl);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading image:', error);
      URL.revokeObjectURL(imageUrl);
      setIsLoading(false);
    }
  };

  const loadPdf = async (canvas: FabricCanvas, file: File) => {
    console.log('Loading PDF:', file.name);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      console.log('PDF loaded, pages:', pdf.numPages);
      
      // Get first page
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.5 });
      
      // Create canvas for PDF rendering
      const pdfCanvas = document.createElement('canvas');
      const context = pdfCanvas.getContext('2d');
      pdfCanvas.height = viewport.height;
      pdfCanvas.width = viewport.width;
      
      if (!context) {
        throw new Error('Could not get PDF canvas context');
      }

      // Render PDF page to canvas
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      console.log('PDF rendered to canvas:', pdfCanvas.width, pdfCanvas.height);

      // Convert canvas to image and add to fabric canvas
      const imageDataUrl = pdfCanvas.toDataURL('image/png');
      const img = await FabricImage.fromURL(imageDataUrl);
      
      setupImageOnCanvas(canvas, img);
      setIsLoading(false);
      
    } catch (error) {
      console.error('Error loading PDF:', error);
      setIsLoading(false);
    }
  };

  const setupImageOnCanvas = (canvas: FabricCanvas, img: FabricImage) => {
    // Scale image to fit canvas while maintaining aspect ratio
    const canvasWidth = 800;
    const canvasHeight = 600;
    const imageWidth = img.width || 1;
    const imageHeight = img.height || 1;
    
    const scaleX = canvasWidth / imageWidth;
    const scaleY = canvasHeight / imageHeight;
    const scale = Math.min(scaleX, scaleY, 1); // Don't scale up
    
    console.log('Scaling image by:', scale);
    img.scale(scale);
    
    // Center the image on the canvas
    const scaledWidth = imageWidth * scale;
    const scaledHeight = imageHeight * scale;
    
    img.set({
      left: (canvasWidth - scaledWidth) / 2,
      top: (canvasHeight - scaledHeight) / 2,
    });
    
    canvas.add(img);
    canvas.sendObjectToBack(img);
    setOriginalImage(img);
    
    // Create initial crop rectangle
    const cropWidth = Math.min(400, scaledWidth * 0.8);
    const cropHeight = Math.min(200, scaledHeight * 0.4);
    
    const rect = new Rect({
      left: (canvasWidth - cropWidth) / 2,
      top: (canvasHeight - cropHeight) / 2,
      width: cropWidth,
      height: cropHeight,
      fill: 'transparent',
      stroke: '#2563eb',
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      selectable: true,
      evented: true,
    });
    
    canvas.add(rect);
    setCropRect(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
  };

  const handleCrop = async () => {
    console.log('ImageCropper: handleCrop called');
    if (!fabricCanvas || !originalImage || !cropRect) {
      console.error('ImageCropper: Missing required objects:', { fabricCanvas: !!fabricCanvas, originalImage: !!originalImage, cropRect: !!cropRect });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Get crop rectangle bounds
      const cropLeft = cropRect.left || 0;
      const cropTop = cropRect.top || 0;
      const cropWidth = (cropRect.width || 0) * (cropRect.scaleX || 1);
      const cropHeight = (cropRect.height || 0) * (cropRect.scaleY || 1);
      
      console.log('ImageCropper: Cropping area:', { cropLeft, cropTop, cropWidth, cropHeight });
      
      // Create a temporary canvas for cropping
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = cropWidth;
      tempCanvas.height = cropHeight;
      const tempCtx = tempCanvas.getContext('2d');
      
      if (!tempCtx) {
        console.error('ImageCropper: Could not get canvas context');
        throw new Error('Could not get canvas context');
      }
      
      // Draw the cropped portion
      const fabricCanvasElement = fabricCanvas.getElement();
      console.log('ImageCropper: Drawing cropped portion to temp canvas');
      tempCtx.drawImage(
        fabricCanvasElement,
        cropLeft, cropTop, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight
      );
      
      // Convert to blob
      console.log('ImageCropper: Converting to blob...');
      tempCanvas.toBlob((blob) => {
        if (blob) {
          console.log('ImageCropper: Cropped image created:', blob.size, 'bytes');
          onCropComplete(blob);
        } else {
          console.error('ImageCropper: Failed to create blob from canvas');
        }
      }, 'image/png');
      
    } catch (error) {
      console.error('ImageCropper: Error cropping image:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetCrop = () => {
    if (!fabricCanvas || !cropRect || !originalImage) return;
    
    const canvasWidth = 800;
    const canvasHeight = 600;
    const imageWidth = (originalImage.width || 1) * (originalImage.scaleX || 1);
    const imageHeight = (originalImage.height || 1) * (originalImage.scaleY || 1);
    
    // Reset crop rectangle to center
    const cropWidth = Math.min(400, imageWidth * 0.8);
    const cropHeight = Math.min(200, imageHeight * 0.4);
    
    cropRect.set({
      left: (canvasWidth - cropWidth) / 2,
      top: (canvasHeight - cropHeight) / 2,
      width: cropWidth,
      height: cropHeight,
      scaleX: 1,
      scaleY: 1,
    });
    
    fabricCanvas.renderAll();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Crop className="w-5 h-5" />
          <span>Crop Your Signature</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600 mb-4">
          <p>• Drag the blue dashed rectangle to select the area containing your signature</p>
          <p>• Resize the rectangle by dragging its corners</p>
          <p>• Position it precisely around your signature for best results</p>
          {imageFile.type === 'application/pdf' && (
            <p className="text-blue-600">• PDF first page is displayed - crop around your signature area</p>
          )}
        </div>
        
        {isLoading && (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              <span>Loading {imageFile.type === 'application/pdf' ? 'PDF' : 'image'}...</span>
            </div>
          </div>
        )}
        
        <div className="border rounded-lg overflow-hidden bg-gray-50">
          <canvas ref={canvasRef} className="max-w-full" />
        </div>
        
        <div className="flex justify-between items-center pt-4">
          <div className="flex space-x-2">
            <Button variant="outline" onClick={resetCrop} disabled={isLoading}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset Crop
            </Button>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
          
          <Button 
            onClick={handleCrop}
            disabled={isProcessing || isLoading}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {isProcessing ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Cropping...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Download className="w-4 h-4" />
                <span>Crop Signature</span>
              </div>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ImageCropper;