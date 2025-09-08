import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PhysicalMailingSenderProps {
  orderId: string;
}

export function PhysicalMailingSender({ orderId }: PhysicalMailingSenderProps) {
  const [isLoading, setIsLoading] = useState(false);
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

      const { data, error } = await supabase.functions.invoke('send-physical-greeting-cards', {
        body: {
          orderId,
          recipientAddresses: mockRecipients
        }
      });

      if (error) throw error;

      toast({
        title: "Physical Mailing Initiated",
        description: `Greeting cards sent to PCM DirectMail API for ${mockRecipients.length} recipients`,
      });
    } catch (error) {
      console.error('Error sending physical mailing:', error);
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
      <CardContent>
        <Button 
          onClick={handleSendPhysical}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Sending..." : "Send Physical Greeting Cards"}
        </Button>
      </CardContent>
    </Card>
  );
}