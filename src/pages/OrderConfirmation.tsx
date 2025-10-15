import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Check, Calendar, CreditCard, Mail } from 'lucide-react';
import { trackFBPixelEvent, FB_EVENTS } from '@/utils/facebookPixel';
import { supabase } from '@/integrations/supabase/client';

interface OrderData {
  id: string;
  readable_order_id: string;
  template_id: string;
  card_quantity: number;
  final_price: number;
  mailing_window: string;
  contact_name: string;
  contact_email: string;
  status: string;
}

const OrderConfirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const orderData = location.state?.orderData as OrderData;

  // Track Facebook Pixel Purchase event
  useEffect(() => {
    if (orderData) {
      trackFBPixelEvent(FB_EVENTS.PURCHASE, {
        value: orderData.final_price,
        currency: 'USD',
        content_ids: [orderData.template_id],
        content_type: 'product',
        num_items: orderData.card_quantity,
      });

      // Mark wizard session as completed
      const sessionId = localStorage.getItem('wizard_session_id');
      if (sessionId) {
        (async () => {
          try {
            await supabase
              .from('wizard_sessions')
              .update({
                completed: true,
                order_id: orderData.id,
                updated_at: new Date().toISOString(),
              })
              .eq('session_id', sessionId);
            
            // Clear session after successful order
            localStorage.removeItem('wizard_session_id');
            localStorage.removeItem('sendyourcards-wizard-session');
          } catch (error) {
            console.error('Error updating wizard session:', error);
          }
        })();
      }
    }
  }, [orderData]);

  if (!orderData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-green-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No order data found.</p>
            <Button 
              onClick={() => navigate('/')} 
              className="mt-4"
            >
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-green-50 p-4">
      <div className="max-w-2xl mx-auto py-8">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-600">Order Confirmed!</CardTitle>
            <p className="text-muted-foreground">
              Thank you for your holiday card order. We've received your submission and will begin processing it shortly.
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Order Number</p>
                <p className="text-2xl font-bold text-primary">{orderData.readable_order_id}</p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Order Details
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cards:</span>
                    <span>{orderData.card_quantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mailing Window:</span>
                    <span>{orderData.mailing_window}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="capitalize">{orderData.status}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Payment Summary
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Amount:</span>
                    <span className="font-semibold">${orderData.final_price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Status:</span>
                    <span className="text-yellow-600">Pending</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4" />
                What's Next?
              </h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• You'll receive a confirmation email at {orderData.contact_email}</li>
                <li>• Our team will review your order within 24 hours</li>
                <li>• Payment instructions will be sent via email</li>
                <li>• Production will begin once payment is confirmed</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={() => navigate('/')} 
                variant="outline" 
                className="flex-1"
              >
                Create Another Order
              </Button>
              <Button 
                onClick={() => navigate('/order-status')} 
                className="flex-1"
              >
                Check Order Status
              </Button>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p>Need help? Contact us at orders@dividedeye.com</p>
              <p>Reference Order #: {orderData.readable_order_id}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrderConfirmation;