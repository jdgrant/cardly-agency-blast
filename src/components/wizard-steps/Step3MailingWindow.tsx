
import React, { useEffect } from 'react';
import { useWizard } from '../WizardContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Zap, Mail } from 'lucide-react';

const mailingWindows = [
  { 
    value: 'dec-1-5', 
    label: 'December 1-5', 
    description: 'Early delivery for maximum impact',
    approvalDeadline: 'November 17th',
    approvalDate: new Date('2025-11-17'),
    rushFee: 0
  },
  { 
    value: 'dec-6-10', 
    label: 'December 6-10', 
    description: 'Popular choice - most orders ship this week',
    approvalDeadline: 'November 22nd',
    approvalDate: new Date('2025-11-22'),
    rushFee: 0
  },
  { 
    value: 'dec-11-15', 
    label: 'December 11-15', 
    description: 'Perfect timing for holiday season',
    approvalDeadline: 'November 27th',
    approvalDate: new Date('2025-11-27'),
    rushFee: 0.25
  },
  { 
    value: 'dec-16-20', 
    label: 'December 16-20', 
    description: 'Last chance for pre-Christmas delivery',
    approvalDeadline: 'December 2nd',
    approvalDate: new Date('2025-12-02'),
    rushFee: 0.25
  },
  { 
    value: 'dec-21-24', 
    label: 'December 21-24', 
    description: 'Final mailing window - arrives around Christmas',
    approvalDeadline: 'December 7th',
    approvalDate: new Date('2025-12-07'),
    rushFee: 0.50
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

  // Since we're in June 2025, all windows should be available
  const availableWindows = mailingWindows.filter(window => !isOptionExpired(window.approvalDate));

  // Auto-select the earliest available window if none is selected
  useEffect(() => {
    if (!state.mailingWindow && availableWindows.length > 0) {
      updateState({ mailingWindow: availableWindows[0].value });
    }
  }, [state.mailingWindow, updateState, availableWindows]);

  const handleMailingWindowChange = (value: string) => {
    updateState({ mailingWindow: value });
  };

  const handleFirstClassToggle = (checked: boolean) => {
    updateState({ postageOption: checked ? 'first-class' : 'standard' });
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
        {availableWindows.map((window) => (
          <Card 
            key={window.value}
            className={`transition-all duration-200 cursor-pointer hover:shadow-md ${
              state.mailingWindow === window.value 
                ? 'ring-2 ring-blue-500 bg-blue-50' 
                : ''
            }`}
            onClick={() => handleMailingWindowChange(window.value)}
          >
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <RadioGroupItem 
                  value={window.value} 
                  id={window.value}
                />
                <div className="flex-1">
                  <Label 
                    htmlFor={window.value} 
                    className="flex items-center space-x-3 cursor-pointer"
                  >
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="font-semibold text-gray-900">
                          {window.label}
                        </div>
                        {window.rushFee > 0 && (
                          <div className="flex items-center space-x-1 bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-medium">
                            <Zap className="w-3 h-3" />
                            <span>+${window.rushFee.toFixed(2)} rush fee</span>
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        {window.description}
                      </div>
                      <div className="flex items-center space-x-2 mt-2">
                        <Clock className="w-4 h-4 text-orange-600" />
                        <div className="text-sm font-medium text-orange-700">
                          Final approval needed by: {window.approvalDeadline}
                        </div>
                      </div>
                    </div>
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </RadioGroup>

      {/* First Class Mailing Upsell */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="first-class-upgrade"
              checked={state.postageOption === 'first-class'}
              onCheckedChange={handleFirstClassToggle}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <Mail className="w-5 h-5 text-blue-600" />
                <label 
                  htmlFor="first-class-upgrade" 
                  className="text-lg font-semibold text-blue-900 cursor-pointer"
                >
                  First Class Mailing Upgrade
                </label>
                <Badge className="bg-blue-600 text-white">+$0.30/card</Badge>
              </div>
              <p className="text-blue-800 text-sm mb-3">
                Upgrade to First Class mail for faster delivery (1-3 business days vs 3-5 business days). 
                Perfect for time-sensitive campaigns or premium client outreach.
              </p>
              {state.clientList.length > 0 && (
                <div className="text-sm font-medium text-blue-900">
                  Additional cost: ${(0.30 * state.clientList.length).toFixed(2)} 
                  <span className="text-blue-700 font-normal"> for {state.clientList.length} cards</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h4 className="font-semibold text-amber-900 mb-2">Important shipping information:</h4>
        <ul className="text-sm text-amber-800 space-y-1">
          <li>• Cards are printed and mailed within your selected window</li>
          <li>• Standard USPS delivery takes 3-5 business days</li>
          <li>• December 21-24 is the last window for Christmas delivery</li>
          <li>• Final approval must be received 2 weeks prior to mailing date</li>
          <li>• Selection deadline is 1 week before final approval date</li>
          <li>• You'll receive tracking information once cards are shipped</li>
          <li>• Rush fees apply to December 11-15, December 16-20, and December 21-24 windows</li>
          {state.postageOption === 'first-class' && (
            <li>• First Class mail service provides faster delivery (1-3 business days)</li>
          )}
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
