
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
    <div className="min-h-screen bg-gray-50">
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
            Step {state.step} of 6
          </Badge>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Progress Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 border-0 shadow-lg bg-white">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4 text-lg">Progress</h3>
                <Progress value={progressPercent} className="mb-6 h-2" />
                <div className="space-y-4">
                  {stepTitles.map((title, index) => {
                    const stepNumber = index + 1;
                    const isActive = state.step === stepNumber;
                    const isCompleted = state.step > stepNumber;
                    
                    return (
                      <div 
                        key={stepNumber}
                        className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 ${
                          isActive 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : isCompleted 
                              ? 'bg-green-50 text-green-700'
                              : 'text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          isActive 
                            ? 'bg-emerald-600 text-white shadow-lg' 
                            : isCompleted 
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-200 text-gray-600'
                        }`}>
                          {isCompleted ? '✓' : stepNumber}
                        </div>
                        <span className="font-medium">{title}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card className="border-0 shadow-xl bg-white">
              <CardContent className="p-8 lg:p-12">
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
