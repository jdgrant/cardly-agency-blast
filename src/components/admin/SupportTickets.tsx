import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Mail, Phone, User } from "lucide-react";

interface Ticket {
  id: string;
  ticket_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  issue_summary: string;
  conversation_context: string | null;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

export const SupportTickets = ({ sessionId }: { sessionId: string }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadTickets();
  }, [sessionId]);

  const loadTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error loading tickets:', error);
      toast({
        title: "Error",
        description: "Failed to load support tickets",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: newStatus })
        .eq('id', ticketId);

      if (error) throw error;

      setTickets(prev =>
        prev.map(t => (t.id === ticketId ? { ...t, status: newStatus } : t))
      );

      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : null);
      }

      toast({
        title: "Status Updated",
        description: `Ticket status changed to ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast({
        title: "Error",
        description: "Failed to update ticket status",
        variant: "destructive"
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'open':
        return 'default' as const;
      case 'in_progress':
        return 'secondary' as const;
      case 'resolved':
        return 'outline' as const;
      default:
        return 'secondary' as const;
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive' as const;
      case 'medium':
        return 'default' as const;
      case 'low':
        return 'secondary' as const;
      default:
        return 'secondary' as const;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Support Tickets ({tickets.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-mono text-xs">
                    {ticket.ticket_number}
                  </TableCell>
                  <TableCell>{ticket.customer_name}</TableCell>
                  <TableCell className="text-sm">{ticket.customer_email}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {ticket.issue_summary}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPriorityBadgeVariant(ticket.priority)}>
                      {ticket.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(ticket.status)}>
                      {ticket.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Ticket {selectedTicket?.ticket_number}</DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-6 pr-4">
                {/* Customer Info */}
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Customer Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4 pl-6">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">{selectedTicket.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        Email
                      </p>
                      <a
                        href={`mailto:${selectedTicket.customer_email}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {selectedTicket.customer_email}
                      </a>
                    </div>
                    {selectedTicket.customer_phone && (
                      <div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          Phone
                        </p>
                        <a
                          href={`tel:${selectedTicket.customer_phone}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {selectedTicket.customer_phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Issue Summary */}
                <div className="space-y-2">
                  <h4 className="font-semibold">Issue Summary</h4>
                  <p className="pl-6 text-sm">{selectedTicket.issue_summary}</p>
                </div>

                {/* Chat History */}
                {selectedTicket.conversation_context && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">Chat Conversation</h4>
                    <div className="pl-6 text-sm bg-muted p-4 rounded-lg whitespace-pre-wrap">
                      {selectedTicket.conversation_context}
                    </div>
                  </div>
                )}

                {/* Status Actions */}
                <div className="space-y-2">
                  <h4 className="font-semibold">Update Status</h4>
                  <div className="flex gap-2 pl-6">
                    <Button
                      size="sm"
                      variant={selectedTicket.status === 'open' ? 'default' : 'outline'}
                      onClick={() => updateTicketStatus(selectedTicket.id, 'open')}
                    >
                      Open
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedTicket.status === 'in_progress' ? 'default' : 'outline'}
                      onClick={() => updateTicketStatus(selectedTicket.id, 'in_progress')}
                    >
                      In Progress
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedTicket.status === 'resolved' ? 'default' : 'outline'}
                      onClick={() => updateTicketStatus(selectedTicket.id, 'resolved')}
                    >
                      Resolved
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};