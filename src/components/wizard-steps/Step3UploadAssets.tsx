
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
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Add Your Branding & Preview</h2>
        <p className="text-gray-600">Upload your logo and signature, then see your personalized card preview</p>
      </div>

      {/* Card Preview Section - Side by Side */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Card Preview</h3>
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Front of Card */}
          <div>
            <h4 className="text-center text-sm text-gray-600 mb-3 font-medium">Front of Card</h4>
            <Card className="bg-gradient-to-br from-blue-50 to-purple-50">
              <CardContent className="p-4">
                <div className="aspect-[3/4] bg-white rounded-lg shadow-lg p-4 relative overflow-hidden">
                  {selectedTemplate ? (
                    <img 
                      src={selectedTemplate.preview_url} 
                      alt="Card front"
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-red-100 to-green-100 rounded flex items-center justify-center">
                      <p className="text-gray-500 text-center">Select a template<br />to see preview</p>
                    </div>
                  )}
                  {/* Logo overlay */}
                  {logoPreview && (
                    <div className="absolute top-3 right-3 w-14 h-14 bg-white/90 rounded-lg p-2 shadow-sm">
                      <img 
                        src={logoPreview} 
                        alt="Logo" 
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Inside of Card */}
          <div>
            <h4 className="text-center text-sm text-gray-600 mb-3 font-medium">Inside of Card</h4>
            <Card className="bg-gradient-to-br from-green-50 to-blue-50">
              <CardContent className="p-4">
                <div className="aspect-[3/4] bg-white rounded-lg shadow-lg p-4 relative flex flex-col">
                  {/* Message in top 1/3 */}
                  <div className="h-1/3 flex items-center justify-center px-2">
                    <div className="text-center max-w-full">
                      {currentMessage ? (
                        <p className="font-playfair text-gray-800 text-sm leading-relaxed italic">
                          "{currentMessage}"
                        </p>
                      ) : (
                        <p className="text-gray-400 text-sm">
                          Select a message to see preview
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Empty middle space */}
                  <div className="flex-1"></div>
                  
                  {/* Signature at bottom */}
                  <div className="flex justify-end">
                    {signaturePreview ? (
                      <img 
                        src={signaturePreview} 
                        alt="Signature" 
                        className="max-w-20 max-h-10 object-contain"
                      />
                    ) : (
                      <div className="text-gray-400 text-xs">Your signature here</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
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
          Back
        </Button>
        <Button 
          onClick={nextStep}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

export default Step3UploadAssets;
