
import React from 'react';
import { useWizard } from './WizardContext';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Link } from 'react-router-dom';
import { Progress } from './ui/progress';
import { ArrowLeft } from 'lucide-react';

// Import all step components
import Step1ChooseTemplate from './wizard-steps/Step1ChooseTemplate';
import Step2UploadAssets from './wizard-steps/Step2UploadAssets';
import Step3MailingWindow from './wizard-steps/Step3MailingWindow';
import Step4PostageOption from './wizard-steps/Step4PostageOption';
import Step5SelectPackage from './wizard-steps/Step5SelectPackage';
import Step6UploadSubmit from './wizard-steps/Step6UploadSubmit';

const stepTitles = [
  'Choose Template',
  'Upload Assets',
  'Mailing Window',
  'Postage Option',
  'Select Package',
  'Upload & Submit'
];

const WizardContent = () => {
  const { state } = useWizard();
  
  const renderStep = () => {
    switch (state.step) {
      case 1:
        return <Step1ChooseTemplate />;
      case 2:
        return <Step2UploadAssets />;
      case 3:
        return <Step3MailingWindow />;
      case 4:
        return <Step4PostageOption />;
      case 5:
        return <Step5SelectPackage />;
      case 6:
        return <Step6UploadSubmit />;
      default:
        return <Step1ChooseTemplate />;
    }
  };

  const progressPercent = (state.step / 6) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-blue-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-2">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg"></div>
              <span className="text-xl font-semibold text-gray-800">AgencyHolidayCards.com</span>
            </div>
          </Link>
          <Badge variant="outline">Step {state.step} of 6</Badge>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Progress Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Progress</h3>
                <Progress value={progressPercent} className="mb-4" />
                <div className="space-y-3">
                  {stepTitles.map((title, index) => {
                    const stepNumber = index + 1;
                    const isActive = state.step === stepNumber;
                    const isCompleted = state.step > stepNumber;
                    
                    return (
                      <div 
                        key={stepNumber}
                        className={`flex items-center space-x-3 p-2 rounded-lg transition-colors ${
                          isActive 
                            ? 'bg-blue-100 text-blue-700' 
                            : isCompleted 
                              ? 'bg-green-50 text-green-700'
                              : 'text-gray-500'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                          isActive 
                            ? 'bg-blue-500 text-white' 
                            : isCompleted 
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-300 text-gray-600'
                        }`}>
                          {isCompleted ? '✓' : stepNumber}
                        </div>
                        <span className="text-sm font-medium">{title}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
              <CardContent className="p-8">
                {renderStep()}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WizardContent;
