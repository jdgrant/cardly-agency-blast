
import React from 'react';
import { useWizard } from '../WizardContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Zap } from 'lucide-react';

const Step5SelectPackage = () => {
  const { state, updateState, nextStep, prevStep, pricingTiers } = useWizard();

  const handleTierSelect = (tier: typeof pricingTiers[0]) => {
    updateState({ selectedTier: tier });
  };

  const postageAdditionalCost = state.postageOption === 'first-class' ? 0.20 : 0;
  const signatureAdditionalCost = state.signature ? 50 : 0; // $50 for signature service

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Select a Package</h2>
        <p className="text-gray-600">Choose the perfect size for your client outreach</p>
        {state.earlyBirdActive && (
          <div className="flex items-center justify-center space-x-2 mt-3">
            <Zap className="w-5 h-5 text-orange-500" />
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
              15% Early Bird Discount Active
            </Badge>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {pricingTiers.map((tier) => {
          const isSelected = state.selectedTier?.name === tier.name;
          const regularPiecePrice = tier.regularPrice / tier.quantity;
          const earlyBirdPiecePrice = tier.earlyBirdPrice / tier.quantity;
          const currentPiecePrice = state.earlyBirdActive ? earlyBirdPiecePrice : regularPiecePrice;
          const totalWithPostage = ((currentPiecePrice + postageAdditionalCost) * tier.quantity) + signatureAdditionalCost;

          return (
            <Card 
              key={tier.name}
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'
              }`}
              onClick={() => handleTierSelect(tier)}
            >
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-lg">{tier.name}</CardTitle>
                <div className="text-3xl font-bold text-gray-900">
                  ${currentPiecePrice.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">per card</div>
                {state.earlyBirdActive && (
                  <div className="space-y-1">
                    <div className="text-sm text-gray-500 line-through">
                      ${regularPiecePrice.toFixed(2)} each
                    </div>
                    <div className="text-sm text-green-600 font-medium">
                      Save ${(regularPiecePrice - earlyBirdPiecePrice).toFixed(2)} per card
                    </div>
                  </div>
                )}
                <div className="text-lg font-semibold text-blue-600">
                  {tier.quantity} cards total
                </div>
                {postageAdditionalCost > 0 && (
                  <div className="text-xs text-gray-500">
                    + ${postageAdditionalCost.toFixed(2)} First-Class postage per card
                  </div>
                )}
                {signatureAdditionalCost > 0 && (
                  <div className="text-xs text-emerald-600 font-medium">
                    + $50.00 signature service
                  </div>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Premium cardstock</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Professional printing</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Custom branding</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Envelope stuffing</span>
                  </div>
                  {postageAdditionalCost === 0 && (
                    <div className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-sm">Standard postage</span>
                    </div>
                  )}
                  {signatureAdditionalCost > 0 && (
                    <div className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm">Professional signature service</span>
                    </div>
                  )}
                </div>
                
                {isSelected && (
                  <div className="mt-4 p-2 bg-blue-50 rounded-lg text-center">
                    <span className="text-sm font-medium text-blue-700">Selected</span>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-gray-200">
                  <div className="text-sm font-medium text-gray-900">
                    Total: ${totalWithPostage.toLocaleString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-semibold text-green-900 mb-2">What's included in every package:</h4>
        <ul className="text-sm text-green-800 space-y-1">
          <li>• High-quality cardstock and professional printing</li>
          <li>• Your logo applied to each card</li>
          <li>• Individual envelope addressing and stuffing</li>
          <li>• Postage and mailing during your selected window</li>
          <li>• Order tracking and delivery confirmation</li>
          {state.signature && (
            <li>• Professional signature service - our artists will add your signature to each card</li>
          )}
        </ul>
      </div>

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={prevStep}>
          Back
        </Button>
        <Button 
          onClick={nextStep}
          disabled={!state.selectedTier}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

export default Step5SelectPackage;
