import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  Clock, 
  Upload, 
  Eye, 
  CreditCard,
  FileText,
  Image as ImageIcon,
  Users,
  AlertTriangle,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ClientListUploader } from '@/components/admin/ClientListUploader';
import SignatureExtractor from '@/components/signature/SignatureExtractor';

interface Order {
  id: string;
  readable_order_id: string;
  template_id: string;
  tier_name: string;
  card_quantity: number;
  client_count: number;
  regular_price: number;
  final_price: number;
  postage_cost: number;
  mailing_window: string;
  status: string;
  logo_url: string | null;
  signature_url: string | null;
  csv_file_url: string | null;
  created_at: string;
  updated_at: string;
  early_bird_discount: boolean;
  postage_option: string;
  selected_message?: string;
  custom_message?: string;
  front_preview_base64?: string | null;
  inside_preview_base64?: string | null;
  contact_firstname?: string | null;
  contact_lastname?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  billing_address?: string | null;
  invoice_paid?: boolean;
}

interface Template {
  id: string;
  name: string;
  preview_url: string;
  description: string;
}

const OrderManagement = () => {
  const { hashedOrderId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [showClientListUpload, setShowClientListUpload] = useState(false);
  const [showSignatureUpload, setShowSignatureUpload] = useState(false);
  const [showLogoUpload, setShowLogoUpload] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Hash/unhash order ID (simple implementation - in production use proper hashing)
  const hashOrderId = (orderId: string) => {
    return btoa(orderId).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
  };

  const unhashOrderId = (hashedId: string) => {
    try {
      // This is a simple implementation - in production use proper unhashing
      // For now, we'll need to look up by the hashed ID pattern
      return hashedId;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (hashedOrderId) {
      fetchOrderByHashedId();
    }
  }, [hashedOrderId]);

  useEffect(() => {
    // Check for payment status in URL params
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      toast({
        title: "Payment Successful!",
        description: "Your payment has been processed successfully.",
      });
      // Update order status to paid
      if (order?.id) {
        updateOrderPaymentStatus(order.id, true);
      }
    } else if (paymentStatus === 'cancelled') {
      toast({
        title: "Payment Cancelled",
        description: "Your payment was cancelled. You can try again when ready.",
        variant: "destructive"
      });
    }
  }, [searchParams, order?.id]);

  const updateOrderPaymentStatus = async (orderId: string, isPaid: boolean) => {
    try {
      // Use the secure function to update payment status
      const { data, error } = await supabase
        .rpc('update_order_file_for_customer', {
          short_id: hashedOrderId,
          file_type: 'payment',
          file_url: isPaid.toString()
        });

      if (error) throw error;
      if (data) {
        setOrder(prev => prev ? { ...prev, invoice_paid: isPaid } : null);
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
    }
  };

  const fetchOrderByHashedId = async () => {
    try {
      setLoading(true);
      
      // Use the secure function to get order details for customer management
      const { data: orders, error } = await supabase
        .rpc('get_order_for_customer_management', { short_id: hashedOrderId });

      if (error) throw error;
      
      if (!orders || orders.length === 0) {
        throw new Error('Order not found');
      }

      const orderData = orders[0];
      setOrder(orderData);

      // Fetch template details
      if (orderData.template_id) {
        const { data: templateData, error: templateError } = await supabase
          .from('templates')
          .select('*')
          .eq('id', orderData.template_id)
          .maybeSingle();

        if (templateError) {
          console.error('Template fetch error:', templateError);
        } else {
          setTemplate(templateData);
        }
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      toast({
        title: "Order Not Found",
        description: "The order could not be found or the link is invalid.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = () => {
    if (!order) return 0;
    
    let completed = 0;
    const total = 4; // Logo, Signature, Client List, Payment
    
    if (order.logo_url) completed++;
    if (order.signature_url) completed++;
    if (order.csv_file_url) completed++;
    if (order.invoice_paid) completed++;
    
    return (completed / total) * 100;
  };

  const getStepStatus = (stepKey: string) => {
    if (!order) return 'pending';
    
    switch (stepKey) {
      case 'logo':
        return order.logo_url ? 'complete' : 'pending';
      case 'signature':
        return order.signature_url ? 'complete' : 'pending';
      case 'clients':
        return order.csv_file_url ? 'complete' : 'pending';
      case 'payment':
        return order.invoice_paid ? 'complete' : 'pending';
      default:
        return 'pending';
    }
  };

  const canProceedToPayment = () => {
    return order?.logo_url && order?.signature_url && order?.csv_file_url;
  };

  const formatMailingWindow = (window: string) => {
    const windows: Record<string, string> = {
      'dec-1-5': 'December 1-5',
      'dec-6-10': 'December 6-10',
      'dec-11-15': 'December 11-15',
      'dec-16-20': 'December 16-20'
    };
    return windows[window] || window;
  };

  const handleSignatureUpload = async (signatureBlob: Blob) => {
    if (!order?.id || !hashedOrderId) return;

    try {
      const fileName = `signatures/${order.id}_signature_${Date.now()}.png`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('holiday-cards')
        .upload(fileName, signatureBlob, {
          contentType: 'image/png',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Use secure function to update order
      const { data, error: updateError } = await supabase
        .rpc('update_order_file_for_customer', {
          short_id: hashedOrderId,
          file_type: 'signature',
          file_url: fileName
        });

      if (updateError) throw updateError;

      setOrder(prev => prev ? { ...prev, signature_url: fileName } : null);
      setShowSignatureUpload(false);

      toast({
        title: "Success",
        description: "Signature uploaded successfully",
      });

    } catch (error) {
      console.error('Error uploading signature:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload signature",
        variant: "destructive"
      });
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !order?.id || !hashedOrderId) return;

    try {
      const fileName = `logos/${order.id}_logo_${Date.now()}.${file.name.split('.').pop()}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('holiday-cards')
        .upload(fileName, file, {
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Use secure function to update order
      const { data, error: updateError } = await supabase
        .rpc('update_order_file_for_customer', {
          short_id: hashedOrderId,
          file_type: 'logo',
          file_url: fileName
        });

      if (updateError) throw updateError;

      setOrder(prev => prev ? { ...prev, logo_url: fileName } : null);

      toast({
        title: "Success",
        description: "Logo uploaded successfully",
      });

    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload logo",
        variant: "destructive"
      });
    }
  };

  const handlePayment = async () => {
    if (!order?.id || !canProceedToPayment()) return;

    setProcessingPayment(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          orderId: order.id,
          amount: Math.round(order.final_price * 100), // Convert to cents
          returnUrl: window.location.href
        }
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Failed",
        description: "Unable to process payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  const getCurrentMessage = () => {
    return order?.custom_message || order?.selected_message || '';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h1>
          <p className="text-gray-600 mb-6">The order link appears to be invalid or expired.</p>
          <Button onClick={() => navigate('/')} variant="outline">
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Complete Your Holiday Card Order</h1>
            <p className="text-gray-600 mt-2">Order #{order.readable_order_id || order.id.slice(0, 8)}</p>
            <Badge 
              variant={order.status === 'pending' ? 'secondary' : 'default'}
              className="mt-2"
            >
              {order.status.toUpperCase()}
            </Badge>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Payment Success Alert */}
        {searchParams.get('payment') === 'success' && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Payment Successful!</strong> Your order has been paid and is now being processed. 
              Thank you for your business!
            </AlertDescription>
          </Alert>
        )}

        {/* Progress Bar */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Order Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Progress value={calculateProgress()} className="w-full" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  {getStepStatus('logo') === 'complete' ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Clock className="w-4 h-4 text-gray-400" />
                  )}
                  <span>Logo Upload</span>
                </div>
                <div className="flex items-center space-x-2">
                  {getStepStatus('signature') === 'complete' ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Clock className="w-4 h-4 text-gray-400" />
                  )}
                  <span>Signature</span>
                </div>
                <div className="flex items-center space-x-2">
                  {getStepStatus('clients') === 'complete' ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Clock className="w-4 h-4 text-gray-400" />
                  )}
                  <span>Client List</span>
                </div>
                <div className="flex items-center space-x-2">
                  {getStepStatus('payment') === 'complete' ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Clock className="w-4 h-4 text-gray-400" />
                  )}
                  <span>Payment</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Order Details & Uploads */}
          <div className="space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Package</p>
                    <p className="font-medium">{order.tier_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Quantity</p>
                    <p className="font-medium">{order.card_quantity} cards</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Mailing Window</p>
                    <p className="font-medium">{formatMailingWindow(order.mailing_window)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Price</p>
                    <p className="text-lg font-bold text-emerald-600">${Number(order.final_price).toFixed(2)}</p>
                  </div>
                </div>
                
                {template && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Template</p>
                    <div className="flex items-center space-x-3">
                      <img 
                        src={template.preview_url} 
                        alt={template.name}
                        className="w-16 h-16 object-cover rounded border"
                      />
                      <div>
                        <p className="font-medium">{template.name}</p>
                        <p className="text-sm text-gray-600">{template.description}</p>
                      </div>
                    </div>
                  </div>
                )}

                {getCurrentMessage() && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Your Message</p>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm">{getCurrentMessage()}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upload Requirements */}
            <Card>
              <CardHeader>
                <CardTitle>Required Uploads</CardTitle>
                <p className="text-sm text-gray-600">Complete these uploads to proceed with your order</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Logo Upload */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <ImageIcon className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium">Logo Upload</p>
                      <p className="text-sm text-gray-600">Upload your business logo</p>
                    </div>
                  </div>
                  {order.logo_url ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <div>
                      <input
                        type="file"
                        id="logo-upload"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('logo-upload')?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload
                      </Button>
                    </div>
                  )}
                </div>

                {/* Signature Upload */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium">Signature</p>
                      <p className="text-sm text-gray-600">Upload or extract your signature</p>
                    </div>
                  </div>
                  {order.signature_url ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSignatureUpload(true)}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </Button>
                  )}
                </div>

                {/* Client List Upload */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Users className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium">Client List</p>
                      <p className="text-sm text-gray-600">Upload your mailing list (CSV format)</p>
                    </div>
                  </div>
                  {order.csv_file_url ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowClientListUpload(true)}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Preview & Payment */}
          <div className="space-y-6">
            {/* Card Preview */}
            {(order.front_preview_base64 || order.inside_preview_base64) && (
              <Card>
                <CardHeader>
                  <CardTitle>Card Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {order.front_preview_base64 && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Front</p>
                      <img
                        src={order.front_preview_base64}
                        alt="Card Front Preview"
                        className="w-full border rounded-lg"
                      />
                    </div>
                  )}
                  {order.inside_preview_base64 && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Inside</p>
                      <img
                        src={order.inside_preview_base64}
                        alt="Card Inside Preview"
                        className="w-full border rounded-lg"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Payment Section */}
            <Card>
              <CardHeader>
                <CardTitle>Complete Your Order</CardTitle>
              </CardHeader>
              <CardContent>
                {!canProceedToPayment() ? (
                  <div className="text-center py-6">
                    <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Upload Required Files</h3>
                    <p className="text-gray-600 mb-4">
                      Please complete all file uploads before proceeding to payment.
                    </p>
                  </div>
                ) : order.invoice_paid ? (
                  <div className="text-center py-6">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-green-700 mb-2">Payment Complete</h3>
                    <p className="text-gray-600">
                      Thank you! Your order has been paid and is being processed.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                      <h4 className="font-medium text-emerald-900 mb-2">Ready for Payment</h4>
                      <p className="text-sm text-emerald-700">
                        All required files have been uploaded. You can now proceed with payment.
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span>Subtotal:</span>
                        <span>${Number(order.regular_price).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Postage:</span>
                        <span>${Number(order.postage_cost).toFixed(2)}</span>
                      </div>
                      {order.early_bird_discount && (
                        <div className="flex justify-between items-center text-green-600">
                          <span>Early Bird Discount:</span>
                          <span>-${(Number(order.regular_price) + Number(order.postage_cost) - Number(order.final_price)).toFixed(2)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between items-center font-bold text-lg">
                        <span>Total:</span>
                        <span>${Number(order.final_price).toFixed(2)}</span>
                      </div>
                    </div>

                    <Button 
                      onClick={handlePayment}
                      disabled={processingPayment}
                      className="w-full"
                      size="lg"
                    >
                      {processingPayment ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Processing...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <CreditCard className="w-5 h-5" />
                          <span>Pay Now</span>
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Signature Upload Dialog */}
      <Dialog open={showSignatureUpload} onOpenChange={setShowSignatureUpload}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Upload Signature</DialogTitle>
          </DialogHeader>
          <div className="max-h-[calc(90vh-120px)] overflow-y-auto">
            <SignatureExtractor onSignatureExtracted={handleSignatureUpload} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Client List Upload Dialog */}
      <Dialog open={showClientListUpload} onOpenChange={setShowClientListUpload}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Client List</DialogTitle>
          </DialogHeader>
          {order?.id && hashedOrderId && (
            <ClientListUploader 
              orderId={order.id}
              hashedOrderId={hashedOrderId}
              onUploadComplete={() => {
                setShowClientListUpload(false);
                fetchOrderByHashedId();
              }} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderManagement;