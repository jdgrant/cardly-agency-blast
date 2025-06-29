
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Wand2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
    if (file && file.type === 'application/pdf') {
      setUploadedFile(file);
      setExtractedSignature(null);
      toast({
        title: "PDF Uploaded",
        description: "Ready to extract signature. Click 'Extract Signature' to process.",
      });
    } else {
      toast({
        title: "Invalid File",
        description: "Please upload a PDF file.",
        variant: "destructive",
      });
    }
  };

  const extractSignature = async () => {
    if (!uploadedFile) return;

    setIsProcessing(true);
    try {
      // Convert PDF to image first
      const formData = new FormData();
      formData.append('pdf', uploadedFile);

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
          <Upload className="mx-auto h-8 w-8 text-gray-400 mb-3" />
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              {uploadedFile ? uploadedFile.name : 'Upload your signature template PDF'}
            </p>
            <p className="text-xs text-gray-500">PDF files only, max 10MB</p>
          </div>
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            className="hidden"
            id="pdf-signature-upload"
          />
          <label htmlFor="pdf-signature-upload">
            <Button variant="outline" className="cursor-pointer mt-3">
              Choose PDF File
            </Button>
          </label>
        </div>

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

        {/* Preview */}
        {extractedSignature && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Extracted Signature:</h4>
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
