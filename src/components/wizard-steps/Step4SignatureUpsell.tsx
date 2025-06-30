
import React from 'react';
import { useWizard } from '../WizardContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Download, Upload, Sparkles } from 'lucide-react';

const Step4SignatureUpsell = () => {
  const { state, updateState, nextStep, prevStep } = useWizard();

  const handleSignatureToggle = (checked: boolean) => {
    updateState({ 
      signature: checked ? (state.signature || null) : null,
      signatureSelected: checked 
    });
  };

  const handleSignatureUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      updateState({ signature: file });
    }
  };

  const handleDownloadTemplate = () => {
    // Create a link to download the signature template
    const link = document.createElement('a');
    link.href = '/SignatureInstructions.pdf';
    link.download = 'Signature_Template_Instructions.pdf';
    link.click();
  };

  return (
    <div className="space-y-8">
      {/* Title and Description */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 mb-3">
          <Sparkles className="w-6 h-6 text-yellow-500" />
          <h2 className="text-2xl font-bold text-gray-900">Make Your Cards More Personal</h2>
        </div>
        <p className="text-gray-600 text-lg">Add professional signatures to make your holiday cards truly stand out</p>
      </div>

      {/* Main Upsell Card */}
      <Card className="border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Checkbox 
                id="signature-upsell"
                checked={state.signatureSelected || false}
                onCheckedChange={handleSignatureToggle}
              />
              <Label htmlFor="signature-upsell" className="text-lg font-semibold text-gray-900 cursor-pointer">
                Add Professional Signature Service
              </Label>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-emerald-600">+$50</div>
              <div className="text-sm text-gray-600">one-time fee</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">What's included:</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start space-x-2">
                    <span className="text-emerald-500 mt-1">•</span>
                    <span>Professional artist will add your signature to each card</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-emerald-500 mt-1">•</span>
                    <span>High-quality reproduction that looks hand-signed</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-emerald-500 mt-1">•</span>
                    <span>Perfect placement and sizing on each card</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-emerald-500 mt-1">•</span>
                    <span>Adds personal touch that clients will notice</span>
                  </li>
                </ul>
              </div>

              {state.signatureSelected && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Upload Your Signature:</h4>
                  
                  {/* Download Template Button */}
                  <Button 
                    variant="outline" 
                    onClick={handleDownloadTemplate}
                    className="w-full flex items-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Signature Template</span>
                  </Button>

                  {/* Upload Area */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <Upload className="mx-auto h-8 w-8 text-gray-400 mb-3" />
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        {state.signature ? state.signature.name : 'Upload your signature file'}
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG, or PDF up to 10MB</p>
                    </div>
                    <Input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleSignatureUpload}
                      className="hidden"
                      id="signature-upload"
                    />
                    <Label
                      htmlFor="signature-upload"
                      className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 mt-3"
                    >
                      Choose File
                    </Label>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-800">
                      <strong>Don't have your signature ready?</strong><br />
                      You can upload it later - we'll contact you before production begins.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {!state.signatureSelected && (
              <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
                <p className="text-gray-600">
                  Check the box above to add professional signature service to your order
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={prevStep}>
          Previous
        </Button>
        <Button 
          onClick={nextStep}
          className="bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700"
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

export default Step4SignatureUpsell;
