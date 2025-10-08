import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, CheckCircle } from "lucide-react";

interface SupportTicketFormProps {
  sessionId: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const SupportTicketForm = ({ sessionId, onSuccess, onCancel }: SupportTicketFormProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [summary, setSummary] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted - starting ticket creation');

    if (!name.trim() || !email.trim() || !summary.trim()) {
      console.log('Validation failed - missing required fields');
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    console.log('Calling create-support-ticket function with:', {
      sessionId,
      customerName: name.trim(),
      customerEmail: email.trim(),
      hasPhone: !!phone.trim()
    });

    try {
      const { data, error } = await supabase.functions.invoke('create-support-ticket', {
        body: {
          sessionId,
          customerName: name.trim(),
          customerEmail: email.trim(),
          customerPhone: phone.trim() || null,
          issueSummary: summary.trim()
        }
      });

      console.log('Function response:', { data, error });

      if (error) {
        console.error('Function returned error:', error);
        throw error;
      }

      if (!data || !data.ticket) {
        console.error('Invalid response structure:', data);
        throw new Error('Invalid response from server');
      }

      console.log('Ticket created successfully:', data.ticket);
      setTicketNumber(data.ticket.ticketNumber);
      
      toast({
        title: "Ticket Created!",
        description: `Your support ticket ${data.ticket.ticketNumber} has been created. Our team will contact you soon.`,
      });

      // Show success state for 3 seconds before closing
      setTimeout(() => {
        onSuccess();
      }, 3000);

    } catch (error: any) {
      console.error('Ticket creation error:', error);
      console.error('Error details:', {
        message: error?.message,
        status: error?.status,
        details: error?.details
      });
      
      const errorMessage = error?.message || error?.details || 'Failed to create support ticket';
      
      toast({
        title: "Error Creating Ticket",
        description: `${errorMessage}. Please email support@sendyourcards.io directly.`,
        variant: "destructive"
      });
      setIsSubmitting(false);
    }
  };

  if (ticketNumber) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
        <h3 className="text-xl font-semibold mb-2">Ticket Created!</h3>
        <p className="text-muted-foreground mb-4">
          Your support ticket <strong>{ticketNumber}</strong> has been created.
        </p>
        <p className="text-sm text-muted-foreground">
          Our team will contact you at {email} shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="John Doe"
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email Address *</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="john@example.com"
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(555) 123-4567"
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="summary">Issue Summary *</Label>
        <Textarea
          id="summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Please describe your issue in detail..."
          rows={4}
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Ticket...
            </>
          ) : (
            "Submit Ticket"
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        * Required fields
      </p>
    </form>
  );
};