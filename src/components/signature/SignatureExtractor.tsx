
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Wand2, Download, FileText, Image } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import FilePreview from './FilePreview';

interface SignatureExtractorProps {
  onSignatureExtracted: (imageBlob: Blob) => void;
}

const SignatureExtractor: React.FC<SignatureExtractorProps> = ({ onSignatureExtracted }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedSignature, setExtractedSignature] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif'];
      
      if (validTypes.includes(file.type)) {
        setUploadedFile(file);
        setExtractedSignature(null);
        
        const fileType = file.type.startsWith('image/') ? 'image' : 'PDF';
        toast({
          title: `${fileType} Uploaded`,
          description: "File uploaded successfully. You can now extract the signature or use AI extraction.",
        });
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please upload a PDF file or image (JPG, PNG, HEIC).",
          variant: "destructive",
        });
      }
    }
  };

  // Automatically call the parent's onSignatureExtracted when a file is uploaded
  useEffect(() => {
    if (uploadedFile) {
      // Convert the uploaded file to a blob and pass it to the parent
      const blob = new Blob([uploadedFile], { type: uploadedFile.type });
      onSignatureExtracted(blob);
    }
  }, [uploadedFile, onSignatureExtracted]);

  const extractSignature = async () => {
    if (!uploadedFile) return;

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('fileType', uploadedFile.type);

      const response = await fetch('/api/extract-signature', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to extract signature');
      }

      const result = await response.json();
      
      if (result.signatureImage) {
        setExtractedSignature(result.signatureImage);
        
        // Convert base64 to blob for the parent component
        const byteCharacters = atob(result.signatureImage.split(',')[1]);
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
      }
    } catch (error) {
      console.error('Error extracting signature:', error);
      toast({
        title: "Extraction Failed",
        description: "Failed to extract signature. Please try again or upload a different file.",
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
    
    if (uploadedFile.type === 'application/pdf') {
      return <FileText className="mx-auto h-8 w-8 text-red-500 mb-3" />;
    } else {
      return <Image className="mx-auto h-8 w-8 text-blue-500 mb-3" />;
    }
  };

  const getFileDescription = () => {
    if (!uploadedFile) return 'Upload your signature template or image file';
    
    if (uploadedFile.type === 'application/pdf') {
      return `PDF: ${uploadedFile.name}`;
    } else {
      return `Image: ${uploadedFile.name}`;
    }
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
          {getFileTypeIcon()}
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              {getFileDescription()}
            </p>
            <p className="text-xs text-gray-500">PDF, JPG, PNG, HEIC files up to 10MB</p>
            <p className="text-xs text-gray-400">Upload your signature template PDF or image file</p>
          </div>
          <input
            type="file"
            accept=".pdf,image/*"
            onChange={handleFileUpload}
            className="hidden"
            id="signature-file-upload"
          />
          <label htmlFor="signature-file-upload">
            <Button variant="outline" className="cursor-pointer mt-3">
              {uploadedFile ? 'Change File' : 'Choose File'}
            </Button>
          </label>
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
