import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageCircle, Mail, Calendar } from "lucide-react";

interface ChatSession {
  id: string;
  created_at: string;
  user_email: string | null;
  order_id: string | null;
  status: string;
}

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

export const ChatLogs = ({ sessionId }: { sessionId: string }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadSessions();
  }, [sessionId]);

  useEffect(() => {
    if (selectedSession) {
      loadMessages(selectedSession);
    }
  }, [selectedSession]);

  const loadSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
      
      if (data && data.length > 0) {
        setSelectedSession(data[0].id);
      }
    } catch (error) {
      console.error('Error loading chat sessions:', error);
      toast({
        title: "Error",
        description: "Failed to load chat sessions",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive"
      });
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Sessions List */}
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Chat Sessions ({sessions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => setSelectedSession(session.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedSession === session.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {session.user_email && (
                        <Mail className="h-4 w-4 flex-shrink-0" />
                      )}
                      <span className="text-sm font-medium truncate">
                        {session.user_email || 'Anonymous'}
                      </span>
                    </div>
                    <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
                      {session.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs opacity-70">
                    <Calendar className="h-3 w-3" />
                    {new Date(session.created_at).toLocaleDateString()}
                  </div>
                  {session.order_id && (
                    <div className="text-xs mt-1 opacity-70">
                      Order linked
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Messages */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Conversation</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedSession ? (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4 pr-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-3 ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {msg.role}
                        </Badge>
                        <span className="text-xs opacity-70">
                          {new Date(msg.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex items-center justify-center h-[600px] text-muted-foreground">
              Select a session to view messages
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};