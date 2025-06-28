
import React from 'react';
import { useWizard } from './WizardContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import Step1ChooseTemplate from './wizard-steps/Step1ChooseTemplate';
import Step2UploadClients from './wizard-steps/Step2UploadClients';
import Step3UploadAssets from './wizard-steps/Step3UploadAssets';
import Step4ShippingWindow from './wizard-steps/Step4ShippingWindow';
import Step5ReviewSubmit from './wizard-steps/Step5ReviewSubmit';

const WizardContent = () => {
  const { state } = useWizard();

  const stepTitles = [
    'Choose Template',
    'Upload Client List',
    'Upload Assets',
    'Select Shipping',
    'Review & Submit'
  ];

  const renderStep = () => {
    switch (state.step) {
      case 1:
        return <Step1ChooseTemplate />;
      case 2:
        return <Step2UploadClients />;
      case 3:
        return <Step3UploadAssets />;
      case 4:
        return <Step4ShippingWindow />;
      case 5:
        return <Step5ReviewSubmit />;
      default:
        return <Step1ChooseTemplate />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-blue-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg"></div>
            <span className="text-xl font-semibold text-gray-800">AgencyHolidayCards.com</span>
          </Link>
          <div className="text-sm text-gray-600">
            Step {state.step} of 5
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress Bar */}
        <Card className="mb-8 border-0 shadow-lg bg-white/70 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-center mb-4">
              <CardTitle className="text-2xl font-bold text-gray-900">
                {stepTitles[state.step - 1]}
              </CardTitle>
              <span className="text-sm font-medium text-gray-500">
                {state.step}/5
              </span>
            </div>
            <Progress value={(state.step / 5) * 100} className="h-2" />
          </CardHeader>
        </Card>

        {/* Step Content */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8">
            {renderStep()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WizardContent;
