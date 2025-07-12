
import React from 'react';
import { useWizard } from './WizardContext';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

// Import all step components
import Step1ChooseTemplate from './wizard-steps/Step1ChooseTemplate';
import Step2SelectMessage from './wizard-steps/Step2SelectMessage';
import Step3CardPreview from './wizard-steps/Step3CardPreview';
import Step4SignatureUpsell from './wizard-steps/Step4SignatureUpsell';
import Step5MailingWindow from './wizard-steps/Step3MailingWindow';
import Step6UploadClients from './wizard-steps/Step6UploadClients';
import Step7SelectPackage from './wizard-steps/Step7SelectPackage';
import Step8ReviewSubmit from './wizard-steps/Step5ReviewSubmit';

const stepTitles = [
  'Choose Template',
  'Select Message',
  'Card Preview',
  'Add Signature',
  'Mailing Window',
  'Upload Client List',
  'Select Package',
  'Review & Submit'
];

const WizardContent = () => {
  const { state, prevStep, nextStep } = useWizard();
  
  const renderStep = () => {
    switch (state.step) {
      case 1:
        return <Step1ChooseTemplate />;
      case 2:
        return <Step2SelectMessage />;
      case 3:
        return <Step3CardPreview />;
      case 4:
        return <Step4SignatureUpsell />;
      case 5:
        return <Step5MailingWindow />;
      case 6:
        return <Step6UploadClients />;
      case 7:
        return <Step7SelectPackage />;
      case 8:
        return <Step8ReviewSubmit />;
      default:
        return <Step1ChooseTemplate />;
    }
  };

  return (
    <div className="min-h-screen bg-white" style={{ backgroundColor: 'white' }}>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-3 text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="text-xl font-bold text-gray-900">AgencyHolidayCards</span>
            </div>
          </Link>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            Step {state.step} of 8: {stepTitles[state.step - 1]}
          </Badge>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 bg-white">
        {/* Navigation */}
        <div className="flex justify-between items-center mb-8 bg-white">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={state.step === 1}
            className="flex items-center space-x-2"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </Button>
          
          <Button
            onClick={nextStep}
            disabled={state.step === 8}
            className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Main Content */}
        <Card className="border-0 shadow-xl bg-white">
          <CardContent className="p-8 lg:p-12 bg-white">
            {renderStep()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WizardContent;
