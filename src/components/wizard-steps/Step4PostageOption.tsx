
import React from 'react';
import { useWizard } from '../WizardContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Mail, Clock } from 'lucide-react';

const postageOptions = [
  { 
    value: 'standard',
    label: 'Standard Class',
    cost: 0,
    description: 'Included in package price',
    delivery: '3-5 business days',
    icon: Mail
  },
  { 
    value: 'first-class',
    label: 'First-Class',
    cost: 0.20,
    description: 'Faster delivery option',
    delivery: '1-3 business days',
    icon: Clock
  },
];

const Step4PostageOption = () => {
  const { state, updateState, nextStep, prevStep } = useWizard();

  const handlePostageChange = (value: 'standard' | 'first-class') => {
    updateState({ postageOption: value });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Postage Option</h2>
        <p className="text-gray-600">Select your preferred delivery speed</p>
      </div>

      <RadioGroup 
        value={state.postageOption} 
        onValueChange={handlePostageChange}
        className="space-y-4"
      >
        {postageOptions.map((option) => {
          const IconComponent = option.icon;
          return (
            <Card 
              key={option.value}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                state.postageOption === option.value 
                  ? 'ring-2 ring-blue-500 bg-blue-50' 
                  : ''
              }`}
              onClick={() => handlePostageChange(option.value as 'standard' | 'first-class')}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <RadioGroupItem value={option.value} id={option.value} />
                    <div className="flex items-center space-x-3">
                      <IconComponent className="w-6 h-6 text-blue-600" />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-gray-900">{option.label}</span>
                          {option.value === 'standard' && (
                            <Badge variant="secondary">Default</Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">{option.description}</div>
                        <div className="text-sm text-gray-500">Estimated delivery: {option.delivery}</div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {option.cost > 0 ? (
                      <div className="text-lg font-semibold text-gray-900">
                        +${option.cost}/card
                      </div>
                    ) : (
                      <div className="text-lg font-semibold text-green-600">
                        Included
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </RadioGroup>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">Delivery Information:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Delivery times are estimates based on USPS service standards</li>
          <li>• First-Class mail includes tracking and faster processing</li>
          <li>• All cards are mailed from our facility during your selected window</li>
          <li>• Holiday season may affect delivery times</li>
        </ul>
      </div>

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={prevStep}>
          Back
        </Button>
        <Button 
          onClick={nextStep}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

export default Step4PostageOption;
