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
import { Check, Calendar, Upload, File, Image, FileText, Mail } from 'lucide-react';

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

const Step7ReviewAndSubmit = () => {
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

  const handleSubmitOrder = async () => {
    setIsSubmitting(true);
    
    try {
      console.log('Starting order submission...');
      
      // Upload files to storage if they exist
      let logoUrl = null;
      let signatureUrl = null;
      let csvFileUrl = null;

      if (state.logo) {
        console.log('Uploading logo...');
        const logoFile = `logos/${Date.now()}-${state.logo.name}`;
        const { data: logoData, error: logoError } = await supabase.storage
          .from('holiday-cards')
          .upload(logoFile, state.logo);
        
        if (logoError) {
          console.error('Logo upload error:', logoError);
          throw new Error('Failed to upload logo');
        }
        logoUrl = logoData.path;
        console.log('Logo uploaded:', logoUrl);
      }

      if (state.signature) {
        console.log('Uploading signature...');
        const signatureFile = `signatures/${Date.now()}-${state.signature.name}`;
        const { data: signatureData, error: signatureError } = await supabase.storage
          .from('holiday-cards')
          .upload(signatureFile, state.signature);
        
        if (signatureError) {
          console.error('Signature upload error:', signatureError);
          throw new Error('Failed to upload signature');
        }
        signatureUrl = signatureData.path;
        console.log('Signature uploaded:', signatureUrl);
      }

      if (state.csvFile) {
        console.log('Uploading CSV file...');
        const csvFile = `csv/${Date.now()}-${state.csvFile.name}`;
        const { data: csvData, error: csvError } = await supabase.storage
          .from('holiday-cards')
          .upload(csvFile, state.csvFile);
        
        if (csvError) {
          console.error('CSV upload error:', csvError);
          throw new Error('Failed to upload CSV file');
        }
        csvFileUrl = csvData.path;
        console.log('CSV uploaded:', csvFileUrl);
      }

      // Create order using RPC
      console.log('Creating order...');
      const { data: orderId, error: orderError } = await supabase.rpc('create_order', {
        p_template_id: state.selectedTemplate,
        p_tier_name: state.selectedTier?.name || 'Custom',
        p_card_quantity: clientCount,
        p_regular_price: subtotal + rushFeeTotal,
        p_final_price: total,
        p_mailing_window: state.mailingWindow,
        p_postage_option: state.postageOption,
        p_postage_cost: 0,
        p_custom_message: state.customMessage,
        p_selected_message: state.selectedMessage,
        p_logo_url: logoUrl,
        p_signature_url: signatureUrl,
        p_csv_file_url: csvFileUrl,
          p_contact_firstname: state.contactFirstName,
          p_contact_lastname: state.contactLastName,
        p_contact_email: state.contactEmail,
        p_contact_phone: state.contactPhone,
        p_billing_address: state.billingAddress,
      });

      if (orderError) {
        console.error('Order creation error:', orderError);
        throw new Error('Failed to create order');
      }

      console.log('Order created with ID:', orderId);

      // Insert client records
      if (clientCount > 0) {
        console.log('Inserting client records...');
        const clientData = state.clientList.map(client => ({
          first_name: client.firstName,
          last_name: client.lastName,
          address: client.address,
          city: client.city,
          state: client.state,
          zip: client.zip,
        }));

        const { error: clientError } = await supabase.rpc('insert_client_records', {
          order_id: orderId,
          client_data: clientData,
        });

        if (clientError) {
          console.error('Client records error:', clientError);
          throw new Error('Failed to save client records');
        }
        console.log('Client records inserted successfully');
      }

      toast({
        title: "Order Submitted Successfully!",
        description: "Your holiday card order has been submitted. An invoice will be sent to your email.",
      });

      // Reset wizard and navigate
      resetWizard();
      navigate('/order-confirmation', { 
        state: { orderId: orderId }
      });

    } catch (error: any) {
      console.error('Submission error:', error);
      toast({
        title: "Submission Error",
        description: error.message || "Failed to submit order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = state.contactFirstName && state.contactLastName && state.contactEmail && state.contactPhone && state.billingAddress;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Review & Submit Order</h2>
        <p className="text-gray-600">Review your order details and submit for processing</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Order Review */}
        <div className="space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contactFirstName">First Name *</Label>
                  <Input
                    id="contactFirstName"
                    value={state.contactFirstName}
                    onChange={(e) => updateState({ contactFirstName: e.target.value })}
                    placeholder="Enter your first name"
                  />
                </div>
                <div>
                  <Label htmlFor="contactLastName">Last Name *</Label>
                  <Input
                    id="contactLastName"
                    value={state.contactLastName}
                    onChange={(e) => updateState({ contactLastName: e.target.value })}
                    placeholder="Enter your last name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contactEmail">Email Address *</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={state.contactEmail}
                    onChange={(e) => updateState({ contactEmail: e.target.value })}
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <Label htmlFor="contactPhone">Phone Number *</Label>
                  <Input
                    id="contactPhone"
                    value={state.contactPhone}
                    onChange={(e) => updateState({ contactPhone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="billingAddress">Billing Address *</Label>
                <Input
                  id="billingAddress"
                  value={state.billingAddress}
                  onChange={(e) => updateState({ billingAddress: e.target.value })}
                  placeholder="123 Main St, City, State 12345"
                />
              </div>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Template:</span>
                <span>{selectedTemplate?.name}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="font-medium">Recipients:</span>
                <span>{clientCount > 0 ? `${clientCount} cards` : 'To be determined'}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="font-medium">Mailing Window:</span>
                <span>{selectedShippingWindow?.label}</span>
              </div>

              {state.logo && (
                <div className="flex items-center space-x-2">
                  <Image className="w-4 h-4" />
                  <span className="text-sm">Logo uploaded</span>
                  <Check className="w-4 h-4 text-green-600" />
                </div>
              )}

              {state.signature && (
                <div className="flex items-center space-x-2">
                  <File className="w-4 h-4" />
                  <span className="text-sm">Signature uploaded</span>
                  <Check className="w-4 h-4 text-green-600" />
                </div>
              )}

              {state.csvFile && (
                <div className="flex items-center space-x-2">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">Client list uploaded</span>
                  <Check className="w-4 h-4 text-green-600" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Order Summary */}
        <div className="space-y-6">
          {/* Order Total */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Order Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {clientCount > 0 ? (
                <>
                  <div className="flex justify-between">
                    <span>Cards ({clientCount} × $1.91)</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  
                  {rushFeeTotal > 0 && (
                    <div className="flex justify-between">
                      <span>Rush Fee ({clientCount} × $0.25)</span>
                      <span>${rushFeeTotal.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <Separator />
                  
                  <div className="flex justify-between text-xl font-bold">
                    <span>Estimated Total</span>
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

          {/* Invoice Notice */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900">Invoice to Follow</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    After order review, we'll send an invoice to your email address for payment processing.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Order */}
          <Card>
            <CardHeader>
              <CardTitle>Submit Order</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleSubmitOrder}
                disabled={isSubmitting || !isFormValid}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                <span>
                  {isSubmitting ? 'Submitting Order...' : 'Submit Order'}
                </span>
              </Button>
              
              {!isFormValid && (
                <p className="text-sm text-red-600 text-center">
                  Please fill in all required contact information
                </p>
              )}
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-green-900 mb-2">What happens next?</h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• We'll review your order within 24 hours</li>
                <li>• You'll receive an invoice via email for payment</li>
                <li>• Cards will be printed and mailed during your selected window</li>
                <li>• Track your order status updates via email</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-6">
        <Button variant="outline" onClick={prevStep} disabled={isSubmitting}>
          Back to Client List
        </Button>
      </div>
    </div>
  );
};

export default Step7ReviewAndSubmit;