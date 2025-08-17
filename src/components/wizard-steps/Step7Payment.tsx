import React, { useState } from 'react';
import { useWizard } from '../WizardContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, Lock, Shield } from 'lucide-react';

const Step7Payment = () => {
  const { state, nextStep, prevStep } = useWizard();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Calculate totals
  const rushFeePerCard = (state.mailingWindow === 'dec-11-15' || state.mailingWindow === 'dec-16-20') ? 0.25 : 0;
  const rushFeeTotal = rushFeePerCard * state.clientList.length;
  const subtotal = state.clientList.length * 1.91;
  const discount = state.promoCode ? subtotal * 0.1 : 0;
  const total = subtotal + rushFeeTotal - discount;

  const handlePayment = async () => {
    setIsProcessing(true);
    
    try {
      // Call Stripe checkout edge function
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          amount: Math.round(total * 100), // Convert to cents
          description: `Holiday Cards Order - ${state.clientList.length} cards`,
          metadata: {
            template: state.selectedTemplate,
            clientCount: state.clientList.length.toString(),
            mailingWindow: state.mailingWindow,
          }
        }
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        // Open Stripe checkout in a new tab
        window.open(data.url, '_blank');
        
        // Move to next step (review/submit) after payment initiated
        nextStep();
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initialize payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Payment</h2>
        <p className="text-gray-600">Secure payment processing powered by Stripe</p>
      </div>

      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5" />
            <span>Order Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span>Cards ({state.clientList.length} × $1.91)</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          
          {rushFeeTotal > 0 && (
            <div className="flex justify-between">
              <span>Rush Fee ({state.clientList.length} × $0.25)</span>
              <span>${rushFeeTotal.toFixed(2)}</span>
            </div>
          )}
          
          {discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Promo Code Discount</span>
              <span>-${discount.toFixed(2)}</span>
            </div>
          )}
          
          <Separator />
          
          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900">Secure Payment</h3>
              <p className="text-sm text-blue-700 mt-1">
                Your payment is processed securely through Stripe. We never store your payment information.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Actions */}
      <div className="flex justify-between items-center pt-6">
        <Button variant="outline" onClick={prevStep} disabled={isProcessing}>
          Back to Client List
        </Button>
        
        <Button 
          onClick={handlePayment}
          disabled={isProcessing}
          className="flex items-center space-x-2"
          size="lg"
        >
          <Lock className="w-4 h-4" />
          <span>{isProcessing ? 'Processing...' : `Pay $${total.toFixed(2)}`}</span>
        </Button>
      </div>
    </div>
  );
};

export default Step7Payment;