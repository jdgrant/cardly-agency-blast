import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  Upload
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
  const [pdfDownloadUrls, setPdfDownloadUrls] = useState<{front?: string, back?: string}>({});

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      // Fetch order details
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);

      // Fetch template details
      if (orderData.template_id) {
        const { data: templateData, error: templateError } = await supabase
          .from('templates')
          .select('*')
          .eq('id', orderData.template_id)
          .single();

        if (templateError) {
          console.error('Template fetch error:', templateError);
        } else {
          setTemplate(templateData);
        }
      }

      // Fetch client records for this order
      const { data: clientsData, error: clientsError } = await supabase
        .from('client_records')
        .select('*')
        .eq('order_id', orderId);

      if (clientsError) {
        console.error('Clients fetch error:', clientsError);
      } else {
        setClients(clientsData || []);
      }

      // Download logo and signature files for preview
      if (orderData.logo_url) {
        try {
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

    } catch (error) {
      console.error('Error fetching order details:', error);
      toast({
        title: "Error",
        description: "Failed to fetch order details",
        variant: "destructive"
      });
    } finally {
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
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ImageIcon className="w-5 h-5" />
                  <span>Card Preview</span>
                </CardTitle>
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
                          <img 
                            src={template.preview_url} 
                            alt={`${template.name} - Front`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                      
                      {/* Back/Inside Side with Message, Logo, and Signature */}
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-3 text-center">Card Inside</p>
                        <div className="aspect-[3/4] w-full bg-white rounded-lg border p-4 relative flex flex-col">
                          {/* Message in top 1/3 */}
                          <div className="h-1/3 flex items-center justify-center mb-4">
                            <div className="text-center">
                              {getCurrentMessage() ? (
                                <p className="font-playfair text-gray-800 text-sm leading-relaxed">
                                  {formatMessageWithLineBreak(getCurrentMessage())}
                                </p>
                              ) : (
                                <p className="text-gray-400 text-xs">
                                  Warmest wishes for a joyful<br />and restful holiday season.
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {/* Bottom half with logo and signature */}
                          <div className="flex-1 flex flex-col justify-center space-y-4">
                            {/* Logo */}
                            <div className="flex justify-center">
                              {logoBlob ? (
                                <img 
                                  src={logoBlob} 
                                  alt="Company logo"
                                  className="w-32 h-20 object-contain"
                                />
                              ) : (
                                <div className="w-32 h-20 bg-gray-50 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                                  <div className="text-center">
                                    <ImageIcon className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                                    <span className="text-gray-500 text-xs">No logo</span>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Signature */}
                            <div className="flex justify-center">
                              {signatureBlob ? (
                                <img 
                                  src={signatureBlob} 
                                  alt="Signature"
                                  className="w-24 h-12 object-contain"
                                />
                              ) : (
                                <div className="w-20 h-6 border border-gray-300 rounded flex items-center justify-center">
                                  <span className="text-gray-500 text-xs">No signature</span>
                                </div>
                              )}
                            </div>
                          </div>
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

            {/* PDF Generation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Generate PDFs</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Generate printable PDFs for the card front and back with all order details (7" × 5.125").
                  </p>
                  
                  <div className="space-y-2">
                    <Button
                      onClick={handleGeneratePDFs}
                      disabled={generatingPDFs}
                      className="w-full"
                    >
                      {generatingPDFs ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Generating PDFs...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4" />
                          <span>Generate Card PDFs</span>
                        </div>
                      )}
                    </Button>
                    
                    {template && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => window.open(`/#/html2pdf?templateId=${template.id}`, '_blank')}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View PDF Preview Page
                      </Button>
                    )}
                  </div>
                  
                  {/* PDF Download Links */}
                  {(pdfDownloadUrls.front || pdfDownloadUrls.back) && (
                    <div className="space-y-2 pt-3 border-t">
                      <p className="text-sm font-medium text-gray-700">Download Links (Open in New Tab):</p>
                      {pdfDownloadUrls.front && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => window.open(pdfDownloadUrls.front, '_blank')}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Front Card PDF (7" × 5.125")
                        </Button>
                      )}
                      {pdfDownloadUrls.back && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => window.open(pdfDownloadUrls.back, '_blank')}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Back Card PDF (7" × 5.125")
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

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
    </div>
  );
};

export default JobDetail;