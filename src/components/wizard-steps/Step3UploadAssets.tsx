
import React from 'react';
import { useWizard } from '../WizardContext';
import { Button } from '@/components/ui/button';
import { mockTemplates } from './Step1ChooseTemplate';

const Step3UploadAssets = () => {
  const { state, nextStep, prevStep } = useWizard();

  // Get selected template and message for preview
  const selectedTemplate = mockTemplates.find(t => t.id === state.selectedTemplate);
  const currentMessage = state.customMessage || state.selectedMessage;

  return (
    <div className="space-y-8">
      {/* Title and Description */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Card Preview</h2>
        <p className="text-gray-600">Here's how your holiday cards will look</p>
      </div>

      {/* Card Preview Section - Only Front and Back */}
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
              
              {/* Bottom half with logo and signature placeholders */}
              <div className="flex-1 flex flex-col justify-center space-y-6">
                {/* Logo placeholder */}
                <div className="flex justify-center">
                  <div className="w-20 h-12 bg-black rounded flex items-center justify-center">
                    <span className="text-white text-xs font-medium">LOGO</span>
                  </div>
                </div>
                
                {/* Signature placeholder */}
                <div className="flex justify-center">
                  <div className="w-24 h-8 border border-gray-300 rounded flex items-center justify-center">
                    <span className="text-gray-500 text-xs">Signature</span>
                  </div>
                </div>
              </div>
            </div>
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
          className="bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700"
        >
          Next
        </Button>
      </div>
    </div>
  );
};

export default Step3UploadAssets;
