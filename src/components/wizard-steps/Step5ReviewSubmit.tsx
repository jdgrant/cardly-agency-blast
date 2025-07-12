
import React, { useState } from 'react';
import { useWizard } from '../WizardContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Check, Calendar, Upload, File, Image } from 'lucide-react';

const templates = [
  { id: 'winter-wonderland', name: 'Winter Wonderland' },
  { id: 'festive-gold', name: 'Festive Gold' },
  { id: 'modern-minimal', name: 'Modern Minimal' },
  { id: 'classic-red', name: 'Classic Red' },
  { id: 'snowy-pine', name: 'Snowy Pine' },
  { id: 'elegant-navy', name: 'Elegant Navy' },
];

const shippingWindows = [
  { value: 'dec-1-5', label: 'December 1-5' },
  { value: 'dec-6-10', label: 'December 6-10' },
  { value: 'dec-11-15', label: 'December 11-15' },
  { value: 'dec-16-20', label: 'December 16-20' },
];

const Step5ReviewSubmit = () => {
  const { state, updateState, prevStep, resetWizard } = useWizard();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const selectedTemplate = templates.find(t => t.id === state.selectedTemplate);
  const selectedShippingWindow = shippingWindows.find(w => w.value === state.mailingWindow);
  
  // Calculate rush fee per card for certain windows
  const rushFeePerCard = (state.mailingWindow === 'dec-11-15' || state.mailingWindow === 'dec-16-20') ? 0.25 : 0;
  const rushFeeTotal = rushFeePerCard * state.clientList.length;
  
  const subtotal = state.clientList.length * 1.91;
  const discount = state.promoCode ? subtotal * 0.1 : 0; // 10% discount for any promo code
  const total = subtotal + rushFeeTotal - discount;

  const handlePromoCodeChange = (value: string) => {
    updateState({ promoCode: value });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    // Simulate order submission
    setTimeout(() => {
      // Store order in localStorage (simulating backend)
      const order = {
        id: Date.now(),
        template: selectedTemplate?.name,
        clientCount: state.clientList.length,
        shippingWindow: selectedShippingWindow?.label,
        hasLogo: !!state.logo,
        hasSignature: !!state.signature,
        total: total,
        submittedAt: new Date().toISOString(),
        clients: state.clientList,
      };

      const existingOrders = JSON.parse(localStorage.getItem('holidayCardOrders') || '[]');
      existingOrders.push(order);
      localStorage.setItem('holidayCardOrders', JSON.stringify(existingOrders));

      setIsSubmitting(false);
      toast({
        title: "Order Submitted Successfully!",
        description: `Your order for ${state.clientList.length} holiday cards has been submitted.`,
      });
      
      resetWizard();
      navigate('/');
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Your Order</h2>
        <p className="text-gray-600">Please review all details before submitting your order</p>
      </div>

      {/* Payment & Contact Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Payment & Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contact-name">Contact Name *</Label>
              <Input 
                id="contact-name"
                placeholder="Full Name"
                value={state.contactName || ''}
                onChange={(e) => updateState({ contactName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="contact-email">Email Address *</Label>
              <Input 
                id="contact-email"
                type="email"
                placeholder="email@company.com"
                value={state.contactEmail || ''}
                onChange={(e) => updateState({ contactEmail: e.target.value })}
              />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contact-phone">Phone Number</Label>
              <Input 
                id="contact-phone"
                placeholder="(555) 123-4567"
                value={state.contactPhone || ''}
                onChange={(e) => updateState({ contactPhone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="billing-address">Billing Address *</Label>
              <Input 
                id="billing-address"
                placeholder="123 Main St, City, State 12345"
                value={state.billingAddress || ''}
                onChange={(e) => updateState({ billingAddress: e.target.value })}
              />
            </div>
          </div>
          <div className="pt-3 border-t">
            <div className="text-sm text-gray-600 mb-3">Payment will be processed upon order approval. We accept:</div>
            <div className="flex space-x-4 text-sm text-gray-500">
              <span>💳 Credit Cards</span>
              <span>🏦 ACH/Bank Transfer</span>
              <span>📄 Net 30 Terms (approved accounts)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Check className="w-5 h-5 text-green-600" />
              <span>Order Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Template:</span>
              <span className="font-medium">{selectedTemplate?.name}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Recipients:</span>
              <span className="font-medium">{state.clientList.length} cards</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Mailing Window:</span>
              <div className="text-right">
                <div className="font-medium">{selectedShippingWindow?.label}</div>
                {rushFeePerCard > 0 && (
                  <div className="text-xs text-orange-600">+${rushFeePerCard.toFixed(2)} rush fee per card</div>
                )}
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Logo:</span>
              <span className="font-medium">{state.logo ? 'Yes' : 'None'}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Signature:</span>
              <span className="font-medium">{state.signature ? 'Yes' : 'None'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span>Cards ({state.clientList.length} × $1.91):</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            
            {rushFeeTotal > 0 && (
              <div className="flex justify-between text-orange-600">
                <span>Rush Fee ({state.clientList.length} × ${rushFeePerCard.toFixed(2)}):</span>
                <span>${rushFeeTotal.toFixed(2)}</span>
              </div>
            )}
            
            <div className="space-y-3">
              <Label htmlFor="promo">Promo Code (optional)</Label>
              <Input
                id="promo"
                placeholder="Enter promo code"
                value={state.promoCode}
                onChange={(e) => handlePromoCodeChange(e.target.value)}
              />
            </div>
            
            {discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount:</span>
                <span>-${discount.toFixed(2)}</span>
              </div>
            )}
            
            <Separator />
            
            <div className="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Uploaded Assets Preview */}
      {(state.logo || state.signature) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Image className="w-5 h-5" />
              <span>Uploaded Assets</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {state.logo && (
                <div className="text-center">
                  <div className="font-medium mb-2">Logo</div>
                  <div className="border border-gray-200 rounded-lg p-4 mb-2">
                    <img 
                      src={URL.createObjectURL(state.logo)} 
                      alt="Logo preview" 
                      className="max-w-full max-h-32 mx-auto object-contain"
                    />
                  </div>
                  <div className="text-sm text-gray-600">{state.logo.name}</div>
                </div>
              )}
              {state.signature && (
                <div className="text-center">
                  <div className="font-medium mb-2">Signature</div>
                  <div className="text-sm text-gray-600">{state.signature.name}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">What happens next?</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• You'll receive an order confirmation email within 24 hours</li>
          <li>• Our design team will prepare your cards with your branding</li>
          <li>• Cards will be printed and mailed during your selected window</li>
          <li>• You'll receive tracking information once shipped</li>
        </ul>
      </div>

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={prevStep}>
          Back
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={isSubmitting || !state.contactName || !state.contactEmail || !state.billingAddress}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          {isSubmitting ? 'Submitting Order...' : `Submit Order - $${total.toFixed(2)}`}
        </Button>
      </div>
    </div>
  );
};

export default Step5ReviewSubmit;
