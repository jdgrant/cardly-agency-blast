import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  MapPin
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  const [loading, setLoading] = useState(true);

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
      const { data, error } = await supabase.storage
        .from('holiday-cards')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Unable to download file",
        variant: "destructive"
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
                  <span>Client List ({clients.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto">
                  <div className="space-y-2">
                    {clients.map((client) => (
                      <div key={client.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{client.first_name} {client.last_name}</p>
                          <p className="text-sm text-gray-600 flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {client.address}, {client.city}, {client.state} {client.zip}
                          </p>
                        </div>
                      </div>
                    ))}
                    {clients.length === 0 && (
                      <p className="text-gray-500 text-center py-4">No client records found</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Template Preview & Files */}
          <div className="space-y-6">
            {/* Template Preview */}
            {template && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <ImageIcon className="w-5 h-5" />
                    <span>Template Preview</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <h3 className="font-semibold text-lg">{template.name}</h3>
                    <p className="text-sm text-gray-600 mb-4">{template.description}</p>
                  </div>
                  
                  {/* Front Side Preview */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Front Side</p>
                    <div className="aspect-[3/4] w-full overflow-hidden rounded-lg border bg-gray-50">
                      <img 
                        src={template.preview_url} 
                        alt={`${template.name} - Front`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  
                  {/* Back Side Preview - Placeholder for now */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Back Side</p>
                    <div className="aspect-[3/4] w-full overflow-hidden rounded-lg border bg-gray-100 flex items-center justify-center">
                      <div className="text-center text-gray-500">
                        <FileText className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">Back side preview</p>
                        <p className="text-xs">Custom message will appear here</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

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
    </div>
  );
};

export default JobDetail;