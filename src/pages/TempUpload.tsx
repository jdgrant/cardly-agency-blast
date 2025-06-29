
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const TempUpload = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        setSelectedFile(file);
        setUploadStatus('idle');
        setMessage('');
      } else {
        setMessage('Please select a PDF file');
        setUploadStatus('error');
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploadStatus('uploading');
    
    try {
      // Create a download link to simulate saving to public directory
      const url = URL.createObjectURL(selectedFile);
      const link = document.createElement('a');
      link.href = url;
      link.download = `signature-template.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setUploadStatus('success');
      setMessage(`File "${selectedFile.name}" has been downloaded. Please manually add it to your public folder and rename it to "signature-template.pdf"`);
    } catch (error) {
      setUploadStatus('error');
      setMessage('Upload failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Temporary PDF Upload</h1>
          <p className="text-gray-600">Upload your signature template PDF file</p>
          <Link to="/wizard" className="text-blue-600 hover:underline mt-2 inline-block">
            ← Back to Wizard
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload PDF Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Upload Area */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Select your PDF file
              </h3>
              <p className="text-gray-500 mb-4">
                Choose the signature template PDF
              </p>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
                id="pdf-upload"
              />
              <label htmlFor="pdf-upload">
                <Button variant="outline" className="cursor-pointer">
                  Choose PDF File
                </Button>
              </label>
            </div>

            {/* Selected File Info */}
            {selectedFile && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">Selected File:</p>
                    <p className="text-blue-700">{selectedFile.name}</p>
                    <p className="text-sm text-blue-600">Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
              </div>
            )}

            {/* Status Messages */}
            {message && (
              <div className={`p-4 rounded-lg flex items-start space-x-3 ${
                uploadStatus === 'success' ? 'bg-green-50' : 'bg-red-50'
              }`}>
                {uploadStatus === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                )}
                <p className={uploadStatus === 'success' ? 'text-green-700' : 'text-red-700'}>
                  {message}
                </p>
              </div>
            )}

            {/* Upload Button */}
            <Button 
              onClick={handleUpload}
              disabled={!selectedFile || uploadStatus === 'uploading'}
              className="w-full"
            >
              {uploadStatus === 'uploading' ? 'Processing...' : 'Download File'}
            </Button>

            {/* Instructions */}
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-medium text-yellow-900 mb-2">Instructions:</h4>
              <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
                <li>Select your PDF signature template file</li>
                <li>Click "Download File" - this will download the file to your computer</li>
                <li>Manually add the downloaded file to your project's public folder</li>
                <li>Rename it to "signature-template.pdf"</li>
                <li>The file will then be accessible at "/signature-template.pdf" in your app</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TempUpload;
