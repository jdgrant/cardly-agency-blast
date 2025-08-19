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
  const [logoPreview, setLogoPreview] = useState<string>('/lovable-uploads/d94d5cf7-af6f-47be-8b08-00fe9dc27a60.png');

  // Simulate uploaded logo state
  useEffect(() => {
    // Set the logo state to show uploaded state with VisionWealthMarketing.png
    if (!state.logo) {
      const mockFile = new File([''], 'VisionWealthMarketing.png', { type: 'image/png' });
      updateState({ logo: mockFile });
    }
  }, []);

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
                {/* Logo - show uploaded logo */}
                <div className="flex justify-center">
                  <img 
                    src={logoPreview} 
                    alt="VisionWealthMarketing logo"
                    className="w-40 h-24 object-contain"
                  />
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

      {/* Upload Logo Section - Show uploaded state */}
      <div className="space-y-6 max-w-md mx-auto">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Company Logo (Optional)</h3>
        </div>

        <div className="space-y-4">
          <div className="border-2 border-green-200 bg-green-50 rounded-lg p-6 text-center">
            <div className="flex items-center justify-center space-x-2 text-green-700 mb-2">
              <ImageIcon className="w-5 h-5" />
              <span className="font-medium">Logo uploaded</span>
            </div>
            <p className="text-sm text-green-600">VisionWealthMarketing.png</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={prevStep}>
          Previous
        </Button>
        <Button 
          onClick={nextStep}
          className="bg-green-600 hover:bg-green-700"
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default Step3CardPreview;