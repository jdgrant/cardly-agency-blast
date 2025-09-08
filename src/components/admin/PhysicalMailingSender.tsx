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
    
    try {
      // This would normally get recipient addresses from the order's client records
      const mockRecipients = [
        {
          name: "John Doe",
          address1: "123 Main St",
          city: "Anytown",
          state: "CA",
          zip: "12345"
        }
      ];

      const requestPayload = {
        orderId,
        recipientAddresses: mockRecipients
      };

      // Set debug info showing what we're sending
      const apiUrl = `https://wsibvneidsmtsazfbmgc.supabase.co/functions/v1/send-physical-greeting-cards`;
      setDebugInfo(`API URL: ${apiUrl}\n\nRequest Payload:\n${JSON.stringify(requestPayload, null, 2)}`);

      const { data, error } = await supabase.functions.invoke('send-physical-greeting-cards', {
        body: requestPayload
      });

      if (error) throw error;

      // Save the response for display
      setApiResponse(JSON.stringify(data, null, 2));

      toast({
        title: "Physical Mailing Initiated",
        description: `Greeting cards sent to PCM DirectMail API for ${mockRecipients.length} recipients`,
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