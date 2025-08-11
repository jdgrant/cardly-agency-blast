import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Download, 
  RefreshCw, 
  Eye, 
  Calendar,
  CreditCard,
  Users,
  Package,
  Settings,
  Tags,
  X
} from 'lucide-react';

interface Order {
  id: string;
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
}

interface Template {
  id: string;
  name: string;
  occasions: string[];
  preview_url: string;
  description?: string;
}

const Admin = () => {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'templates'>('orders');
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [editingNames, setEditingNames] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const handleLogin = () => {
    if (password === 'admin123') {
      setIsAuthenticated(true);
      fetchData();
    } else {
      toast({
        title: "Access Denied",
        description: "Invalid password",
        variant: "destructive"
      });
    }
  };

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
        .select('*');

      if (templatesError) throw templatesError;

      setOrders(ordersData || []);
      setTemplates(templatesData || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getTemplateName = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    return template?.name || templateId;
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

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;

      setOrders(orders.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus, updated_at: new Date().toISOString() }
          : order
      ));

      toast({
        title: "Status Updated",
        description: `Order status changed to ${newStatus}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive"
      });
    }
  };

  const exportOrders = async (format: 'csv' | 'json') => {
    try {
      const dataToExport = orders.map(order => ({
        id: order.id,
        template: getTemplateName(order.template_id),
        cards: order.card_quantity,
        clients: order.client_count,
        price: order.final_price,
        mailing_window: formatMailingWindow(order.mailing_window),
        status: order.status,
        created_at: order.created_at
      }));

      if (format === 'csv') {
        const csv = [
          'ID,Template,Cards,Clients,Price,Mailing Window,Status,Created At',
          ...dataToExport.map(row => 
            `${row.id},${row.template},${row.cards},${row.clients},${row.price},${row.mailing_window},${row.status},${row.created_at}`
          )
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
      } else {
        const json = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `orders-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
      }

      toast({
        title: "Export Complete",
        description: `Orders exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Unable to export orders",
        variant: "destructive"
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

  const availableOccasions = [
    'christmas',
    'hanukkah', 
    'kwanzaa',
    'new-year',
    'general-holiday',
    'thanksgiving'
  ];

  // Update single template tag
  const updateTemplateTag = async (templateId: string, newTag: string) => {
    try {
      const { error } = await supabase
        .from('templates')
        .update({ occasions: [newTag] }) // Single tag only
        .eq('id', templateId);

      if (error) throw error;

      // Update local state
      setTemplates(prev => prev.map(t => 
        t.id === templateId 
          ? { ...t, occasions: [newTag] }
          : t
      ));

      toast({
        title: "Template Updated",
        description: "Template tag updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update template tag",
        variant: "destructive"
      });
    }
  };

  // Debounced template name update
  useEffect(() => {
    const timeouts: Record<string, NodeJS.Timeout> = {};
    
    Object.entries(editingNames).forEach(([templateId, newName]) => {
      // Clear existing timeout for this template
      if (timeouts[templateId]) {
        clearTimeout(timeouts[templateId]);
      }
      
      // Set new timeout to save after 1 second of no typing
      timeouts[templateId] = setTimeout(async () => {
        await updateTemplateName(templateId, newName);
        // Remove from editing state after save
        setEditingNames(prev => {
          const updated = { ...prev };
          delete updated[templateId];
          return updated;
        });
      }, 1000);
    });

    // Cleanup function to clear timeouts
    return () => {
      Object.values(timeouts).forEach(clearTimeout);
    };
  }, [editingNames]);

  // Update template name immediately in local state, debounce database save
  const handleTemplateNameChange = (templateId: string, newName: string) => {
    // Update local template state immediately for responsive UI
    setTemplates(prev => prev.map(t => 
      t.id === templateId 
        ? { ...t, name: newName }
        : t
    ));
    
    // Track editing state for debounced save
    setEditingNames(prev => ({
      ...prev,
      [templateId]: newName
    }));
  };

  // Update template name in database
  const updateTemplateName = async (templateId: string, newName: string) => {
    try {
      const { error } = await supabase
        .from('templates')
        .update({ name: newName })
        .eq('id', templateId);

      if (error) throw error;

      toast({
        title: "Template Updated",
        description: "Template name updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update template name",
        variant: "destructive"
      });
      
      // Revert local state on error
      const original = templates.find(t => t.id === templateId);
      if (original) {
        setTemplates(prev => prev.map(t => 
          t.id === templateId 
            ? { ...t, name: original.name }
            : t
        ));
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Admin Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
            <Button onClick={handleLogin} className="w-full">
              Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const approvedOrders = orders.filter(o => o.status === 'approved').length;
  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.final_price), 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <div className="flex space-x-2">
              <Button 
                variant={activeTab === 'orders' ? 'default' : 'outline'}
                onClick={() => setActiveTab('orders')}
                className="flex items-center space-x-2"
              >
                <Package className="w-4 h-4" />
                <span>Orders</span>
              </Button>
              <Button 
                variant={activeTab === 'templates' ? 'default' : 'outline'}
                onClick={() => setActiveTab('templates')}
                className="flex items-center space-x-2"
              >
                <Settings className="w-4 h-4" />
                <span>Templates</span>
              </Button>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => exportOrders('csv')}
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => exportOrders('json')}
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export JSON</span>
            </Button>
            <Button 
              onClick={fetchData}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Orders</p>
                  <p className="text-2xl font-bold">{orders.length}</p>
                </div>
                <Package className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-orange-600">{pendingOrders}</p>
                </div>
                <Calendar className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-green-600">{approvedOrders}</p>
                </div>
                <Users className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">${totalRevenue.toFixed(2)}</p>
                </div>
                <CreditCard className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {activeTab === 'orders' && (
          /* Orders Table */
          <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Cards</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Mailing Window</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Files</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id} className="cursor-pointer hover:bg-gray-50" onClick={() => window.location.href = `/#/admin/job/${order.id}`}>
                      <TableCell className="font-mono text-xs">
                        {order.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>{getTemplateName(order.template_id)}</TableCell>
                      <TableCell>{order.card_quantity}</TableCell>
                      <TableCell className="font-semibold">
                        ${Number(order.final_price).toFixed(2)}
                      </TableCell>
                      <TableCell>{formatMailingWindow(order.mailing_window)}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            order.status === 'pending' ? 'secondary' :
                            order.status === 'approved' ? 'default' :
                            order.status === 'blocked' ? 'destructive' :
                            'outline'
                          }
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          {order.logo_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadFile(order.logo_url!, 'logo')}
                            >
                              Logo
                            </Button>
                          )}
                          {order.signature_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadFile(order.signature_url!, 'signature')}
                            >
                              Sig
                            </Button>
                          )}
                          {order.csv_file_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadFile(order.csv_file_url!, 'clients.csv')}
                            >
                              CSV
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(order.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={order.status}
                          onValueChange={(value) => updateOrderStatus(order.id, value)}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="blocked">Blocked</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="sent">Sent</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        )}

        {activeTab === 'templates' && (
          <div className="space-y-6">
            {/* Template Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Tags className="w-5 h-5" />
                  <span>Template Management</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {templates.map((template) => (
                    <Card key={template.id} className="border">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="relative group">
                            <img 
                              src={template.preview_url} 
                              alt={template.name}
                              className="w-full h-24 object-cover rounded cursor-pointer"
                              onClick={() => setPreviewTemplate(template)}
                            />
                            <Button
                              size="sm"
                              variant="secondary"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setPreviewTemplate(template)}
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-gray-600">Name:</label>
                               <Input
                                 value={template.name}
                                 onChange={(e) => handleTemplateNameChange(template.id, e.target.value)}
                                 className="h-8 text-xs"
                                 placeholder="Template name..."
                               />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-gray-600">Tag:</label>
                              <Select 
                                value={template.occasions[0] || ''} 
                                onValueChange={(value) => updateTemplateTag(template.id, value)}
                              >
                                <SelectTrigger className="w-full h-8 text-xs">
                                  <SelectValue placeholder="Select tag..." />
                                </SelectTrigger>
                                <SelectContent className="bg-white border shadow-lg z-50">
                                  {availableOccasions.map((occasion) => (
                                    <SelectItem key={occasion} value={occasion} className="text-xs">
                                      {occasion.replace('-', ' ').split(' ').map(word => 
                                        word.charAt(0).toUpperCase() + word.slice(1)
                                      ).join(' ')}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {template.occasions.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {template.occasions.map((occasion) => (
                                  <Badge 
                                    key={occasion} 
                                    variant="secondary" 
                                    className="text-xs"
                                  >
                                    {occasion.replace('-', ' ').split(' ').map(word => 
                                      word.charAt(0).toUpperCase() + word.slice(1)
                                    ).join(' ')}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Preview Modal */}
        <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Template Preview: {previewTemplate?.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewTemplate(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            {previewTemplate && (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="max-w-md">
                    <img 
                      src={previewTemplate.preview_url} 
                      alt={previewTemplate.name}
                      className="w-full h-auto rounded-lg shadow-lg"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">{previewTemplate.name}</h3>
                  {previewTemplate.description && (
                    <p className="text-gray-600">{previewTemplate.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {previewTemplate.occasions.map((occasion) => (
                      <Badge key={occasion} variant="secondary">
                        {occasion.replace('-', ' ').split(' ').map(word => 
                          word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Admin;