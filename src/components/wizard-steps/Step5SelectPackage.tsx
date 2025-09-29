
import React from 'react';
import { useWizard } from '../WizardContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Check, Zap, Mail } from 'lucide-react';

const mailingWindows = [
  { value: 'dec-1-5', rushFee: 0 },
  { value: 'dec-6-10', rushFee: 0 },
  { value: 'dec-11-15', rushFee: 0.25 },
  { value: 'dec-16-20', rushFee: 0.25 },
];

const Step5SelectPackage = () => {
  const { state, updateState, nextStep, prevStep, pricingTiers } = useWizard();

  const handleTierSelect = (tier: typeof pricingTiers[0]) => {
    updateState({ selectedTier: tier });
  };

  const signatureAdditionalCost = state.signatureSelected ? 25 : 0;
  const firstClassUpgradePerPiece = state.postageOption === 'first-class' ? 0.30 : 0;
  
  // Get rush fee for selected mailing window
  const selectedWindow = mailingWindows.find(w => w.value === state.mailingWindow);
  const rushFeePerPiece = selectedWindow?.rushFee || 0;

  const handleFirstClassToggle = (checked: boolean) => {
    updateState({ postageOption: checked ? 'first-class' : 'standard' });
  };

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
        {rushFeePerPiece > 0 && (
          <div className="flex items-center justify-center space-x-2 mt-2">
            <Zap className="w-4 h-4 text-red-500" />
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
              ${rushFeePerPiece.toFixed(2)} rush fee per card applies to selected window
            </Badge>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {pricingTiers.map((tier) => {
          const isSelected = state.selectedTier?.name === tier.name;
          const regularPiecePrice = tier.regularPrice / tier.quantity;
          const earlyBirdPiecePrice = tier.earlyBirdPrice / tier.quantity;
          const basePiecePrice = state.earlyBirdActive ? earlyBirdPiecePrice : regularPiecePrice;
          const finalPiecePrice = basePiecePrice + rushFeePerPiece + firstClassUpgradePerPiece;
          const totalWithAddons = (finalPiecePrice * tier.quantity) + signatureAdditionalCost;

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
                  ${finalPiecePrice.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">per card</div>
                {state.earlyBirdActive && (
                  <div className="space-y-1">
                     <div className="text-sm text-gray-500 line-through">
                       ${(regularPiecePrice + rushFeePerPiece).toFixed(2)} each
                     </div>
                    <div className="text-sm text-green-600 font-medium">
                      Save ${(regularPiecePrice - earlyBirdPiecePrice).toFixed(2)} per card
                    </div>
                  </div>
                )}
                <div className="text-lg font-semibold text-blue-600">
                  {tier.quantity} cards total
                </div>
                 <div className="space-y-1 text-xs text-gray-500">
                   {rushFeePerPiece > 0 && (
                     <div className="text-red-600 font-medium">+ ${rushFeePerPiece.toFixed(2)} rush fee per card</div>
                   )}
                   {firstClassUpgradePerPiece > 0 && (
                     <div className="text-blue-600 font-medium">+ ${firstClassUpgradePerPiece.toFixed(2)} first class per card</div>
                   )}
                     {signatureAdditionalCost > 0 && (
                       <div className="text-emerald-600 font-medium">+ $25.00 signature service</div>
                     )}
                 </div>
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
                    Total: ${totalWithAddons.toLocaleString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

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
              {state.selectedTier && (
                <div className="text-sm font-medium text-blue-900">
                  Additional cost: ${(0.30 * state.selectedTier.quantity).toFixed(2)} 
                  <span className="text-blue-700 font-normal"> for {state.selectedTier.quantity} cards</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-semibold text-green-900 mb-2">What's included in every package:</h4>
        <ul className="text-sm text-green-800 space-y-1">
          <li>• High-quality cardstock and professional printing</li>
          <li>• Your logo applied to each card</li>
          <li>• Individual envelope addressing and stuffing</li>
          <li>• Mailing during your selected window</li>
          <li>• Order tracking and delivery confirmation</li>
          {state.signatureSelected && (
            <li>• Professional signature service - our artists will add your signature to each card</li>
          )}
           {rushFeePerPiece > 0 && (
             <li>• Rush processing for faster delivery window</li>
           )}
           {state.postageOption === 'first-class' && (
             <li>• First Class mail service for faster delivery (1-3 business days)</li>
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
