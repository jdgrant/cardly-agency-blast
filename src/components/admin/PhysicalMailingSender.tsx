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
  const [isLoading, setIsLoading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [apiResponse, setApiResponse] = useState<string>("");
  const [pcmOrderId, setPcmOrderId] = useState<string>("");
  const [pcmBatchId, setPcmBatchId] = useState<string>("");
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
          adminSessionId
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
          <Button 
            onClick={handleSendPhysical}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? "Sending..." : "Send Physical Greeting Cards"}
          </Button>
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
        
        {/* Hide debug API response */}
      </CardContent>
    </Card>
  );
}