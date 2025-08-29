
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Download, FileText, Image, CheckCircle, Scissors } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import FilePreview from './FilePreview';
import ImageCropper from './ImageCropper';
import { supabase } from '@/integrations/supabase/client';

interface SignatureExtractorProps {
  onSignatureExtracted: (imageBlob: Blob) => void;
}

const SignatureExtractor: React.FC<SignatureExtractorProps> = ({ onSignatureExtracted }) => {
  const [isConverting, setIsConverting] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [croppedSignature, setCroppedSignature] = useState<string | null>(null);
  const [fileUploaded, setFileUploaded] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif', 'application/pdf'];
      
      if (validTypes.includes(file.type)) {
        setIsConverting(true);
        setFileUploaded(false);
        setCroppedSignature(null);
        setShowCropper(false);
        
        try {
          toast({
            title: "Processing File",
            description: "Converting your file for cropping...",
          });

          // Convert file to base64 for server-side processing
          const fileBase64 = await fileToBase64(file);
          
          // Call our server-side processing function (now just validates and passes through)
          const { data, error } = await supabase.functions.invoke('convert-signature-file', {
            body: {
              file: fileBase64,
              fileName: file.name,
              fileType: file.type
            }
          });

          if (error) throw error;
          
          if (!data.success) {
            throw new Error(data.error || 'Processing failed');
          }

          // Create a new File object from the processed data
          const processedBlob = await dataUrlToBlob(data.imageData);
          const processedFile = new File([processedBlob], data.fileName, { 
            type: data.convertedFormat 
          });
          
          setUploadedFile(processedFile);
          setFileUploaded(true);
          
          if (data.isPdf) {
            toast({
              title: "PDF Ready",
              description: "Your PDF is ready for cropping. Click 'Crop Signature' to select the signature area.",
            });
          } else {
            toast({
              title: "File Ready", 
              description: "Your file is ready. Click 'Crop Signature' to select the signature area.",
            });
          }

        } catch (error) {
          console.error('Error processing file:', error);
          toast({
            title: "Processing Failed",
            description: `Failed to process file: ${error.message}`,
            variant: "destructive",
          });
          setUploadedFile(null);
          setFileUploaded(false);
        } finally {
          setIsConverting(false);
        }
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please upload an image file (JPG, PNG, HEIC) or PDF containing your signature.",
          variant: "destructive",
        });
      }
    }
  };

  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix to get just the base64 string
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  // Helper function to convert data URL to blob
  const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
    const response = await fetch(dataUrl);
    return response.blob();
  };

  const handleChooseFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleStartCropping = () => {
    console.log('SignatureExtractor: Starting cropping for file:', uploadedFile?.name);
    setShowCropper(true);
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    console.log('SignatureExtractor: handleCropComplete called with blob:', croppedBlob?.size, 'bytes');
    
    // Convert blob to data URL for preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      console.log('SignatureExtractor: DataURL created, length:', dataUrl?.length);
      
      setCroppedSignature(dataUrl);
      setShowCropper(false);
      
      // Pass the blob to the parent component
      console.log('SignatureExtractor: Calling onSignatureExtracted with blob');
      onSignatureExtracted(croppedBlob);
      
      toast({
        title: "Signature Cropped!",
        description: "Your signature has been successfully cropped and is ready to use.",
      });
    };
    
    reader.onerror = (error) => {
      console.error('SignatureExtractor: FileReader error:', error);
      toast({
        title: "Error",
        description: "Failed to process cropped signature",
        variant: "destructive"
      });
    };
    
    reader.readAsDataURL(croppedBlob);
  };

  const handleCancelCropping = () => {
    setShowCropper(false);
  };

  const handleDownloadInstructions = () => {
    const link = document.createElement('a');
    link.href = '/SignatureInstruction.pdf';
    link.download = 'SignatureInstruction.pdf';
    link.click();
  };

  const getFileTypeIcon = () => {
    if (!uploadedFile) return <Upload className="mx-auto h-8 w-8 text-gray-400 mb-3" />;
    if (uploadedFile.name.toLowerCase().includes('.pdf')) return <FileText className="mx-auto h-8 w-8 text-red-500 mb-3" />;
    return <Image className="mx-auto h-8 w-8 text-blue-500 mb-3" />;
  };

  const getFileDescription = () => {
    if (!uploadedFile) return 'Upload your signature file';
    if (uploadedFile.name.toLowerCase().includes('.pdf')) return `PDF converted to image: ${uploadedFile.name}`;
    return `Image: ${uploadedFile.name}`;
  };

  // Show cropper if requested
  if (showCropper && uploadedFile) {
    return (
      <ImageCropper
        imageFile={uploadedFile}
        onCropComplete={handleCropComplete}
        onCancel={handleCancelCropping}
      />
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <Scissors className="w-5 h-5" />
            <span>Manual Signature Cropper</span>
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadInstructions}
            className="flex items-center space-x-2 text-xs"
          >
            <Download className="w-3 h-3" />
            <span>Instructions</span>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Upload */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
          {fileUploaded ? (
            <CheckCircle className="mx-auto h-8 w-8 text-green-500 mb-3" />
          ) : (
            getFileTypeIcon()
          )}
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              {fileUploaded ? `✓ File uploaded: ${uploadedFile?.name}` : getFileDescription()}
            </p>
            <p className="text-xs text-gray-500">JPG, PNG, HEIC, PDF files up to 10MB</p>
            <p className="text-xs text-gray-400">
              {fileUploaded 
                ? "File ready! Use the cropping tool to select your signature area." 
                : "Upload a clear image or PDF of your signature"
              }
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button 
            variant="outline" 
            className="mt-3"
            onClick={handleChooseFileClick}
            disabled={isConverting}
          >
            {isConverting ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                <span>Processing File...</span>
              </div>
            ) : (
              uploadedFile ? 'Change File' : 'Choose File'
            )}
          </Button>
        </div>

        {/* File Preview */}
        {uploadedFile && !showCropper && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">File Preview:</h4>
            <FilePreview file={uploadedFile} />
          </div>
        )}

        {/* Crop Button */}
        {uploadedFile && !showCropper && (
          <div className="space-y-2">
            <Button 
              onClick={handleStartCropping}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <div className="flex items-center space-x-2">
                <Scissors className="w-4 h-4" />
                <span>Crop Signature</span>
              </div>
            </Button>
            <p className="text-xs text-gray-500 text-center">
              Use the cropping tool to manually select your signature area
            </p>
          </div>
        )}

        {/* Cropped Preview */}
        {croppedSignature && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Cropped Signature:</h4>
            <div className="border rounded-lg p-4 bg-gray-50">
              <img 
                src={croppedSignature} 
                alt="Cropped signature"
                className="max-w-full h-auto max-h-32 mx-auto"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SignatureExtractor;
