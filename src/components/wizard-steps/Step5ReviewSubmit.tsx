
import React, { useState } from 'react';
import { useWizard } from '../WizardContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
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
  const clientCount = state.clientList.length;
  const rushFeeTotal = rushFeePerCard * clientCount;
  
  const subtotal = clientCount * 1.91;
  const discount = state.promoCode ? subtotal * 0.1 : 0; // 10% discount for any promo code
  const total = subtotal + rushFeeTotal - discount;

  const handlePromoCodeChange = (value: string) => {
    updateState({ promoCode: value });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Upload logo if exists
      let logoUrl = null;
      if (state.logo) {
        const logoFile = `logos/${Date.now()}-${state.logo.name}`;
        const { error: logoError } = await supabase.storage
          .from('holiday-cards')
          .upload(logoFile, state.logo);
        
        if (!logoError) {
          logoUrl = logoFile;
        }
      }

      // Upload signature if exists
      let signatureUrl = null;
      if (state.signature) {
        const signatureFile = `signatures/${Date.now()}-${state.signature.name}`;
        const { error: signatureError } = await supabase.storage
          .from('holiday-cards')
          .upload(signatureFile, state.signature);
        
        if (!signatureError) {
          signatureUrl = signatureFile;
        }
      }

      // Upload CSV file if exists
      let csvFileUrl = null;
      if (state.csvFile) {
        const csvFile = `csvs/${Date.now()}-${state.csvFile.name}`;
        const { error: csvError } = await supabase.storage
          .from('holiday-cards')
          .upload(csvFile, state.csvFile);
        
        if (!csvError) {
          csvFileUrl = csvFile;
        }
      }

      // Create order using secure function with validation
      const { data: orderId, error: orderError } = await supabase
        .rpc('create_order', {
          p_template_id: state.selectedTemplate || '',
          p_tier_name: 'Standard',
          p_card_quantity: clientCount,
          p_regular_price: subtotal,
          p_final_price: total,
          p_mailing_window: state.mailingWindow || '',
          p_postage_option: state.postageOption,
          p_postage_cost: 0,
          p_custom_message: state.customMessage,
          p_selected_message: state.selectedMessage,
          p_logo_url: logoUrl,
          p_signature_url: signatureUrl,
          p_csv_file_url: csvFileUrl
        });

      if (orderError) throw orderError;
      if (!orderId) throw new Error('Failed to create order');

      // The order object for further processing
      const order = { id: orderId };

      // Insert client records using secure function
      if (clientCount > 0 && order) {
        const clientData = state.clientList.map(client => ({
          first_name: client.firstName,
          last_name: client.lastName,
          address: client.address,
          city: client.city,
          state: client.state,
          zip: client.zip
        }));

        const { error: clientError } = await supabase
          .rpc('insert_client_records', { 
            order_id: order.id, 
            client_data: clientData 
          });

        if (clientError) throw clientError;
      }

      toast({
        title: "Order Submitted Successfully!",
        description: `Your order for ${clientCount || 'TBD'} holiday cards has been submitted.`,
      });
      
      // Get the latest order data with readable ID using secure function
      const { data: orderDetails, error: detailsError } = await supabase
        .rpc('get_order_by_id', { order_id: order.id });

      const finalOrder = orderDetails && orderDetails.length > 0 ? orderDetails[0] : null;

      resetWizard();
      navigate('/order-confirmation', { 
        state: { 
          orderData: {
            ...finalOrder,
            contact_name: state.contactName,
            contact_email: state.contactEmail
          }
        } 
      });
    } catch (error) {
      console.error('Order submission error:', error);
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your order. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
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
              <span className="font-medium">{clientCount > 0 ? `${clientCount} cards` : 'To be determined'}</span>
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
            {clientCount > 0 ? (
              <>
                <div className="flex justify-between">
                  <span>Cards ({clientCount} × $1.91):</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                
                {rushFeeTotal > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span>Rush Fee ({clientCount} × ${rushFeePerCard.toFixed(2)}):</span>
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
              </>
            ) : (
              <div className="text-center py-8">
                <div className="text-xl font-bold text-gray-900 mb-2">Cost To Be Determined</div>
                <p className="text-gray-600">
                  Since no client list was uploaded, we'll provide a custom quote based on your requirements.
                </p>
              </div>
            )}
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
          {isSubmitting ? 'Submitting Order...' : clientCount > 0 ? `Submit Order - $${total.toFixed(2)}` : 'Submit Order for Quote'}
        </Button>
        {/* Debug info */}
        {(!state.contactName || !state.contactEmail || !state.billingAddress) && (
          <div className="text-xs text-red-600 mt-2">
            Missing required fields: {!state.contactName && 'Name '}{!state.contactEmail && 'Email '}{!state.billingAddress && 'Billing Address'}
          </div>
        )}
      </div>
    </div>
  );
};

export default Step5ReviewSubmit;
