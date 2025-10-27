import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PhysicalMailingSenderProps {
  orderId: string;
}

export function PhysicalMailingSender({ orderId }: PhysicalMailingSenderProps) {
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [apiResponse, setApiResponse] = useState<string>("");
  const [pcmOrderId, setPcmOrderId] = useState<string>("");
  const [pcmBatchId, setPcmBatchId] = useState<string>("");
  const [jsonPreview, setJsonPreview] = useState<string>("");
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isProduction, setIsProduction] = useState(() => {
    // Load from localStorage or default to sandbox (false)
    return localStorage.getItem('pcm-mode') === 'production';
  });
  const { toast } = useToast();

  // Fetch current PCM info on component mount
  useEffect(() => {
    fetchPCMInfo();
  }, [orderId]);

  // Save PCM mode to localStorage
  useEffect(() => {
    localStorage.setItem('pcm-mode', isProduction ? 'production' : 'sandbox');
  }, [isProduction]);

  const fetchPCMInfo = async () => {
    try {
      const adminSessionId = sessionStorage.getItem('adminSessionId');
      if (!adminSessionId) return;

      const { data: orderData, error } = await supabase.rpc('get_order_by_id', {
        order_id: orderId,
        session_id_param: adminSessionId
      });

      if (!error && orderData && orderData.length > 0) {
        const order = orderData[0] as any; // Cast to any to handle dynamic properties
        setPcmOrderId(order.pcm_order_id || "");
        setPcmBatchId(order.pcm_batch_id ? order.pcm_batch_id.toString() : "");
      }
    } catch (error) {
      console.error('Error fetching PCM info:', error);
    }
  };

  const handleSendPhysical = async () => {
    setIsLoading(true);
    setApiResponse(""); // Clear previous responses
    
    try {
      // Get admin session ID from sessionStorage (same as JobDetail component)
      const adminSessionId = sessionStorage.getItem('adminSessionId');
      if (!adminSessionId) {
        throw new Error('Admin session not found. Please login as admin.');
      }

      // Fetch real client records for this order
      const { data: clientsData, error: clientsError } = await supabase.rpc('get_clients_for_order', {
        order_id_param: orderId,
        session_id_param: adminSessionId
      });

      if (clientsError) throw clientsError;

      if (!clientsData || clientsData.length === 0) {
        throw new Error('No client records found for this order');
      }

      // Format client data for the API
      const recipientAddresses = clientsData.map((client: any) => ({
        name: `${client.first_name} ${client.last_name}`.trim(),
        address1: client.address,
        city: client.city,
        state: client.state,
        zip: client.zip
      }));

      const requestPayload = {
        orderId,
        recipientAddresses,
        isProduction
      };

      const { data, error } = await supabase.functions.invoke('send-physical-greeting-cards', {
        body: requestPayload
      });

      if (error) throw error;

      // Save the response for display  
      setApiResponse(JSON.stringify(data, null, 2));

      // Update order with PCM details and status if successful
      if (data.success && data.pcmOrderId && data.pcmBatchId) {
        console.log('=== UPDATING DATABASE WITH PCM INFO ===');
        console.log('PCM Order ID:', data.pcmOrderId);
        console.log('PCM Batch ID:', data.pcmBatchId);
        
        // Just update the damn thing - no more session BS
        const { error: updateError } = await supabase.rpc('force_update_pcm_info', {
          order_id_param: orderId,
          pcm_order_id_param: data.pcmOrderId.toString(),
          pcm_batch_id_param: data.pcmBatchId
        });

        if (updateError) {
          console.error('Update error:', updateError);
          throw new Error(`Failed to update order: ${updateError.message}`);
        }

        console.log('✅ PCM info updated successfully!');
        
        // Update local state with new PCM info
        setPcmOrderId(data.pcmOrderId.toString());
        setPcmBatchId(data.pcmBatchId.toString());
      } else {
        console.error('Missing required data from PCM API response:', {
          success: data.success,
          pcmOrderId: data.pcmOrderId,
          pcmBatchId: data.pcmBatchId,
          fullResponse: data
        });
        throw new Error('PCM API did not return required order information');
      }

      toast({
        title: "Physical Mailing Initiated",
        description: `Greeting cards sent to PCM DirectMail API for ${recipientAddresses.length} recipients. PCM Order ID: ${data.pcmOrderId || 'N/A'}`,
      });
    } catch (error) {
      console.error('Error sending physical mailing:', error);
      setApiResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        title: "Error",
        description: "Failed to send physical mailing",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!pcmOrderId) return;
    
    setIsCancelling(true);
    try {
      const adminSessionId = sessionStorage.getItem('adminSessionId');
      if (!adminSessionId) {
        throw new Error('Admin session not found. Please login as admin.');
      }

      const { data, error } = await supabase.functions.invoke('cancel-pcm-order', {
        body: {
          orderId,
          pcmOrderId,
          adminSessionId,
          isProduction
        }
      });

      if (error) throw error;

      if (data.success) {
        // Clear local state
        setPcmOrderId("");
        setPcmBatchId("");
        setApiResponse("");
        
        // Refresh PCM info from database
        fetchPCMInfo();
        
        toast({
          title: "Order Cancelled",
          description: "PCM order has been cancelled successfully",
        });
      } else {
        throw new Error(data.error || 'Failed to cancel order');
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast({
        title: "Error",
        description: "Failed to cancel PCM order",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handlePreviewJSON = async () => {
    setIsLoadingPreview(true);
    setJsonPreview("");
    
    try {
      // Get admin session ID from sessionStorage
      const adminSessionId = sessionStorage.getItem('adminSessionId');
      if (!adminSessionId) {
        throw new Error('Admin session not found. Please login as admin.');
      }

      // Fetch real client records for this order
      const { data: clientsData, error: clientsError } = await supabase.rpc('get_clients_for_order', {
        order_id_param: orderId,
        session_id_param: adminSessionId
      });

      if (clientsError) throw clientsError;

      // Allow preview even if there are no clients
      const safeClients = clientsData || [];


      // Fetch order details
      const { data: orderData, error: orderError } = await supabase.rpc('get_order_by_id', {
        order_id: orderId,
        session_id_param: adminSessionId
      });

      if (orderError) {
        throw new Error(`Database error: ${orderError.message}`);
      }

      const orderResult = Array.isArray(orderData) ? orderData[0] : orderData;
      
      if (!orderResult) {
        throw new Error(`Order not found with ID: ${orderId}`);
      }

      // Cast to any to access all fields including return address
      const order = orderResult as any;

      // Format client data for the API
      const recipientAddresses = safeClients.map((client: any) => ({
        name: `${client.first_name} ${client.last_name}`.trim(),
        address1: client.address,
        city: client.city,
        state: client.state,
        zip: client.zip
      }));

      // Format recipients for PCM API (exact format used in edge function)
      const recipients = recipientAddresses.map(addr => {
        const nameParts = addr.name.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || 'Customer';
        
        return {
          firstName: firstName,
          lastName: lastName,
          address: addr.address1,
          address2: '',
          city: addr.city,
          state: addr.state,
          zipCode: addr.zip
        };
      });

      // Determine mail date (exact logic from edge function)
      let mailDate = '';
      if (order.drop_date) {
        mailDate = order.drop_date;
      } else {
        const year = new Date().getFullYear();
        const mailingWindowMap: Record<string, string> = {
          'dec-1-5': `${year}-11-29`,
          'dec-6-10': `${year}-12-04`,
          'dec-11-15': `${year}-12-09`,
          'dec-16-20': `${year}-12-14`
        };
        mailDate = mailingWindowMap[order.mailing_window] || '';
      }

      // Create unique batch identifier (exact logic from edge function)
      const uniqueBatchId = `${order.readable_order_id}-${mailDate}-${Date.now()}`;

      // Prepare return address (exact format from edge function)
      const returnAddress = {
        name: order.return_address_name || 'Default Sender',
        address: order.return_address_line1 || '',
        address2: order.return_address_line2 || '',
        city: order.return_address_city || '',
        state: order.return_address_state || '',
        zipCode: order.return_address_zip || ''
      };

      // Map postage option to PCM MailClass (exact logic from edge function)
      const normalizedPostage = String(order.postage_option || '').toLowerCase().replace(/[\s_-]/g, '');
      const mailClass = normalizedPostage.startsWith('first') ? 'FirstClass' : 'Standard';
      console.log('PCM MailClass (preview):', mailClass, 'raw postage_option:', order.postage_option);

      // Generate the exact JSON payload that will be sent to PCM (matching edge function endpoint 0)
      const pcmPayload = {
        recipients: recipients,
        recordCount: recipientAddresses.length,
        mailClass: mailClass,
        mailDate: mailDate,
        greetingCard: order.production_combined_pdf_public_url || '',
        returnAddress: returnAddress,
        batchName: uniqueBatchId,
        addOns: [
          {
            "addon": "Livestamping"
          }
        ]
      };

      // Format as readable JSON
      const jsonString = JSON.stringify(pcmPayload, null, 2);
      setJsonPreview(jsonString);
      
      toast({
        title: "Preview Generated",
        description: `Generated PCM JSON preview for ${recipients.length} recipients`,
      });
    } catch (error) {
      console.error('Error generating preview:', error);
      setJsonPreview(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        title: "Error",
        description: "Failed to generate JSON preview",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Physical Mailing</CardTitle>
        <CardDescription>
          Send physical greeting cards via PCM DirectMail API
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Environment Toggle */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">
              PCM Environment: {isProduction ? 'Production' : 'Sandbox'}
            </Label>
            <p className="text-xs text-muted-foreground">
              {isProduction 
                ? 'Real orders will be processed and charged' 
                : 'Test mode - no actual cards will be sent'
              }
            </p>
          </div>
          <Switch
            checked={isProduction}
            onCheckedChange={setIsProduction}
            disabled={isLoading || isCancelling}
          />
        </div>
        {/* Only show send button if no PCM order ID exists */}
        {!pcmOrderId && (
          <div className="space-y-2">
            <Button 
              onClick={handleSendPhysical}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? "Sending..." : "Send Physical Greeting Cards"}
            </Button>
            <Button 
              onClick={handlePreviewJSON}
              disabled={isLoadingPreview}
              variant="outline"
              className="w-full"
            >
              {isLoadingPreview ? "Generating Preview..." : "Preview PCM JSON"}
            </Button>
          </div>
        )}
        
        {/* PCM Order Information */}
        {(pcmOrderId || pcmBatchId) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 relative">
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-medium text-blue-900">PCM DirectMail Information</h4>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isCancelling}
                    className="text-red-600 hover:text-red-800 hover:bg-red-50 h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel PCM Order</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to cancel this PCM order? This action cannot be undone and will clear the PCM Order ID ({pcmOrderId}) and Batch ID from the system.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCancelOrder}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isCancelling ? "Cancelling..." : "Yes, Cancel Order"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">PCM Order ID</Label>
                <p className="font-mono text-sm">{pcmOrderId || 'Not set'}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">PCM Batch ID</Label>
                <p className="font-mono text-sm">{pcmBatchId || 'N/A'}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* JSON Preview Display */}
        {jsonPreview && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">PCM JSON Preview</Label>
            <Textarea
              value={jsonPreview}
              readOnly
              className="font-mono text-xs min-h-[300px]"
              placeholder="JSON preview will appear here..."
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(jsonPreview);
                toast({
                  title: "Copied",
                  description: "PCM JSON copied to clipboard",
                });
              }}
            >
              Copy JSON to Clipboard
            </Button>
          </div>
        )}
        
        {/* Hide debug API response */}
      </CardContent>
    </Card>
  );
}