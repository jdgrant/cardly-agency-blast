
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link } from 'react-router-dom';
import { Calendar, Download, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Order {
  id: string;
  template_id: string;
  tier_name: string;
  card_quantity: number;
  regular_price: number;
  final_price: number;
  early_bird_discount: boolean;
  mailing_window: string;
  postage_option: string;
  postage_cost: number;
  logo_url: string | null;
  signature_url: string | null;
  csv_file_url: string | null;
  client_count: number;
  status: string;
  created_at: string;
}

interface Template {
  id: string;
  name: string;
}

const Admin = () => {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Fetch templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('templates')
        .select('id, name');

      if (templatesError) throw templatesError;

      setOrders(ordersData || []);
      setTemplates(templatesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error loading data",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    if (password === 'admin123') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect password');
    }
  };

  const getTemplateName = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    return template?.name || templateId;
  };

  const formatMailingWindow = (window: string) => {
    const windowMap: { [key: string]: string } = {
      'dec-1-5': 'December 1-5',
      'dec-6-10': 'December 6-10',
      'dec-11-15': 'December 11-15',
      'dec-16-20': 'December 16-20',
    };
    return windowMap[window] || window;
  };

  const exportOrders = async (format: 'csv' | 'json') => {
    try {
      if (format === 'json') {
        const dataStr = JSON.stringify(orders, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'holiday-card-orders.json';
        link.click();
        URL.revokeObjectURL(url);
      } else {
        const csvHeader = 'Order ID,Template,Tier,Card Quantity,Regular Price,Final Price,Early Bird,Mailing Window,Postage,Client Count,Status,Created At\n';
        const csvData = orders.map(order => 
          `${order.id},${getTemplateName(order.template_id)},${order.tier_name},${order.card_quantity},$${order.regular_price},$${order.final_price},${order.early_bird_discount},${formatMailingWindow(order.mailing_window)},${order.postage_option},${order.client_count},${order.status},${new Date(order.created_at).toLocaleDateString()}`
        ).join('\n');
        
        const dataBlob = new Blob([csvHeader + csvData], { type: 'text/csv' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'holiday-card-orders.csv';
        link.click();
        URL.revokeObjectURL(url);
      }
      
      toast({
        title: "Export successful",
        description: `Orders exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "There was an error exporting the data.",
        variant: "destructive",
      });
    }
  };

  const downloadFile = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('holiday-cards')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Could not download the file.",
        variant: "destructive",
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Admin Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}
            <Button onClick={handleLogin} className="w-full">
              Login
            </Button>
            <div className="text-center">
              <Link to="/" className="text-sm text-blue-600 hover:underline">
                ← Back to Home
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-blue-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg"></div>
            <span className="text-xl font-semibold text-gray-800">AgencyHolidayCards.com</span>
          </Link>
          <Badge variant="secondary">Admin Dashboard</Badge>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{orders.length}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Cards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {orders.reduce((sum, order) => sum + order.card_quantity, 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                ${orders.reduce((sum, order) => sum + order.final_price, 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Avg Order Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                ${orders.length > 0 ? Math.round(orders.reduce((sum, order) => sum + order.final_price, 0) / orders.length).toLocaleString() : '0'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders Table */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl font-bold">Recent Orders</CardTitle>
              <div className="space-x-2">
                <Button variant="outline" size="sm" onClick={() => exportOrders('csv')}>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportOrders('json')}>
                  <Download className="w-4 h-4 mr-2" />
                  Export JSON
                </Button>
                <Button variant="outline" size="sm" onClick={fetchData}>
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No orders found</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Package</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Mailing Window</TableHead>
                      <TableHead>Files</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-sm">
                          #{order.id.slice(-8)}
                        </TableCell>
                        <TableCell>{getTemplateName(order.template_id)}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{order.tier_name}</div>
                            {order.early_bird_discount && (
                              <Badge variant="secondary" className="text-xs">Early Bird</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{order.card_quantity.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{formatMailingWindow(order.mailing_window)}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            {order.logo_url && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => downloadFile(order.logo_url!, 'logo.png')}
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                Logo
                              </Button>
                            )}
                            {order.signature_url && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => downloadFile(order.signature_url!, 'signature.png')}
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                Sig
                              </Button>
                            )}
                            {order.csv_file_url && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => downloadFile(order.csv_file_url!, 'clients.csv')}
                              >
                                <Download className="w-3 h-3 mr-1" />
                                CSV
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          ${order.final_price.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={order.status === 'submitted' ? 'default' : 'secondary'}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {new Date(order.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
