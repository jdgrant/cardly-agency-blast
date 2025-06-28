
import React from 'react';
import { useWizard } from '../WizardContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Calendar } from 'lucide-react';

const shippingWindows = [
  { value: 'dec-1-5', label: 'December 1-5', description: 'Early delivery for maximum impact' },
  { value: 'dec-6-10', label: 'December 6-10', description: 'Popular choice - most orders ship this week' },
  { value: 'dec-11-15', label: 'December 11-15', description: 'Perfect timing for holiday season' },
  { value: 'dec-16-20', label: 'December 16-20', description: 'Last chance for pre-Christmas delivery' },
];

const Step4ShippingWindow = () => {
  const { state, updateState, nextStep, prevStep } = useWizard();

  const handleShippingWindowChange = (value: string) => {
    updateState({ shippingWindow: value });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Shipping Window</h2>
        <p className="text-gray-600">Choose when you'd like your cards to be mailed out</p>
      </div>

      <RadioGroup 
        value={state.shippingWindow || ''} 
        onValueChange={handleShippingWindowChange}
        className="space-y-4"
      >
        {shippingWindows.map((window) => (
          <Card 
            key={window.value}
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
              state.shippingWindow === window.value 
                ? 'ring-2 ring-blue-500 bg-blue-50' 
                : ''
            }`}
            onClick={() => handleShippingWindowChange(window.value)}
          >
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <RadioGroupItem value={window.value} id={window.value} />
                <div className="flex-1">
                  <Label 
                    htmlFor={window.value} 
                    className="flex items-center space-x-3 cursor-pointer"
                  >
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <div>
                      <div className="font-semibold text-gray-900">{window.label}</div>
                      <div className="text-sm text-gray-600">{window.description}</div>
                    </div>
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </RadioGroup>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h4 className="font-semibold text-amber-900 mb-2">Important shipping information:</h4>
        <ul className="text-sm text-amber-800 space-y-1">
          <li>• Cards are printed and mailed within your selected window</li>
          <li>• Standard USPS delivery takes 3-5 business days</li>
          <li>• December 16-20 is the last window for pre-Christmas delivery</li>
          <li>• You'll receive tracking information once cards are shipped</li>
        </ul>
      </div>

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={prevStep}>
          Back
        </Button>
        <Button 
          onClick={nextStep}
          disabled={!state.shippingWindow}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

export default Step4ShippingWindow;
