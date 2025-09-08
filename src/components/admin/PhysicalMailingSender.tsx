import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";

interface PhysicalMailingSenderProps {
  orderId: string;
}

export function PhysicalMailingSender({ orderId }: PhysicalMailingSenderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState<string>("");
  const [debugInfo, setDebugInfo] = useState<string>("");
  const { toast } = useToast();

  const handleSendPhysical = async () => {
    setIsLoading(true);
    setApiResponse(""); // Clear previous responses
    setDebugInfo(""); // Clear previous debug info
    
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
        recipientAddresses
      };

      const { data, error } = await supabase.functions.invoke('send-physical-greeting-cards', {
        body: requestPayload
      });

      if (error) throw error;

      // Extract PCM API interactions for debug display
      if (data && data.apiInteractions) {
        const pcmDebugInfo = `
=== PCM DirectMail API Authentication ===
URL: ${data.apiInteractions.authentication.request.url}
Request: ${JSON.stringify(data.apiInteractions.authentication.request.body, null, 2)}
Response Status: ${data.apiInteractions.authentication.response.status}
Response: ${JSON.stringify(data.apiInteractions.authentication.response.body, null, 2)}

=== PCM Greeting Card Order ===
URL: ${data.apiInteractions.greetingCardOrder.request.url}
Request: ${JSON.stringify(data.apiInteractions.greetingCardOrder.request.body, null, 2)}
Response Status: ${data.apiInteractions.greetingCardOrder.response.status}
Response: ${JSON.stringify(data.apiInteractions.greetingCardOrder.response.body, null, 2)}
        `.trim();
        
        setDebugInfo(pcmDebugInfo);
      } else {
        setDebugInfo(`Client Records Found: ${clientsData.length}\nAdmin Session: ${adminSessionId ? 'Valid' : 'Missing'}`);
      }

      // Save the response for display
      setApiResponse(JSON.stringify(data, null, 2));

      // Update order with PCM details and status if successful
      if (data.success && data.pcmOrderId && data.pcmBatchId) {
        console.log('=== UPDATING DATABASE WITH PCM INFO ===');
        console.log('PCM Order ID:', data.pcmOrderId);
        console.log('PCM Batch ID:', data.pcmBatchId);
        
        // Get admin session for admin table access
        const adminSessionId = sessionStorage.getItem('adminSessionId');
        console.log('Admin session ID:', adminSessionId);
        
        // First, let's check what the order looks like before update
        const { data: beforeData } = await supabase
          .from('orders')
          .select('pcm_order_id, pcm_batch_id, status')
          .eq('id', orderId)
          .single();
        
        console.log('Order BEFORE update:', beforeData);
        
        // Simple direct update 
        const { data: updateResult, error: updateError } = await supabase
          .from('orders')
          .update({
            pcm_order_id: data.pcmOrderId.toString(),
            pcm_batch_id: data.pcmBatchId,
            status: 'sent_to_press',
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId)
          .select('pcm_order_id, pcm_batch_id, status');

        console.log('Update result:', updateResult);
        console.log('Update error:', updateError);

        if (updateError) {
          console.error('Direct update error:', updateError);
          throw new Error(`Failed to update order: ${updateError.message}`);
        }

        // Check what the order looks like after update
        const { data: afterData } = await supabase
          .from('orders')
          .select('pcm_order_id, pcm_batch_id, status')
          .eq('id', orderId)
          .single();
        
        console.log('Order AFTER update:', afterData);
        console.log('✅ Order updated successfully:', updateResult);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Physical Mailing</CardTitle>
        <CardDescription>
          Send physical greeting cards via PCM DirectMail API
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={handleSendPhysical}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Sending..." : "Send Physical Greeting Cards"}
        </Button>
        
        {debugInfo && (
          <div className="space-y-2">
            <h4 className="font-medium">Debug Info:</h4>
            <Textarea
              value={debugInfo}
              readOnly
              className="min-h-[150px] font-mono text-xs"
              placeholder="Debug information will appear here..."
            />
          </div>
        )}
        
        {apiResponse && (
          <div className="space-y-2">
            <h4 className="font-medium">API Response:</h4>
            <Textarea
              value={apiResponse}
              readOnly
              className="min-h-[200px] font-mono text-xs"
              placeholder="API response will appear here..."
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}