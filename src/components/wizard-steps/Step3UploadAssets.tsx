
import React, { useState } from 'react';
import { useWizard } from '../WizardContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Image } from 'lucide-react';
import { mockTemplates } from './Step1ChooseTemplate';

const Step3UploadAssets = () => {
  const { state, updateState, nextStep, prevStep } = useWizard();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      updateState({ logo: file });
      const reader = new FileReader();
      reader.onload = (e) => setLogoPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      updateState({ signature: file });
      const reader = new FileReader();
      reader.onload = (e) => setSignaturePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Get selected template and message for preview
  const selectedTemplate = mockTemplates.find(t => t.id === state.selectedTemplate);
  const currentMessage = state.customMessage || state.selectedMessage;

  return (
    <div className="space-y-8">
      {/* Title and Description */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Logo and Signature</h2>
        <p className="text-gray-600">Add your agency's branding to personalize your cards</p>
      </div>

      {/* Card Preview Section - Front and Inside Side by Side */}
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-8">
        {/* Front of Card */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Card Front</h3>
          <div className="aspect-[3/4] bg-white rounded-lg shadow-lg p-4 relative overflow-hidden border">
            {selectedTemplate ? (
              <img 
                src={selectedTemplate.preview_url} 
                alt="Card front"
                className="w-full h-full object-cover rounded"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-red-100 to-green-100 rounded flex items-center justify-center">
                <p className="text-gray-500 text-center text-sm">Select a template<br />to see preview</p>
              </div>
            )}
          </div>
        </div>

        {/* Inside of Card */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Card Inside</h3>
          <div className="aspect-[3/4] bg-white rounded-lg shadow-lg p-6 relative flex flex-col border">
            {/* Message in top 1/3 */}
            <div className="h-1/3 flex items-center justify-center px-2 mb-4">
              <div className="text-center max-w-full">
                {currentMessage ? (
                  <p className="font-playfair text-gray-800 text-sm leading-relaxed">
                    {currentMessage}
                  </p>
                ) : (
                  <p className="text-gray-400 text-sm">
                    Warmest wishes for a joyful<br />and restful holiday season.
                  </p>
                )}
              </div>
            </div>
            
            {/* Bottom half with logo and signature */}
            <div className="flex-1 flex flex-col justify-center space-y-6">
              {/* Logo placeholder/preview */}
              <div className="flex justify-center">
                {logoPreview ? (
                  <img 
                    src={logoPreview} 
                    alt="Logo" 
                    className="max-w-20 max-h-16 object-contain"
                  />
                ) : (
                  <div className="w-20 h-12 bg-black rounded flex items-center justify-center">
                    <span className="text-white text-xs font-medium">Logo</span>
                  </div>
                )}
              </div>
              
              {/* Signature placeholder/preview */}
              <div className="flex justify-center">
                {signaturePreview ? (
                  <img 
                    src={signaturePreview} 
                    alt="Signature" 
                    className="max-w-24 max-h-10 object-contain"
                  />
                ) : (
                  <div className="w-24 h-8 border border-gray-300 rounded flex items-center justify-center">
                    <span className="text-gray-500 text-xs">Signature</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Assets Section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Logo Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Image className="w-5 h-5" />
              <span>Company Logo</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                {logoPreview ? (
                  <div className="space-y-3">
                    <img 
                      src={logoPreview} 
                      alt="Logo preview" 
                      className="max-w-full h-32 object-contain mx-auto rounded"
                    />
                    <p className="text-sm text-gray-600">{state.logo?.name}</p>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Click to upload logo</p>
                    <p className="text-xs text-gray-500">PNG or JPEG, max 5MB</p>
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleLogoUpload}
                className="hidden"
                id="logo-upload"
              />
              <label htmlFor="logo-upload">
                <Button variant="outline" className="w-full cursor-pointer">
                  {state.logo ? 'Change Logo' : 'Upload Logo'}
                </Button>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Signature Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Image className="w-5 h-5" />
              <span>Signature</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                {signaturePreview ? (
                  <div className="space-y-3">
                    <img 
                      src={signaturePreview} 
                      alt="Signature preview" 
                      className="max-w-full h-32 object-contain mx-auto rounded"
                    />
                    <p className="text-sm text-gray-600">{state.signature?.name}</p>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Click to upload signature</p>
                    <p className="text-xs text-gray-500">PNG or JPEG, max 5MB</p>
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleSignatureUpload}
                className="hidden"
                id="signature-upload"
              />
              <label htmlFor="signature-upload">
                <Button variant="outline" className="w-full cursor-pointer">
                  {state.signature ? 'Change Signature' : 'Upload Signature'}
                </Button>
              </label>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">Tips for best results:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Use high-resolution images (300 DPI recommended)</li>
          <li>• Logos should be on transparent background (PNG format)</li>
          <li>• Signatures work best on white or transparent backgrounds</li>
          <li>• Files will be automatically resized to fit the card design</li>
        </ul>
      </div>

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={prevStep}>
          Previous
        </Button>
        <Button 
          onClick={nextStep}
          className="bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700"
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default Step3UploadAssets;
