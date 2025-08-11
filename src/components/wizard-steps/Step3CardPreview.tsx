
import React, { useState, useEffect } from 'react';
import { useWizard } from '../WizardContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, ImageIcon } from 'lucide-react';
import { getTemplateById } from '@/services/templatesService';

const Step3CardPreview = () => {
  const { state, updateState, nextStep, prevStep } = useWizard();
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  // Get selected template and message for preview
  useEffect(() => {
    const loadTemplate = async () => {
      if (state.selectedTemplate) {
        const template = await getTemplateById(state.selectedTemplate);
        setSelectedTemplate(template);
      }
    };
    loadTemplate();
  }, [state.selectedTemplate]);

  const currentMessage = state.customMessage || state.selectedMessage;

  // Business rule for splitting message at halfway point by character length
  const formatMessageWithLineBreak = (message: string) => {
    if (!message) return '';
    
    const halfLength = Math.floor(message.length / 2);
    const words = message.split(' ');
    
    let characterCount = 0;
    let splitIndex = 0;
    
    // Find the word closest to the halfway point
    for (let i = 0; i < words.length; i++) {
      const wordLength = words[i].length + (i > 0 ? 1 : 0); // +1 for space
      
      if (characterCount + wordLength >= halfLength) {
        // Decide whether to split before or after this word based on which is closer to halfway
        const beforeSplit = characterCount;
        const afterSplit = characterCount + wordLength;
        
        splitIndex = Math.abs(halfLength - beforeSplit) <= Math.abs(halfLength - afterSplit) ? i : i + 1;
        break;
      }
      
      characterCount += wordLength;
    }
    
    // Only split if we have words on both sides and the message is long enough
    if (splitIndex > 0 && splitIndex < words.length && message.length > 30) {
      const firstLine = words.slice(0, splitIndex).join(' ');
      const secondLine = words.slice(splitIndex).join(' ');
      return (
        <>
          {firstLine}
          <br />
          {secondLine}
        </>
      );
    }
    
    return message;
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      updateState({ logo: file });
    }
  };

  const handleRemoveLogo = () => {
    updateState({ logo: null });
  };

  return (
    <div className="space-y-8">
      {/* Title and Description */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Card Preview</h2>
        <p className="text-gray-600">Here's how your holiday cards will look</p>
      </div>

      {/* Card Preview Section - Front and Back */}
      <div className="w-full">
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Front of Card */}
          <div className="text-center">
            <h4 className="text-lg font-medium text-gray-700 mb-4">Card Front</h4>
            <div className="aspect-[3/4] bg-white rounded-lg shadow-lg border-2 border-gray-200 overflow-hidden">
              {selectedTemplate ? (
                <img 
                  src={selectedTemplate.preview_url} 
                  alt="Card front"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-red-100 to-green-100 flex items-center justify-center">
                  <p className="text-gray-500 text-center text-sm">Select a template<br />to see preview</p>
                </div>
              )}
            </div>
          </div>

          {/* Inside of Card */}
          <div className="text-center">
            <h4 className="text-lg font-medium text-gray-700 mb-4">Card Inside</h4>
            <div className="aspect-[3/4] bg-white rounded-lg shadow-lg border-2 border-gray-200 p-6 relative flex flex-col">
              {/* Message in top 1/3 */}
              <div className="h-1/3 flex items-center justify-center mb-4">
                <div className="text-center">
                  {currentMessage ? (
                    <p className="font-playfair text-gray-800 text-base leading-relaxed">
                      {formatMessageWithLineBreak(currentMessage)}
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
                {/* Logo - show uploaded logo, placeholder, or no logo message */}
                <div className="flex justify-center">
                  {state.logo ? (
                    <img 
                      src={URL.createObjectURL(state.logo)} 
                      alt="Company logo"
                      className="w-40 h-24 object-contain"
                    />
                  ) : (
                    <div className="w-40 h-24 bg-gray-50 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                      <div className="text-center">
                        <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                        <span className="text-gray-500 text-xs">No logo</span>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Signature - show if signature service is selected */}
                <div className="flex justify-center">
                  {state.signatureSelected ? (
                    <div className="text-xs italic text-gray-700">
                      Your signature will appear here
                    </div>
                  ) : (
                    <div className="w-24 h-8 border border-gray-300 rounded flex items-center justify-center">
                      <span className="text-gray-500 text-xs">No signature</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Logo Section - Now Optional */}
      <div className="space-y-6 max-w-md mx-auto">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Company Logo (Optional)</h3>
          <p className="text-gray-600">Add your company logo to personalize your cards</p>
        </div>

        <div className="space-y-4">
          <Label htmlFor="logo-upload" className="text-base font-medium text-gray-700">
            Company Logo
            <span className="text-sm text-gray-500 font-normal ml-2">(Optional)</span>
          </Label>
          
          {state.logo ? (
            <div className="space-y-3">
              <div className="border-2 border-green-200 bg-green-50 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center space-x-2 text-green-700 mb-2">
                  <ImageIcon className="w-5 h-5" />
                  <span className="font-medium">Logo uploaded</span>
                </div>
                <p className="text-sm text-green-600">{state.logo.name}</p>
              </div>
              <div className="flex space-x-2">
                <Label
                  htmlFor="logo-upload"
                  className="cursor-pointer flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Replace Logo
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRemoveLogo}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
                >
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Click to upload your logo (optional)
                </p>
                <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
              </div>
              <Label
                htmlFor="logo-upload"
                className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 mt-3"
              >
                Choose File
              </Label>
            </div>
          )}
          
          <Input
            id="logo-upload"
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Navigation */}
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

export default Step3CardPreview;
