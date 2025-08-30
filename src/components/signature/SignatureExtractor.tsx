import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileImage, FileText, Download, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SignatureExtractorProps {
  onSignatureExtracted: (imageUrl: string) => void;
}

const SignatureExtractor: React.FC<SignatureExtractorProps> = ({ onSignatureExtracted }) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('SignatureExtractor: File selected:', file.name, file.type, file.size);

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload an image file (JPG, PNG, GIF) or PDF');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10MB');
      return;
    }

    setUploadedFile(file);
    console.log('SignatureExtractor: File ready for processing');
  };

  const processAndUploadSignature = async () => {
    if (!uploadedFile) return;

    setIsUploading(true);
    
    try {
      console.log('SignatureExtractor: Uploading cropped signature file');
      
      // Generate unique filename for the cropped signature
      const timestamp = Date.now();
      const fileExtension = uploadedFile.type === 'application/pdf' ? 'pdf' : 
                           uploadedFile.name.split('.').pop() || 'png';
      const fileName = `signatures/cropped_signature_${timestamp}.${fileExtension}`;

      // Upload directly to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('holiday-cards')
        .upload(fileName, uploadedFile, {
          contentType: uploadedFile.type,
          upsert: true
        });

      if (uploadError) {
        console.error('SignatureExtractor: Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('holiday-cards')
        .getPublicUrl(fileName);

      console.log('SignatureExtractor: File uploaded successfully to:', publicUrl);
      
      // Set the uploaded image URL for preview
      setUploadedImageUrl(publicUrl);
      
      // Call the parent callback with the file path (not public URL)
      onSignatureExtracted(fileName);
      
      toast.success('Cropped signature uploaded successfully!');
      
    } catch (error) {
      console.error('SignatureExtractor: Error uploading signature:', error);
      toast.error('Failed to upload signature file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleDownloadInstructions = () => {
    const link = document.createElement('a');
    link.href = '/SignatureInstruction.pdf';
    link.download = 'SignatureInstructions.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="w-5 h-5" />
          <span>Upload Cropped Signature</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-sm text-gray-600">
          <p className="mb-2">Upload the cropped signature for this order:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Supported formats: JPG, PNG, GIF, PDF</li>
            <li>Maximum file size: 10MB</li>
            <li>This signature will be used directly in the customer's cards</li>
          </ul>
        </div>

        {!uploadedFile && (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <div className="space-y-4">
              <div className="flex justify-center space-x-4">
                <FileImage className="w-12 h-12 text-gray-400" />
                <FileText className="w-12 h-12 text-gray-400" />
              </div>
              <div>
                <label htmlFor="signature-upload" className="cursor-pointer">
                  <span className="block text-lg font-medium text-gray-900 mb-2">
                    Choose cropped signature file
                  </span>
                  <span className="text-sm text-gray-500">
                    Click here to select the processed signature file
                  </span>
                  <input
                    id="signature-upload"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {uploadedFile && !uploadedImageUrl && (
          <div className="border rounded-lg p-4 bg-blue-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {uploadedFile.type === 'application/pdf' ? (
                  <FileText className="w-8 h-8 text-red-600" />
                ) : (
                  <FileImage className="w-8 h-8 text-blue-600" />
                )}
                <div>
                  <p className="font-medium text-gray-900">{uploadedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button 
                onClick={processAndUploadSignature}
                disabled={isUploading}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {isUploading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Uploading...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Upload className="w-4 h-4" />
                    <span>Upload Cropped Signature</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        )}

        {uploadedImageUrl && (
          <div className="border rounded-lg p-4 bg-green-50">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <p className="font-medium text-green-900">Cropped signature uploaded successfully!</p>
                <p className="text-sm text-green-700">
                  The signature is now saved and will be used in the customer's cards.
                </p>
              </div>
            </div>
            
            {uploadedImageUrl && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                <img 
                  src={uploadedImageUrl} 
                  alt="Uploaded signature" 
                  className="max-w-full max-h-48 rounded border bg-white shadow-sm"
                />
              </div>
            )}
          </div>
        )}

        <div className="pt-4 border-t">
          <Button variant="outline" onClick={handleDownloadInstructions} className="w-full">
            <Download className="w-4 h-4 mr-2" />
            Download Signature Instructions
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SignatureExtractor;