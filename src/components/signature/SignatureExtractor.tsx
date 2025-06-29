
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Wand2, Download, FileText, Image, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import FilePreview from './FilePreview';
import { convertPdfToImage } from '@/utils/pdfToImage';

interface SignatureExtractorProps {
  onSignatureExtracted: (imageBlob: Blob) => void;
}

const SignatureExtractor: React.FC<SignatureExtractorProps> = ({ onSignatureExtracted }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedSignature, setExtractedSignature] = useState<string | null>(null);
  const [fileUploaded, setFileUploaded] = useState(false);
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif', 'application/pdf'];
      
      if (validTypes.includes(file.type)) {
        setIsConverting(file.type === 'application/pdf');
        setFileUploaded(false);
        setExtractedSignature(null);
        
        try {
          let processedFile = file;
          
          // Convert PDF to image if needed
          if (file.type === 'application/pdf') {
            toast({
              title: "Converting PDF",
              description: "Converting PDF to image for signature extraction...",
            });
            
            processedFile = await convertPdfToImage(file);
            
            toast({
              title: "PDF Converted",
              description: "PDF successfully converted to image.",
            });
          }
          
          // Set the processed file for display
          setUploadedFile(processedFile);
          setFileUploaded(true);
          
          // Pass the processed file as a blob to parent
          const blob = new Blob([processedFile], { type: processedFile.type });
          onSignatureExtracted(blob);
          
          toast({
            title: "File Uploaded Successfully",
            description: "Your file is ready. Click 'Extract Signature with AI' to clean and enhance it.",
          });
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

  const handleChooseFileClick = () => {
    fileInputRef.current?.click();
  };

  const extractSignature = async () => {
    if (!uploadedFile) return;

    setIsProcessing(true);
    try {
      // Convert file to base64 for the edge function
      const arrayBuffer = await uploadedFile.arrayBuffer();
      const base64File = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      console.log('Calling extract-signature function...');
      
      const { data, error } = await supabase.functions.invoke('extract-signature', {
        body: {
          file: base64File,
          fileType: uploadedFile.type,
          fileName: uploadedFile.name
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(`Function call failed: ${error.message}`);
      }

      console.log('Function response:', data);
      
      if (data.signatureImage) {
        setExtractedSignature(data.signatureImage);
        
        // Convert base64 to blob for the parent component
        const byteCharacters = atob(data.signatureImage.split(',')[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/png' });
        
        onSignatureExtracted(blob);
        
        toast({
          title: "Signature Extracted!",
          description: "Your signature has been successfully extracted and cleaned.",
        });
      } else if (data.error) {
        throw new Error(data.error);
      } else {
        throw new Error('No signature image returned from AI extraction');
      }
    } catch (error) {
      console.error('Error extracting signature:', error);
      toast({
        title: "Extraction Failed",
        description: `Failed to extract signature: ${error.message}. Please try again with a clear image of your signature.`,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
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

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center space-x-2">
            <Wand2 className="w-5 h-5" />
            <span>AI Signature Extractor</span>
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
                ? "File ready! Use AI extraction for best results." 
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
                <span>Converting PDF...</span>
              </div>
            ) : (
              uploadedFile ? 'Change File' : 'Choose File'
            )}
          </Button>
        </div>

        {/* File Preview */}
        {uploadedFile && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">File Preview:</h4>
            <FilePreview file={uploadedFile} />
          </div>
        )}

        {/* Extract Button */}
        {uploadedFile && (
          <div className="space-y-2">
            <Button 
              onClick={extractSignature}
              disabled={isProcessing}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {isProcessing ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Extracting Signature...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Wand2 className="w-4 h-4" />
                  <span>Extract Signature with AI</span>
                </div>
              )}
            </Button>
            <p className="text-xs text-gray-500 text-center">
              Optional: AI will clean and enhance your signature for professional results
            </p>
          </div>
        )}

        {/* AI Extracted Preview */}
        {extractedSignature && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">AI Extracted Signature:</h4>
            <div className="border rounded-lg p-4 bg-gray-50">
              <img 
                src={extractedSignature} 
                alt="Extracted signature"
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
