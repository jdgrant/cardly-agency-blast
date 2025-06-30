
import React from 'react';
import { useWizard } from '../WizardContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Calendar, Clock, AlertTriangle } from 'lucide-react';

const mailingWindows = [
  { 
    value: 'dec-1-5', 
    label: 'December 1-5', 
    description: 'Early delivery for maximum impact',
    approvalDeadline: 'November 17th',
    approvalDate: new Date('2024-11-17')
  },
  { 
    value: 'dec-6-10', 
    label: 'December 6-10', 
    description: 'Popular choice - most orders ship this week',
    approvalDeadline: 'November 22nd',
    approvalDate: new Date('2024-11-22')
  },
  { 
    value: 'dec-11-15', 
    label: 'December 11-15', 
    description: 'Perfect timing for holiday season',
    approvalDeadline: 'November 27th',
    approvalDate: new Date('2024-11-27')
  },
  { 
    value: 'dec-16-20', 
    label: 'December 16-20', 
    description: 'Last chance for pre-Christmas delivery',
    approvalDeadline: 'December 2nd',
    approvalDate: new Date('2024-12-02')
  },
];

const Step3MailingWindow = () => {
  const { state, updateState, nextStep, prevStep } = useWizard();
  const today = new Date();

  const isOptionExpired = (approvalDate: Date) => {
    const oneWeekBeforeApproval = new Date(approvalDate);
    oneWeekBeforeApproval.setDate(approvalDate.getDate() - 7);
    return today > oneWeekBeforeApproval;
  };

  const handleMailingWindowChange = (value: string) => {
    const selectedWindow = mailingWindows.find(w => w.value === value);
    if (selectedWindow && !isOptionExpired(selectedWindow.approvalDate)) {
      updateState({ mailingWindow: value });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Mailing Window</h2>
        <p className="text-gray-600">Choose when you'd like your cards to be mailed out</p>
      </div>

      <RadioGroup 
        value={state.mailingWindow || ''} 
        onValueChange={handleMailingWindowChange}
        className="space-y-4"
      >
        {mailingWindows.map((window) => {
          const expired = isOptionExpired(window.approvalDate);
          return (
            <Card 
              key={window.value}
              className={`transition-all duration-200 ${
                expired 
                  ? 'opacity-50 cursor-not-allowed bg-gray-50' 
                  : `cursor-pointer hover:shadow-md ${
                      state.mailingWindow === window.value 
                        ? 'ring-2 ring-blue-500 bg-blue-50' 
                        : ''
                    }`
              }`}
              onClick={() => !expired && handleMailingWindowChange(window.value)}
            >
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <RadioGroupItem 
                    value={window.value} 
                    id={window.value} 
                    disabled={expired}
                  />
                  <div className="flex-1">
                    <Label 
                      htmlFor={window.value} 
                      className={`flex items-center space-x-3 ${expired ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <Calendar className={`w-5 h-5 ${expired ? 'text-gray-400' : 'text-blue-600'}`} />
                      <div className="flex-1">
                        <div className={`font-semibold ${expired ? 'text-gray-500' : 'text-gray-900'}`}>
                          {window.label}
                          {expired && (
                            <span className="ml-2 text-red-600 text-sm">
                              <AlertTriangle className="w-4 h-4 inline mr-1" />
                              Expired
                            </span>
                          )}
                        </div>
                        <div className={`text-sm ${expired ? 'text-gray-400' : 'text-gray-600'}`}>
                          {expired ? 'Selection deadline has passed' : window.description}
                        </div>
                        <div className="flex items-center space-x-2 mt-2">
                          <Clock className={`w-4 h-4 ${expired ? 'text-gray-400' : 'text-orange-600'}`} />
                          <div className={`text-sm font-medium ${expired ? 'text-gray-400' : 'text-orange-700'}`}>
                            Final approval needed by: {window.approvalDeadline}
                          </div>
                        </div>
                      </div>
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </RadioGroup>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h4 className="font-semibold text-amber-900 mb-2">Important shipping information:</h4>
        <ul className="text-sm text-amber-800 space-y-1">
          <li>• Cards are printed and mailed within your selected window</li>
          <li>• Standard USPS delivery takes 3-5 business days</li>
          <li>• December 16-20 is the last window for pre-Christmas delivery</li>
          <li>• Final approval must be received 2 weeks prior to mailing date</li>
          <li>• Selection deadline is 1 week before final approval date</li>
          <li>• You'll receive tracking information once cards are shipped</li>
        </ul>
      </div>

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={prevStep}>
          Back
        </Button>
        <Button 
          onClick={nextStep}
          disabled={!state.mailingWindow}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

export default Step3MailingWindow;
