import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ArrowLeft, 
  Download, 
  Eye, 
  Calendar,
  CreditCard,
  Users,
  Package,
  FileText,
  Image as ImageIcon,
  MapPin,
  Upload,
  ChevronDown
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import SignatureExtractor from '@/components/signature/SignatureExtractor';
import { ClientListUploader } from '@/components/admin/ClientListUploader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  // Production combined PDF storage
  production_combined_pdf_public_url?: string | null;
  production_combined_pdf_path?: string | null;
  production_combined_pdf_generated_at?: string | null;
  // Contact information
  contact_firstname?: string | null;
  contact_lastname?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  billing_address?: string | null;
  // Status checkboxes
  signature_purchased?: boolean;
  signature_submitted?: boolean;
  mailing_list_uploaded?: boolean;
  logo_uploaded?: boolean;
  invoice_paid?: boolean;
}


interface Template {
  id: string;
  name: string;
  preview_url: string;
  description: string;
}

interface ClientRecord {
  id: string;
  first_name: string;
  last_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

const JobDetail = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [logoBlob, setLogoBlob] = useState<string | null>(null);
  const [signatureBlob, setSignatureBlob] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSignatureUpload, setShowSignatureUpload] = useState(false);
  const [generatingPDFs, setGeneratingPDFs] = useState(false);
  const [generatingFront, setGeneratingFront] = useState(false);
  const [generatingGotenberg, setGeneratingGotenberg] = useState(false);
  const [generatingProduction, setGeneratingProduction] = useState(false);
  const [advancedSectionOpen, setAdvancedSectionOpen] = useState(false);
  const [showClientListUpload, setShowClientListUpload] = useState(false);
  const [pdfDownloadUrls, setPdfDownloadUrls] = useState<{front?: string, back?: string, gotenberg?: string, production?: string, productionFront?: string, productionInside?: string}>({});

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  useEffect(() => {
    if (order && (!order.front_preview_base64 || !order.inside_preview_base64)) {
      handleGeneratePreviews();
    }
  }, [order?.id, order?.front_preview_base64, order?.inside_preview_base64]);

  const fetchOrderDetails = async () => {
    try {
      console.log('Starting to fetch order details for:', orderId);
      
      // Fetch order details using secure function
      const { data: orderDetails, error: orderError } = await supabase
        .rpc('get_order_by_id', { order_id: orderId });

      console.log('Order details response:', { orderDetails, orderError });

      if (orderError || !orderDetails || orderDetails.length === 0) {
        throw new Error('Order not found');
      }
      
      const orderData = orderDetails[0];
      setOrder(orderData);
      console.log('Order data set:', orderData);

      // Fetch template details
      if (orderData.template_id) {
        console.log('Fetching template:', orderData.template_id);
        
        const { data: templateData, error: templateError } = await supabase
          .from('templates')
          .select('*')
          .eq('id', orderData.template_id)
          .maybeSingle(); // Use maybeSingle instead of single

        console.log('Template response:', { templateData, templateError });

        if (templateError) {
          console.error('Template fetch error:', templateError);
        } else {
          setTemplate(templateData);
        }
      }

      // Fetch client records for this order
      console.log('Fetching client records for order:', orderId);
      
      const { data: clientsData, error: clientsError } = await supabase
        .from('client_records')
        .select('*')
        .eq('order_id', orderId);

      console.log('Clients response:', { clientsData, clientsError });

      if (clientsError) {
        console.error('Clients fetch error:', clientsError);
      } else {
        setClients(clientsData || []);
      }

      // Download logo and signature files for preview
      if (orderData.logo_url) {
        try {
          console.log('Downloading logo:', orderData.logo_url);
          
          const { data: logoData } = await supabase.storage
            .from('holiday-cards')
            .download(orderData.logo_url);
          
          if (logoData) {
            setLogoBlob(URL.createObjectURL(logoData));
          }
        } catch (error) {
          console.error('Error loading logo:', error);
        }
      }

      if (orderData.signature_url) {
        try {
          console.log('Downloading signature:', orderData.signature_url);
          
          const { data: signatureData } = await supabase.storage
            .from('holiday-cards')
            .download(orderData.signature_url);
          
          if (signatureData) {
            setSignatureBlob(URL.createObjectURL(signatureData));
          }
        } catch (error) {
          console.error('Error loading signature:', error);
        }
      }

      console.log('Finished fetching all data successfully');

    } catch (error) {
      console.error('Error fetching order details:', error);
      toast({
        title: "Error",
        description: "Failed to fetch order details",
        variant: "destructive"
      });
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
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

  const downloadFile = async (filePath: string, fileName: string) => {
    try {
      console.log('Attempting to download file:', filePath, 'as:', fileName);
      
      const { data, error } = await supabase.storage
        .from('holiday-cards')
        .download(filePath);

      console.log('Download response:', { data, error });

      if (error) {
        console.error('Storage download error:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No file data received');
      }

      console.log('Creating blob URL for download...');
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Clean up the object URL after a short delay
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      
      console.log('Download initiated successfully');
      
    } catch (error) {
      console.error('Download error details:', error);
      toast({
        title: "Download Failed",
        description: `Unable to download file: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  // Business rule for splitting message at halfway point by character length (same as preview)
  const formatMessageWithLineBreak = (message: string) => {
    if (!message) return '';
    
    const halfLength = Math.floor(message.length / 2);
    const words = message.split(' ');
    
    let characterCount = 0;
    let splitIndex = 0;
    
    // Find the word closest to the halfway point
    for (let i = 0; i < words.length; i++) {
      const wordLength = words[i].length + (i > 0 ? 1 : 0); // +1 for space
      
      if (characterCount + wordLength >= halfLength) {
        // Decide whether to split before or after this word based on which is closer to halfway
        const beforeSplit = characterCount;
        const afterSplit = characterCount + wordLength;
        
        splitIndex = Math.abs(halfLength - beforeSplit) <= Math.abs(halfLength - afterSplit) ? i : i + 1;
        break;
      }
      
      characterCount += wordLength;
    }
    
    // Only split if we have words on both sides and the message is long enough
    if (splitIndex > 0 && splitIndex < words.length && message.length > 30) {
      const firstLine = words.slice(0, splitIndex).join(' ');
      const secondLine = words.slice(splitIndex).join(' ');
      return (
        <>
          {firstLine}
          <br />
          {secondLine}
        </>
      );
    }
    
    return message;
  };

  // Get the current message for display
  const getCurrentMessage = () => {
    return order?.custom_message || order?.selected_message || '';
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      // Update local state
      setOrder(prev => prev ? { ...prev, status: newStatus } : null);

      toast({
        title: "Status Updated",
        description: `Order status changed to ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update order status",
        variant: "destructive"
      });
    }
  };

  const updateOrderStatusField = async (orderId: string, fieldName: string, fieldValue: boolean) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ [fieldName]: fieldValue })
        .eq('id', orderId);

      if (error) throw error;

      // Update local state
      setOrder(prev => prev ? { ...prev, [fieldName]: fieldValue } : null);

      toast({
        title: "Status Updated",
        description: `${fieldName.replace('_', ' ')} updated successfully`,
      });
    } catch (error) {
      console.error('Update status field error:', error);
      toast({
        title: "Error",
        description: "Failed to update status field",
        variant: "destructive"
      });
    }
  };

  const handleSignatureUpload = async (signatureBlob: Blob) => {
    if (!order?.id) return;

    try {
      // Upload signature to Supabase storage
      const fileName = `signatures/${order.id}_signature_${Date.now()}.png`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('holiday-cards')
        .upload(fileName, signatureBlob, {
          contentType: 'image/png',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Update order record with signature URL
      // Note: Admin session should allow this update
      const { error: updateError } = await supabase
        .from('orders')
        .update({ signature_url: fileName })
        .eq('id', order.id);

      if (updateError) throw updateError;

      // Update local state
      setOrder(prev => prev ? { ...prev, signature_url: fileName } : null);
      
      // Create blob URL for immediate preview
      setSignatureBlob(URL.createObjectURL(signatureBlob));
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

  const handleGeneratePDFs = async () => {
    if (!order?.id) return;

    setGeneratingPDFs(true);
    
    try {
      console.log('Generating PDFs for order:', order.id);
      
      const { data, error } = await supabase.functions.invoke('generate-card-pdfs', {
        body: { orderId: order.id }
      });

      console.log('PDF generation response:', data, error);

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'Unknown error occurred');
      }

      // Store download URLs for display
      setPdfDownloadUrls({
        front: data.frontDownloadUrl,
        back: data.backDownloadUrl
      });

      toast({
        title: "Success",
        description: "PDFs generated successfully! (7\" x 5.125\") - Links available below.",
      });

    } catch (error) {
      console.error('Error generating PDFs:', error);
      toast({
        title: "PDF Generation Failed",
        description: `Failed to generate PDFs: ${error.message || 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setGeneratingPDFs(false);
    }
  };

  const handleGenerateGotenberg = async () => {
    if (!order?.id) return;

    setGeneratingGotenberg(true);
    try {
      console.log('Generating Gotenberg PDF for order:', order.id);
      const { data, error } = await supabase.functions.invoke('generate-card-gotenberg', {
        body: { orderId: order.id }
      });

      console.log('Gotenberg response:', data, error);

      if (error) throw error;
      if (!data || !data.success) {
        throw new Error(data?.error || 'Unknown error occurred');
      }

      setPdfDownloadUrls(prev => ({ ...prev, gotenberg: data.downloadUrl }));

      toast({
        title: 'Success',
        description: 'Gotenberg PDF generated! Link available below.',
      });
    } catch (error) {
      console.error('Error generating Gotenberg PDF:', error);
      toast({
        title: 'Gotenberg Generation Failed',
        description: `Failed to generate PDF: ${error.message || 'Unknown error'}`,
        variant: 'destructive'
      });
    } finally {
      setGeneratingGotenberg(false);
    }
  };

  const handleViewInsidePDF = async () => {
    if (!order?.id) return;
    setGeneratingPDFs(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-card-gotenberg', {
        body: { orderId: order.id, only: 'inside', mode: 'url', origin: window.location.origin }
      });
      if (error) throw error;
      const pdfPath = data?.pdfPath;
      if (!pdfPath) throw new Error('No PDF path returned');
      
      // Use our PDF serving function instead of direct URL
      const servePdfUrl = `https://wsibvneidsmtsazfbmgc.supabase.co/functions/v1/serve-pdf?path=${encodeURIComponent(pdfPath)}`;
      window.open(servePdfUrl, '_blank');
      toast({ title: 'Inside PDF Ready', description: 'Opened inside-style PDF in a new tab.' });
    } catch (error: any) {
      console.error('Error generating inside PDF:', error);
      toast({
        title: 'PDF Generation Failed',
        description: error?.message || 'Could not generate inside PDF.',
        variant: 'destructive'
      });
    } finally {
      setGeneratingPDFs(false);
    }
  };

  const handleViewFrontPDF = async () => {
    if (!order?.id) return;
    setGeneratingFront(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-card-gotenberg', {
        body: { orderId: order.id, only: 'front', mode: 'html', origin: window.location.origin }
      });
      if (error) throw error;
      const pdfPath = data?.pdfPath;
      if (!pdfPath) throw new Error('No PDF path returned');
      
      // Use our PDF serving function instead of direct URL
      const servePdfUrl = `https://wsibvneidsmtsazfbmgc.supabase.co/functions/v1/serve-pdf?path=${encodeURIComponent(pdfPath)}`;
      window.open(servePdfUrl, '_blank');
      toast({ title: 'Front PDF Ready', description: 'Opened front-style PDF in a new tab.' });
    } catch (error: any) {
      console.error('Error generating front PDF:', error);
      toast({
        title: 'PDF Generation Failed',
        description: error?.message || 'Could not generate front PDF.',
        variant: 'destructive'
      });
    } finally {
      setGeneratingFront(false);
    }
  };

  const handleGenerateProductionPDF = async () => {
    if (!order?.id) return;
    setGeneratingProduction(true);
    try {
      console.log('Generating Production PDF for order:', order.id);
      const { data, error } = await supabase.functions.invoke('generate-card-gotenberg', {
        body: { orderId: order.id, format: 'production' }
      });

      console.log('Production PDF response:', data, error);

      if (error) throw error;
      if (!data || !data.success) {
        throw new Error(data?.error || 'Unknown error occurred');
      }

      setPdfDownloadUrls(prev => ({ ...prev, production: data.downloadUrl }));

      toast({
        title: 'Production PDF Ready',
        description: '7" x 10.25" production format generated! Link available below.',
      });
    } catch (error: any) {
      console.error('Error generating Production PDF:', error);
      toast({
        title: 'Production PDF Generation Failed',
        description: error?.message || 'Could not generate production PDF.',
        variant: 'destructive'
      });
    } finally {
      setGeneratingProduction(false);
    }
  };

  const handleGenerateProductionFrontPDF = async () => {
    if (!order?.id) return;
    setGeneratingProduction(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-card-gotenberg', {
        body: { orderId: order.id, format: 'production', only: 'front', mode: 'html', origin: window.location.origin }
      });
      if (error) throw error;
      const url = data?.downloadUrl;
      if (!url) throw new Error('No PDF URL returned');
      window.open(url, '_blank');
      toast({ title: 'Production Front PDF Ready', description: 'Opened production front PDF in a new tab.' });
    } catch (error: any) {
      console.error('Error generating Production Front PDF:', error);
      toast({
        title: 'PDF Generation Failed',
        description: error?.message || 'Could not generate production front PDF.',
        variant: 'destructive'
      });
    } finally {
      setGeneratingProduction(false);
    }
  };

  const handleGenerateProductionInsidePDF = async () => {
    if (!order?.id) return;
    setGeneratingProduction(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-card-gotenberg', {
        body: { orderId: order.id, format: 'production', only: 'inside', mode: 'html', origin: window.location.origin }
      });
      if (error) throw error;
      const url = data?.downloadUrl;
      if (!url) throw new Error('No PDF URL returned');
      window.open(url, '_blank');
      toast({ title: 'Production Inside PDF Ready', description: 'Opened production inside PDF in a new tab.' });
    } catch (error: any) {
      console.error('Error generating Production Inside PDF:', error);
      toast({
        title: 'PDF Generation Failed',
        description: error?.message || 'Could not generate production inside PDF.',
        variant: 'destructive'
      });
    } finally {
      setGeneratingProduction(false);
    }
  };

  const handleGenerateProductionCombinedPDF = async () => {
    if (!order?.id) return;
    setGeneratingProduction(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-card-gotenberg', {
        body: { orderId: order.id, format: 'production', only: 'front+inside' }
      });
      if (error) throw error;
      const pdfPath = data?.pdfPath;
      const publicUrl = data?.publicUrl as string | undefined;
      if (!pdfPath || !publicUrl) throw new Error('No PDF path or public URL returned');
      
      setOrder(prev => prev ? { ...prev, production_combined_pdf_public_url: publicUrl, production_combined_pdf_generated_at: new Date().toISOString() } : prev);
      
      // Use our PDF serving function instead of direct URL
      const servePdfUrl = `https://wsibvneidsmtsazfbmgc.supabase.co/functions/v1/serve-pdf?path=${encodeURIComponent(pdfPath)}`;
      window.open(servePdfUrl, '_blank');
      toast({ title: 'Production Combined PDF Ready', description: 'Public URL saved and opened in a new tab.' });
    } catch (error: any) {
      console.error('Error generating Production Combined PDF:', error);
      toast({
        title: 'PDF Generation Failed',
        description: error?.message || 'Could not generate production combined PDF.',
        variant: 'destructive'
      });
    } finally {
      setGeneratingProduction(false);
    }
  };

  const handleGeneratePreviews = async () => {
    if (!order?.id) return;
    console.log('Starting preview generation for order:', order.id);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-card-previews', {
        body: { orderId: order.id }
      });
      
      console.log('Preview generation response:', { data, error });
      
      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }
      
      if (!data?.success) {
        console.error('Preview generation failed:', data?.error);
        throw new Error(data?.error || 'Failed to generate previews');
      }
      
      console.log('Updating order with new previews:', {
        frontBase64: data.frontBase64?.length || 0,
        insideBase64: data.insideBase64?.length || 0
      });
      
      setOrder(prev => prev ? { 
        ...prev, 
        front_preview_base64: data.frontBase64, 
        inside_preview_base64: data.insideBase64 
      } : prev);
      
      toast({ 
        title: 'Previews Ready', 
        description: 'Front and inside previews updated to match production.' 
      });
    } catch (err: any) {
      console.error('Preview generation failed:', err);
      toast({ 
        title: 'Preview Generation Failed', 
        description: err?.message || 'Unknown error', 
        variant: 'destructive' 
      });
    }
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Job Not Found</h1>
          <Button onClick={() => navigate('/admin')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/admin')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Admin</span>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Job Details</h1>
              <p className="text-gray-600">Order #{order.readable_order_id || order.id.slice(0, 8)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Status:</span>
              <Select
                value={order.status}
                onValueChange={(value) => updateOrderStatus(order.id, value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Badge 
              variant={
                order.status === 'pending' ? 'secondary' :
                order.status === 'approved' ? 'default' :
                order.status === 'blocked' ? 'destructive' :
                'outline'
              }
              className="text-sm px-3 py-1"
            >
              {order.status.toUpperCase()}
            </Badge>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Order Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="w-5 h-5" />
                  <span>Order Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Order ID</p>
                    <p className="font-medium">{order.readable_order_id || order.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Package</p>
                    <p className="font-medium">{order.tier_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Card Quantity</p>
                    <p className="font-medium">{order.card_quantity} cards</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Client Count</p>
                    <p className="font-medium">{order.client_count} clients</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Mailing Window</p>
                    <p className="font-medium">{formatMailingWindow(order.mailing_window)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Postage Option</p>
                    <p className="font-medium capitalize">{order.postage_option}</p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Created</p>
                    <p className="font-medium">{new Date(order.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Last Updated</p>
                    <p className="font-medium">{new Date(order.updated_at).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="w-5 h-5" />
                  <span>Pricing Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Regular Price</p>
                    <p className="font-medium">${Number(order.regular_price).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Postage Cost</p>
                    <p className="font-medium">${Number(order.postage_cost).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Final Total</p>
                    <p className="text-lg font-bold text-emerald-600">${Number(order.final_price).toFixed(2)}</p>
                  </div>
                </div>
                {order.early_bird_discount && (
                  <div className="bg-emerald-50 p-3 rounded-lg">
                    <p className="text-sm text-emerald-800 font-medium">Early Bird Discount Applied</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Contact Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Customer Name</p>
                    <p className="font-medium">
                      {order.contact_firstname || order.contact_lastname 
                        ? `${order.contact_firstname || ''} ${order.contact_lastname || ''}`.trim()
                        : 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{order.contact_email || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium">{order.contact_phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Billing Address</p>
                    <p className="font-medium">{order.billing_address || 'Not provided'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status Checkmarks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="w-5 h-5" />
                  <span>Order Status Checklist</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {/* Signature Purchase - Grey out if no signature */}
                  <div className="flex flex-col space-y-2">
                    <label className="text-sm font-medium text-gray-700">Signature Purchase</label>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        checked={order.signature_purchased || false}
                        onCheckedChange={(checked) => updateOrderStatusField(order.id, 'signature_purchased', !!checked)}
                        disabled={!order.signature_url}
                        className={!order.signature_url ? 'opacity-50' : ''}
                      />
                      <span className={`text-sm ${!order.signature_url ? 'text-gray-400' : 'text-gray-600'}`}>
                        {order.signature_purchased ? 'Purchased' : 'Not purchased'}
                      </span>
                    </div>
                  </div>

                  {/* Signature Submit - Grey out if signature not purchased */}
                  <div className="flex flex-col space-y-2">
                    <label className="text-sm font-medium text-gray-700">Signature Submit</label>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        checked={order.signature_submitted || false}
                        onCheckedChange={(checked) => updateOrderStatusField(order.id, 'signature_submitted', !!checked)}
                        disabled={!order.signature_purchased}
                        className={!order.signature_purchased ? 'opacity-50' : ''}
                      />
                      <span className={`text-sm ${!order.signature_purchased ? 'text-gray-400' : 'text-gray-600'}`}>
                        {order.signature_submitted ? 'Submitted' : 'Not submitted'}
                      </span>
                    </div>
                  </div>

                  {/* Mailing List Uploaded */}
                  <div className="flex flex-col space-y-2">
                    <label className="text-sm font-medium text-gray-700">Mailing List</label>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        checked={order.mailing_list_uploaded || false}
                        onCheckedChange={(checked) => updateOrderStatusField(order.id, 'mailing_list_uploaded', !!checked)}
                      />
                      <span className="text-sm text-gray-600">
                        {order.mailing_list_uploaded ? 'Uploaded' : 'Not uploaded'}
                      </span>
                    </div>
                  </div>

                  {/* Logo Uploaded */}
                  <div className="flex flex-col space-y-2">
                    <label className="text-sm font-medium text-gray-700">Logo</label>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        checked={order.logo_uploaded || false}
                        onCheckedChange={(checked) => updateOrderStatusField(order.id, 'logo_uploaded', !!checked)}
                      />
                      <span className="text-sm text-gray-600">
                        {order.logo_uploaded ? 'Uploaded' : 'Not uploaded'}
                      </span>
                    </div>
                  </div>

                  {/* Invoice Paid */}
                  <div className="flex flex-col space-y-2">
                    <label className="text-sm font-medium text-gray-700">Invoice Paid</label>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        checked={order.invoice_paid || false}
                        onCheckedChange={(checked) => updateOrderStatusField(order.id, 'invoice_paid', !!checked)}
                      />
                      <span className="text-sm text-gray-600">
                        {order.invoice_paid ? 'Paid' : 'Unpaid'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Client List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5" />
                  <span>Client List</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-medium">{clients.length} clients</p>
                    <p className="text-sm text-gray-600">
                      {clients.length > 0 ? 'Click to view full list' : 'No client records found'}
                    </p>
                  </div>
                  {clients.length > 0 && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          View List
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
                        <DialogHeader>
                          <DialogTitle>Client List ({clients.length} clients)</DialogTitle>
                        </DialogHeader>
                        <div className="max-h-96 overflow-y-auto pr-2">
                          <div className="space-y-3">
                            {clients.map((client) => (
                              <div key={client.id} className="p-4 bg-gray-50 rounded-lg">
                                <div>
                                  <p className="font-medium text-lg">{client.first_name} {client.last_name}</p>
                                  <p className="text-sm text-gray-600 flex items-center mt-2">
                                    <MapPin className="w-4 h-4 mr-1" />
                                    {client.address}, {client.city}, {client.state} {client.zip}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Template Preview & Files */}
          <div className="space-y-6">
            {/* Card Preview */}
            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <ImageIcon className="w-5 h-5" />
                  <span>Card Preview</span>
                </CardTitle>
                <Button variant="outline" size="sm" onClick={handleGeneratePreviews}>
                  Regenerate Previews
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {template ? (
                  <>
                    <div className="text-center">
                      <h3 className="font-semibold text-lg">{template.name}</h3>
                      <p className="text-sm text-gray-600 mb-4">{template.description}</p>
                    </div>
                    
                     {/* Card Preview - Front and Back Side by Side */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Front Side */}
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-3 text-center">Card Front</p>
                        <div className="aspect-[3/4] w-full overflow-hidden rounded-lg border bg-gray-50">
                          {order?.front_preview_base64 ? (
                            <img 
                              src={order.front_preview_base64}
                              alt={`${template.name} - Front`}
                              className="w-full h-full object-cover"
                              onLoad={() => console.log('Front preview image loaded successfully')}
                              onError={(e) => {
                                console.error('Front preview image failed to load');
                                console.log('Image src length:', order?.front_preview_base64?.length || 0);
                                console.log('Image src preview:', order?.front_preview_base64?.substring(0, 50));
                              }}
                            />
                          ) : template?.preview_url ? (
                            <img 
                              src={`/lovable-uploads/${template.preview_url.split('/').pop()}`}
                              alt={`${template.name} - Front`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                console.error('Template preview failed to load:', template.preview_url);
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI2NyIgdmlld0JveD0iMCAwIDIwMCAyNjciIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjY3IiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2QjczODAiPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4K';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                              No preview available
                            </div>
                          )}
                        </div>
                        
                        {/* Debug Info */}
                        {order?.front_preview_base64 && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500">
                              Preview: {order.front_preview_base64.length} chars
                            </p>
                            <button 
                              className="text-xs text-blue-600 hover:underline"
                              onClick={() => {
                                console.log('Full base64 string:', order.front_preview_base64);
                                window.open(order.front_preview_base64, '_blank');
                              }}
                            >
                              Open in new tab
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {/* Back/Inside Side with Message, Logo, and Signature */}
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-3 text-center">Card Inside</p>
                        <div className="aspect-[3/4] w-full overflow-hidden rounded-lg border bg-white">
                          {order?.inside_preview_base64 ? (
                            <img
                              src={order.inside_preview_base64}
                              alt={`${template.name} - Inside`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                              Inside preview will appear here
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-red-500 mb-2">⚠️ Template Not Found</div>
                    <p className="text-sm text-gray-600">Template ID: {order?.template_id}</p>
                    <p className="text-xs text-gray-500 mt-2">This template no longer exists in the database.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Production Combined PDF URL */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Production Combined PDF URL</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {order.production_combined_pdf_public_url ? (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Public URL</p>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={order.production_combined_pdf_public_url}
                        className="flex-1 px-3 py-2 text-sm border rounded"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(order.production_combined_pdf_public_url!);
                          toast({ title: 'Copied', description: 'Public URL copied to clipboard.' });
                        }}
                      >
                        Copy URL
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          if (order.production_combined_pdf_public_url) {
                            // Extract PDF path from the public URL and use our serve-pdf function
                            const urlParts = order.production_combined_pdf_public_url.split('/');
                            const pdfPath = urlParts.slice(-2).join('/'); // Get cards/filename.pdf
                            const servePdfUrl = `https://wsibvneidsmtsazfbmgc.supabase.co/functions/v1/serve-pdf?path=${encodeURIComponent(pdfPath)}`;
                            window.open(servePdfUrl, '_blank');
                          }
                        }}
                      >
                        Open
                      </Button>
                    </div>
                    {order.production_combined_pdf_generated_at && (
                      <p className="text-xs text-gray-500">Generated {new Date(order.production_combined_pdf_generated_at).toLocaleString()}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">No combined production PDF generated yet.</p>
                )}
              </CardContent>
            </Card>

            {/* Advanced PDF Generation Section */}
            <Collapsible open={advancedSectionOpen} onOpenChange={setAdvancedSectionOpen}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-5 h-5" />
                        <span>Advanced PDF Generation</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 transition-transform ${advancedSectionOpen ? 'rotate-180' : ''}`} />
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="space-y-6 px-6 pb-6">
                    {/* Inside PDF */}
                    <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Inside PDF</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Generate and open a printable PDF of the inside page with message, logo, and signature.
                  </p>
                  <Button
                    onClick={handleViewInsidePDF}
                    disabled={generatingPDFs}
                    className="w-full"
                  >
                    {generatingPDFs ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Generating Inside PDF...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4" />
                        <span>View Inside PDF</span>
                      </div>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Front PDF */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Front PDF</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Generate and open a printable PDF of the front cover at 5.125" × 7".
                  </p>
                  <Button
                    onClick={handleViewFrontPDF}
                    disabled={generatingFront}
                    className="w-full"
                  >
                    {generatingFront ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Generating Front PDF...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4" />
                        <span>View Front PDF</span>
                      </div>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Production PDF */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Production Front PDF</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Generate and open a printable PDF of the front cover at 7" × 10.25" production format.
                  </p>
                  <Button
                    onClick={handleGenerateProductionFrontPDF}
                    disabled={generatingProduction}
                    className="w-full"
                  >
                    {generatingProduction ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Generating Front Production PDF...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4" />
                        <span>View Front Production PDF</span>
                      </div>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Production Inside PDF */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Production Inside PDF</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Generate and open a printable PDF of the inside page at 7" × 10.25" production format.
                  </p>
                  <Button
                    onClick={handleGenerateProductionInsidePDF}
                    disabled={generatingProduction}
                    className="w-full"
                  >
                    {generatingProduction ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Generating Inside Production PDF...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4" />
                        <span>View Inside Production PDF</span>
                      </div>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Production Combined PDF */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Production Combined PDF</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Generate and open a combined PDF with Front then Inside at 7" × 10.25" production format.
                  </p>
                  <Button
                    onClick={handleGenerateProductionCombinedPDF}
                    disabled={generatingProduction}
                    className="w-full"
                  >
                    {generatingProduction ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Generating Combined Production PDF...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4" />
                        <span>Generate / Open Combined Production PDF</span>
                      </div>
                    )}
                  </Button>

                  {order.production_combined_pdf_public_url && (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">Public URL</p>
                      <div className="flex items-center gap-2">
                        <input
                          readOnly
                          value={order.production_combined_pdf_public_url}
                          className="flex-1 px-3 py-2 text-sm border rounded"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(order.production_combined_pdf_public_url!);
                            toast({ title: 'Copied', description: 'Public URL copied to clipboard.' });
                          }}
                        >
                          Copy URL
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            if (order.production_combined_pdf_public_url) {
                              // Extract PDF path from the public URL and use our serve-pdf function
                              const urlParts = order.production_combined_pdf_public_url.split('/');
                              const pdfPath = urlParts.slice(-2).join('/'); // Get cards/filename.pdf
                              const servePdfUrl = `https://wsibvneidsmtsazfbmgc.supabase.co/functions/v1/serve-pdf?path=${encodeURIComponent(pdfPath)}`;
                              window.open(servePdfUrl, '_blank');
                            }
                          }}
                        >
                          Open
                        </Button>
                      </div>
                      {order.production_combined_pdf_generated_at && (
                        <p className="text-xs text-gray-500">Generated {new Date(order.production_combined_pdf_generated_at).toLocaleString()}</p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Uploaded Files */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Download className="w-5 h-5" />
                  <span>Uploaded Files</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.logo_url && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => downloadFile(order.logo_url!, 'logo')}
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Download Logo
                  </Button>
                )}
                
                {order.signature_url && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => downloadFile(order.signature_url!, 'signature')}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Download Signature
                  </Button>
                )}

                {!order.signature_url && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setShowSignatureUpload(true)}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Signature
                  </Button>
                )}
                
                {order.csv_file_url && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => downloadFile(order.csv_file_url!, 'clients.csv')}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Download Client List
                  </Button>
                )}

                {!order.csv_file_url && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setShowClientListUpload(true)}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Client List
                  </Button>
                )}

                {!order.logo_url && !order.signature_url && !order.csv_file_url && (
                  <p className="text-gray-500 text-center py-4">No files uploaded</p>
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
          {orderId && (
            <ClientListUploader orderId={orderId} onUploadComplete={() => {
              setShowClientListUpload(false);
              window.location.reload();
            }} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JobDetail;