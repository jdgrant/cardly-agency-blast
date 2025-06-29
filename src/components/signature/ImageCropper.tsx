
import React, { useEffect, useRef, useState } from 'react';
import { Canvas as FabricCanvas, Rect, FabricImage } from 'fabric';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Crop, Download, RotateCcw } from 'lucide-react';

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

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#f8f9fa',
    });

    setFabricCanvas(canvas);

    // Load the image
    const imageUrl = URL.createObjectURL(imageFile);
    FabricImage.fromURL(imageUrl).then((img) => {
      // Scale image to fit canvas while maintaining aspect ratio
      const canvasWidth = 800;
      const canvasHeight = 600;
      const imageWidth = img.width || 1;
      const imageHeight = img.height || 1;
      
      const scaleX = canvasWidth / imageWidth;
      const scaleY = canvasHeight / imageHeight;
      const scale = Math.min(scaleX, scaleY, 1); // Don't scale up
      
      img.scale(scale);
      
      // Center the image manually
      canvas.centerObject(img);
      
      canvas.add(img);
      canvas.sendObjectToBack(img);
      setOriginalImage(img);
      
      // Create initial crop rectangle
      const cropWidth = Math.min(400, imageWidth * scale);
      const cropHeight = Math.min(200, imageHeight * scale);
      
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
      
      URL.revokeObjectURL(imageUrl);
    });

    return () => {
      canvas.dispose();
    };
  }, [imageFile]);

  const handleCrop = async () => {
    if (!fabricCanvas || !originalImage || !cropRect) return;
    
    setIsProcessing(true);
    
    try {
      // Get crop rectangle bounds
      const cropLeft = cropRect.left || 0;
      const cropTop = cropRect.top || 0;
      const cropWidth = (cropRect.width || 0) * (cropRect.scaleX || 1);
      const cropHeight = (cropRect.height || 0) * (cropRect.scaleY || 1);
      
      // Create a temporary canvas for cropping
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = cropWidth;
      tempCanvas.height = cropHeight;
      const tempCtx = tempCanvas.getContext('2d');
      
      if (!tempCtx) throw new Error('Could not get canvas context');
      
      // Draw the cropped portion
      const fabricCanvasElement = fabricCanvas.getElement();
      tempCtx.drawImage(
        fabricCanvasElement,
        cropLeft, cropTop, cropWidth, cropHeight,
        0, 0, cropWidth, cropHeight
      );
      
      // Convert to blob
      tempCanvas.toBlob((blob) => {
        if (blob) {
          onCropComplete(blob);
        }
      }, 'image/png');
      
    } catch (error) {
      console.error('Error cropping image:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetCrop = () => {
    if (!fabricCanvas || !cropRect) return;
    
    // Reset crop rectangle to center
    cropRect.set({
      left: 200,
      top: 200,
      width: 400,
      height: 200,
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
        </div>
        
        <div className="border rounded-lg overflow-hidden bg-gray-50">
          <canvas ref={canvasRef} className="max-w-full" />
        </div>
        
        <div className="flex justify-between items-center pt-4">
          <div className="flex space-x-2">
            <Button variant="outline" onClick={resetCrop}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset Crop
            </Button>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
          
          <Button 
            onClick={handleCrop}
            disabled={isProcessing}
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
