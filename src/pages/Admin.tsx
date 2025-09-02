import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Package2,
  Settings,
  Tags,
  X,
  FileText,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { PromoCodeForm } from '@/components/admin/PromoCodeForm';

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
  contact_firstname?: string;
  contact_lastname?: string;
  contact_email?: string;
  contact_phone?: string;
  billing_address?: string;
  signature_purchased?: boolean;
  invoice_paid?: boolean;
  signature_needs_review?: boolean;
}

interface Template {
  id: string;
  name: string;
  occasions: string[];
  preview_url: string;
  description?: string;
}

interface PromoCode {
  id: string;
  code: string;
  discount_percentage: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  max_uses?: number;
  current_uses: number;
}

const Admin = () => {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [promocodes, setPromocodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'templates' | 'promocodes'>('orders');
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [originalNames, setOriginalNames] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [downloadUrls, setDownloadUrls] = useState<Record<string, string>>({});
  const [uploadingImages, setUploadingImages] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();

  // Persist admin access for the current browser session
  useEffect(() => {
    const authed = sessionStorage.getItem('adminAuth') === 'true';
    if (authed) {
      setIsAuthenticated(true);
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    // Clear admin session from database if we have a session ID
    const sessionId = sessionStorage.getItem('adminSessionId');
    if (sessionId) {
      try {
        await supabase.rpc('clear_admin_session', { session_id: sessionId });
      } catch (error) {
        console.error('Error clearing admin session:', error);
      }
    }
    
    sessionStorage.removeItem('adminAuth');
    sessionStorage.removeItem('adminSessionId');
    setIsAuthenticated(false);
    setPassword('');
    setOrders([]);
    setTemplates([]);
    toast({ title: 'Logged out', description: 'Admin session cleared securely.' });
  };

  const handleLogin = async () => {
    if (password === 'admin123') {
      const sessionId = 'admin_' + Date.now();
      
      // Set admin session in database
      await supabase.rpc('set_admin_session', { 
        session_id: sessionId 
      });
      
      sessionStorage.setItem('adminAuth', 'true');
      sessionStorage.setItem('adminSessionId', sessionId);
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
      const sessionId = sessionStorage.getItem('adminSessionId');
      if (!sessionId) {
        throw new Error('No admin session found');
      }

      // Fetch orders using admin-specific function
      const { data: ordersData, error: ordersError } = await supabase
        .rpc('get_admin_orders', { session_id_param: sessionId });

      if (ordersError) throw ordersError;

      // Fetch templates (already publicly accessible)
      const { data: templatesData, error: templatesError } = await supabase
        .from('templates')
        .select('*');

      if (templatesError) throw templatesError;

      // Fetch promocodes using admin function
      const { data: promocodesData, error: promocodesError } = await supabase
        .from('promocodes')
        .select('*')
        .order('created_at', { ascending: false });

      if (promocodesError) throw promocodesError;

      setOrders(ordersData || []);
      setTemplates(templatesData || []);
      setPromocodes(promocodesData || []);
    } catch (error) {
      console.error('Fetch data error:', error);
      toast({
        title: "Error", 
        description: "Failed to fetch orders. Please re-login to admin panel.",
        variant: "destructive"
      });
      // Force logout on auth errors
      handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const getCustomerName = (order: Order) => {
    if (order.contact_firstname && order.contact_lastname) {
      return `${order.contact_firstname} ${order.contact_lastname}`;
    }
    return order.contact_firstname || order.contact_lastname || 'No customer name provided';
  };

  const handleViewOrder = (order: Order) => {
    navigate(`/admin/job/${order.id}`);
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
      const sessionId = sessionStorage.getItem('adminSessionId');
      if (!sessionId) {
        throw new Error('No admin session found');
      }

      // Use admin function to update status
      const { error } = await supabase
        .rpc('update_admin_order_status', { 
          session_id_param: sessionId,
          order_id_param: orderId,
          new_status_param: newStatus
        });

      if (error) throw error;

      setOrders(orders.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus, updated_at: new Date().toISOString() }
          : order
      ));

      // Send automatic status email after successful update
      try {
        const { error: emailError } = await supabase.functions.invoke('send-status-email-cron', {
          body: { ordersToEmail: [orderId] }
        });
        
        if (emailError) {
          console.error('Error sending status email:', emailError);
        } else {
          console.log('Status email sent successfully for order:', orderId);
        }
      } catch (emailError) {
        console.error('Failed to send status email:', emailError);
      }

      toast({
        title: "Status Updated",
        description: `Order status changed to ${newStatus}`,
      });
    } catch (error) {
      console.error('Update order status error:', error);
      toast({
        title: "Error",
        description: "Failed to update order status. Please re-login to admin.",
        variant: "destructive"
      });
    }
  };

  const updateOrderStatusField = async (orderId: string, fieldName: string, fieldValue: boolean) => {
    try {
      const sessionId = sessionStorage.getItem('adminSessionId');
      if (!sessionId) {
        throw new Error('No admin session found');
      }

      const { error } = await supabase
        .rpc('update_admin_order_status_fields', {
          session_id_param: sessionId,
          order_id_param: orderId,
          field_name: fieldName,
          field_value: fieldValue
        });

      if (error) throw error;

      // Update local state
      setOrders(orders.map(order => 
        order.id === orderId 
          ? { ...order, [fieldName]: fieldValue, updated_at: new Date().toISOString() }
          : order
      ));

      toast({
        title: "Status Updated",
        description: `${fieldName.replace('_', ' ')} updated successfully`,
      });
    } catch (error) {
      console.error('Update status field error:', error);
      toast({
        title: "Error",
        description: "Failed to update status field. Please re-login to admin.",
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

  const generateTemplatePDF = async (templateId: string) => {
    try {
      toast({
        title: "Generating PDF",
        description: "Creating template PDF...",
      });

      const { data, error } = await supabase.functions
        .invoke('generate-template-pdf', {
          body: { templateId }
        });

      if (error) throw error;

      if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
        toast({
          title: "PDF Generated",
          description: "Template PDF opened in new tab",
        });
      }
    } catch (error) {
      toast({
        title: "PDF Generation Failed",
        description: "Unable to generate template PDF",
        variant: "destructive"
      });
    }
  };

  const generateOrderPDF = async (orderId: string) => {
    setGenerating(prev => ({ ...prev, [orderId]: true }));
    try {
      toast({ title: "Building PDF", description: `Generating preview card for ${orderId.slice(0,8)}…` });

      const { data, error } = await supabase.functions.invoke('generate-card-gotenberg', {
        body: { orderId, format: 'preview' }
      });

      if (error) throw error;

      if (data?.downloadUrl) {
        setDownloadUrls(prev => ({ ...prev, [orderId]: data.downloadUrl }));
        toast({ title: "Preview PDF Ready", description: "Click Download to open the file." });
      } else {
        throw new Error('No downloadUrl returned');
      }
    } catch (err) {
      console.error('generateOrderPDF error', err);
      // Fallback to SVG generator if PDF service fails
      try {
        const { data: svgData, error: svgError } = await supabase.functions.invoke('generate-card-pdfs', {
          body: { orderId }
        });
        if (svgError) throw svgError;
        if (svgData?.frontDownloadUrl && svgData?.backDownloadUrl) {
          window.open(svgData.frontDownloadUrl, '_blank');
          window.open(svgData.backDownloadUrl, '_blank');
          toast({ title: "Preview SVGs ready", description: "Opened front and inside previews in new tabs." });
          return;
        }
        throw new Error('SVG fallback did not return URLs');
      } catch (fallbackErr) {
        console.error('fallback SVG generation failed', fallbackErr);
        toast({ title: "Generation failed", description: "Could not generate the PDF.", variant: 'destructive' });
      }
    } finally {
      setGenerating(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const generateProductionPDF = async (orderId: string) => {
    const key = `${orderId}-prod`;
    setGenerating(prev => ({ ...prev, [key]: true }));
    try {
      toast({ title: "Building Production PDF", description: `Generating 7"x10.25" production card for ${orderId.slice(0,8)}…` });

      const { data, error } = await supabase.functions.invoke('generate-card-gotenberg', {
        body: { orderId, format: 'production' }
      });

      if (error) throw error;

      if (data?.downloadUrl) {
        setDownloadUrls(prev => ({ ...prev, [key]: data.downloadUrl }));
        toast({ title: "Production PDF Ready", description: "7\"x10.25\" format ready for printing. Click Download to open." });
      } else {
        throw new Error('No downloadUrl returned');
      }
    } catch (err) {
      console.error('generateProductionPDF error', err);
      toast({ title: "Production PDF failed", description: "Could not generate the production PDF.", variant: 'destructive' });
    } finally {
      setGenerating(prev => ({ ...prev, [key]: false }));
    }
  };
  const generateOrderFrontPDF = async (orderId: string) => {
    setGenerating(prev => ({ ...prev, [orderId + '-front']: true }));
    try {
      toast({ title: 'Building Front PDF', description: `Generating front cover for ${orderId.slice(0,8)}…` });
      const { data, error } = await supabase.functions.invoke('generate-card-gotenberg', {
        body: { orderId, only: 'front', mode: 'html', origin: window.location.origin }
      });
      if (error) throw error;
      const url = data?.downloadUrl;
      if (!url) throw new Error('No downloadUrl returned');
      window.open(url, '_blank');
      toast({ title: 'Front PDF Ready', description: 'Opened front PDF in a new tab.' });
    } catch (err) {
      console.error('generateOrderFrontPDF error', err);
      toast({ title: 'Front PDF failed', description: 'Could not generate the front PDF.', variant: 'destructive' });
    } finally {
      setGenerating(prev => ({ ...prev, [orderId + '-front']: false }));
    }
  };

  const generateOrderInsidePDF = async (orderId: string) => {
    setGenerating(prev => ({ ...prev, [orderId + '-inside']: true }));
    try {
      toast({ title: 'Building Inside PDF', description: `Generating inside page for ${orderId.slice(0,8)}…` });
      const { data, error } = await supabase.functions.invoke('generate-card-gotenberg', {
        body: { orderId, only: 'inside', mode: 'html', origin: window.location.origin }
      });
      if (error) throw error;
      const url = data?.downloadUrl;
      if (!url) throw new Error('No downloadUrl returned');
      window.open(url, '_blank');
      toast({ title: 'Inside PDF Ready', description: 'Opened inside PDF in a new tab.' });
    } catch (err) {
      console.error('generateOrderInsidePDF error', err);
      toast({ title: 'Inside PDF failed', description: 'Could not generate the inside PDF.', variant: 'destructive' });
    } finally {
      setGenerating(prev => ({ ...prev, [orderId + '-inside']: false }));
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

  // Handle template name input focus - store original value
  const handleTemplateNameFocus = (templateId: string, currentName: string) => {
    setOriginalNames(prev => ({
      ...prev,
      [templateId]: currentName
    }));
  };

  // Handle template name input change - update local state only
  const handleTemplateNameChange = (templateId: string, newName: string) => {
    // Update local template state immediately for responsive UI
    setTemplates(prev => prev.map(t => 
      t.id === templateId 
        ? { ...t, name: newName }
        : t
    ));
  };

  // Handle template name input blur - save to database if changed
  const handleTemplateNameBlur = async (templateId: string, currentName: string) => {
    const originalName = originalNames[templateId];
    
    // Only save if the name actually changed
    if (originalName && originalName !== currentName) {
      await updateTemplateName(templateId, currentName);
    }
    
    // Clean up original name tracking
    setOriginalNames(prev => {
      const updated = { ...prev };
      delete updated[templateId];
      return updated;
    });
  };

  // Handle Enter key - blur the input to trigger save
  const handleTemplateNameKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
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
      const originalName = originalNames[templateId];
      if (originalName) {
        setTemplates(prev => prev.map(t => 
          t.id === templateId 
            ? { ...t, name: originalName }
            : t
        ));
      }
    }
  };

  // Handle template image upload
  const handleTemplateImageUpload = async (templateId: string, file: File) => {
    setUploadingImages(prev => ({ ...prev, [templateId]: true }));
    
    try {
      console.log('Starting image upload for template:', templateId);
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file');
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image must be less than 5MB');
      }

      const fileName = `template-${templateId}-${Date.now()}.${file.name.split('.').pop()}`;
      const filePath = `templates/${fileName}`;
      console.log('Uploading to path:', filePath);

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('holiday-cards')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }
      console.log('File uploaded successfully');

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('holiday-cards')
        .getPublicUrl(filePath);
      
      console.log('Generated public URL:', publicUrl);

      // Update template in database with admin session
      const sessionId = sessionStorage.getItem('adminSessionId');
      if (!sessionId) {
        throw new Error('No admin session found');
      }

      console.log('Updating template in database...');
      const { error: updateError } = await supabase
        .from('templates')
        .update({ preview_url: publicUrl })
        .eq('id', templateId);

      if (updateError) {
        console.error('Database update error:', updateError);
        throw updateError;
      }
      console.log('Database updated successfully');

      // Force refresh templates from database to ensure consistency
      console.log('Refreshing templates from database...');
      const { data: refreshedTemplates, error: fetchError } = await supabase
        .from('templates')
        .select('*');

      if (fetchError) {
        console.error('Error fetching refreshed templates:', fetchError);
      } else {
        console.log('Templates refreshed successfully');
        setTemplates(refreshedTemplates || []);
      }

      toast({
        title: "Image Updated",
        description: "Template image updated successfully",
      });
    } catch (error: any) {
      console.error('Upload process error:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload image",
        variant: "destructive"
      });
    } finally {
      setUploadingImages(prev => ({ ...prev, [templateId]: false }));
    }
  };

  // Trigger file input for template image
  const triggerImageUpload = (templateId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleTemplateImageUpload(templateId, file);
      }
    };
    input.click();
  };

  const createPromoCode = async (formData: { code: string; discount_percentage: number; expires_at?: string; max_uses?: number }) => {
    try {
      const { error } = await supabase
        .from('promocodes')
        .insert([{
          code: formData.code.toUpperCase(),
          discount_percentage: formData.discount_percentage,
          expires_at: formData.expires_at || null,
          max_uses: formData.max_uses || null,
        }]);

      if (error) throw error;

      await fetchData(); // Refresh data
      toast({
        title: "Promo Code Created",
        description: `Code ${formData.code.toUpperCase()} created successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create promo code",
        variant: "destructive"
      });
    }
  };

  const togglePromoCodeActive = async (promoCodeId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('promocodes')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', promoCodeId);

      if (error) throw error;

      setPromocodes(prev => prev.map(pc => 
        pc.id === promoCodeId 
          ? { ...pc, is_active: isActive }
          : pc
      ));

      toast({
        title: "Promo Code Updated",
        description: `Promo code ${isActive ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update promo code status",
        variant: "destructive"
      });
    }
  };

  const deletePromoCode = async (promoCodeId: string, code: string) => {
    try {
      const { error } = await supabase
        .from('promocodes')
        .delete()
        .eq('id', promoCodeId);

      if (error) throw error;

      setPromocodes(prev => prev.filter(pc => pc.id !== promoCodeId));

      toast({
        title: "Promo Code Deleted",
        description: `Code ${code} deleted successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete promo code",
        variant: "destructive"
      });
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
                <Package2 className="w-4 h-4" />
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
              <Button 
                variant={activeTab === 'promocodes' ? 'default' : 'outline'}
                onClick={() => setActiveTab('promocodes')}
                className="flex items-center space-x-2"
              >
                <Tags className="w-4 h-4" />
                <span>Promo Codes</span>
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
            <Button 
              variant="outline"
              onClick={handleLogout}
              className="flex items-center space-x-2"
            >
              <X className="w-4 h-4" />
              <span>Logout</span>
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
                <Package2 className="w-8 h-8 text-blue-600" />
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
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Cards</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sig Purchase</TableHead>
                    <TableHead>Sig Submit</TableHead>
                    <TableHead>Sig Review</TableHead>
                    <TableHead>Mailing List</TableHead>
                    <TableHead>Logo</TableHead>
                    <TableHead>Invoice Paid</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                   {orders.map((order) => (
                     <TableRow key={order.id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleViewOrder(order)}>
                      <TableCell className="font-mono text-xs">
                        {order.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>{getCustomerName(order)}</TableCell>
                      <TableCell>{order.card_quantity}</TableCell>
                      <TableCell className="font-semibold">
                        ${Number(order.final_price).toFixed(2)}
                      </TableCell>
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
                      {/* Signature Purchase - Grey out if no signature */}
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox 
                          checked={order.signature_purchased || false}
                          onCheckedChange={(checked) => updateOrderStatusField(order.id, 'signature_purchased', !!checked)}
                          disabled={!order.signature_url}
                          className={!order.signature_url ? 'opacity-50' : ''}
                        />
                      </TableCell>
                       {/* Signature Submit - Grey out if signature not purchased */}
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox 
                            checked={!!order.signature_url}
                            disabled={true}
                          />
                        </TableCell>
                       {/* Signature Review - Only enabled if signature uploaded */}
                       <TableCell onClick={(e) => e.stopPropagation()}>
                         <Checkbox 
                           checked={order.signature_needs_review || false}
                           onCheckedChange={(checked) => updateOrderStatusField(order.id, 'signature_needs_review', !!checked)}
                           disabled={!order.signature_url}
                           className={!order.signature_url ? 'opacity-50' : ''}
                         />
                       </TableCell>
                       {/* Mailing List Uploaded */}
                       <TableCell onClick={(e) => e.stopPropagation()}>
                         <Checkbox
                           checked={!!order.csv_file_url}
                           disabled={true}
                         />
                       </TableCell>
                      {/* Logo Uploaded */}
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={!!order.logo_url}
                          disabled={true}
                        />
                      </TableCell>
                      {/* Invoice Paid */}
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox 
                          checked={order.invoice_paid || false}
                          onCheckedChange={(checked) => updateOrderStatusField(order.id, 'invoice_paid', !!checked)}
                        />
                      </TableCell>
                       <TableCell className="text-xs">
                         {new Date(order.created_at).toLocaleDateString()}
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
                             <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                               <Button
                                 size="sm"
                                 variant="secondary"
                                 onClick={() => setPreviewTemplate(template)}
                               >
                                 <Eye className="w-3 h-3" />
                               </Button>
                               <Button
                                 size="sm"
                                 variant="secondary"
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   triggerImageUpload(template.id);
                                 }}
                                 disabled={uploadingImages[template.id]}
                               >
                                 {uploadingImages[template.id] ? (
                                   <RefreshCw className="w-3 h-3 animate-spin" />
                                 ) : (
                                   <Upload className="w-3 h-3" />
                                 )}
                               </Button>
                             </div>
                           </div>
                          <div className="space-y-2">
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-gray-600">Name:</label>
                               <Input
                                 value={template.name}
                                 onChange={(e) => handleTemplateNameChange(template.id, e.target.value)}
                                 onFocus={() => handleTemplateNameFocus(template.id, template.name)}
                                 onBlur={(e) => handleTemplateNameBlur(template.id, e.target.value)}
                                 onKeyDown={handleTemplateNameKeyPress}
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

         {activeTab === 'promocodes' && (
           <div className="space-y-6">
             {/* Promo Code Creation Form */}
             <Card>
               <CardHeader>
                 <CardTitle className="flex items-center space-x-2">
                   <Tags className="w-5 h-5" />
                   <span>Create Promo Code</span>
                 </CardTitle>
               </CardHeader>
               <CardContent>
                 <PromoCodeForm onSubmit={createPromoCode} />
               </CardContent>
             </Card>

             {/* Promo Codes Table */}
             <Card>
               <CardHeader>
                 <CardTitle>Promo Codes</CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="overflow-x-auto">
                   <Table>
                     <TableHeader>
                       <TableRow>
                         <TableHead>Code</TableHead>
                         <TableHead>Discount</TableHead>
                         <TableHead>Status</TableHead>
                         <TableHead>Uses</TableHead>
                         <TableHead>Expires</TableHead>
                         <TableHead>Created</TableHead>
                         <TableHead>Actions</TableHead>
                       </TableRow>
                     </TableHeader>
                     <TableBody>
                       {promocodes.map((promo) => (
                         <TableRow key={promo.id}>
                           <TableCell className="font-mono font-semibold">
                             {promo.code}
                           </TableCell>
                           <TableCell>
                             {promo.discount_percentage}%
                           </TableCell>
                           <TableCell>
                             <Badge 
                               variant={promo.is_active ? 'default' : 'secondary'}
                             >
                               {promo.is_active ? 'Active' : 'Inactive'}
                             </Badge>
                           </TableCell>
                           <TableCell>
                             {promo.current_uses}
                             {promo.max_uses ? ` / ${promo.max_uses}` : ' / ∞'}
                           </TableCell>
                           <TableCell className="text-xs">
                             {promo.expires_at 
                               ? new Date(promo.expires_at).toLocaleDateString()
                               : 'Never'
                             }
                           </TableCell>
                           <TableCell className="text-xs">
                             {new Date(promo.created_at).toLocaleDateString()}
                           </TableCell>
                           <TableCell>
                             <div className="flex space-x-2">
                               <Button
                                 size="sm"
                                 variant={promo.is_active ? "outline" : "default"}
                                 onClick={() => togglePromoCodeActive(promo.id, !promo.is_active)}
                               >
                                 {promo.is_active ? 'Deactivate' : 'Activate'}
                               </Button>
                               <Button
                                 size="sm"
                                 variant="destructive"
                                 onClick={() => deletePromoCode(promo.id, promo.code)}
                               >
                                 Delete
                               </Button>
                             </div>
                           </TableCell>
                         </TableRow>
                       ))}
                     </TableBody>
                   </Table>
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
                  <div className="pt-4 space-y-2">
                    <Button 
                      onClick={() => generateTemplatePDF(previewTemplate.id)}
                      className="w-full flex items-center space-x-2"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Generate Card PDF</span>
                    </Button>
                    <Button 
                      variant="outline"
                      className="w-full flex items-center space-x-2"
                      onClick={() => window.open(`/#/html2pdf?templateId=${previewTemplate.id}`, '_blank')}
                    >
                      <Eye className="w-4 h-4" />
                      <span>View PDF Preview Page</span>
                    </Button>
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