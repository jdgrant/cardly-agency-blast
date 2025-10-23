import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { RefreshCw, TrendingUp, TrendingDown, Users, ShoppingCart, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SessionStats {
  totalSessions: number;
  completedSessions: number;
  abandonedSessions: number;
  conversionRate: number;
  stepDropoff: Record<number, number>;
  activeSessions: number;
}

interface SessionDetail {
  id: string;
  session_id: string;
  created_at: string;
  current_step: number;
  completed: boolean;
  template_selected: string | null;
  user_email: string | null;
  abandoned_at: string | null;
}

export const SessionAnalytics = () => {
  const [stats, setStats] = useState<SessionStats>({
    totalSessions: 0,
    completedSessions: 0,
    abandonedSessions: 0,
    conversionRate: 0,
    stepDropoff: {},
    activeSessions: 0
  });
  const [recentSessions, setRecentSessions] = useState<SessionDetail[]>([]);
  const [activeSessions, setActiveSessions] = useState<SessionDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch all wizard sessions
      const { data: sessions, error } = await supabase
        .from('wizard_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate stats
      const total = sessions?.length || 0;
      const completed = sessions?.filter(s => s.completed).length || 0;
      const abandoned = total - completed;
      const conversion = total > 0 ? (completed / total) * 100 : 0;

      // Filter active sessions (last 24 hours, not completed, not abandoned)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const active = sessions?.filter(s => 
        s.created_at >= twentyFourHoursAgo && 
        !s.completed && 
        !s.abandoned_at
      ) || [];

      // Calculate step drop-off
      const stepCounts: Record<number, number> = {};
      sessions?.forEach(session => {
        if (!session.completed && session.current_step) {
          stepCounts[session.current_step] = (stepCounts[session.current_step] || 0) + 1;
        }
      });

      setStats({
        totalSessions: total,
        completedSessions: completed,
        abandonedSessions: abandoned,
        conversionRate: conversion,
        stepDropoff: stepCounts,
        activeSessions: active.length
      });

      // Set active and recent sessions
      setActiveSessions(active);
      setRecentSessions((sessions || []).slice(0, 50));

    } catch (error) {
      console.error('Fetch analytics error:', error);
      toast({
        title: "Error",
        description: "Failed to fetch session analytics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const getStepName = (step: number) => {
    const steps: Record<number, string> = {
      1: 'Template Selection',
      2: 'Message & Assets',
      3: 'Preview',
      4: 'Postage & Signature',
      5: 'Package Selection',
      6: 'Client Upload',
      7: 'Review & Payment'
    };
    return steps[step] || `Step ${step}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getTimeSinceCreation = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return `${diffMins}m ago`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Session Analytics</h2>
        <Button onClick={fetchAnalytics} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSessions}</div>
            <p className="text-xs text-muted-foreground">All-time wizard starts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completedSessions}</div>
            <p className="text-xs text-muted-foreground">Finished orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abandoned</CardTitle>
            <ShoppingCart className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.abandonedSessions}</div>
            <p className="text-xs text-muted-foreground">Incomplete sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active (24h)</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.activeSessions}</div>
            <p className="text-xs text-muted-foreground">In progress now</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            {stats.conversionRate >= 50 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-orange-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Completion rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Sessions Table */}
      {activeSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Sessions (Last 24 Hours)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session ID</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Time Ago</TableHead>
                  <TableHead>Current Step</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeSessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-mono text-xs">
                      {session.session_id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatDate(session.created_at)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {getTimeSinceCreation(session.created_at)}
                    </TableCell>
                    <TableCell>{getStepName(session.current_step)}</TableCell>
                    <TableCell className="text-xs">
                      {session.template_selected || '-'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {session.user_email || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Step Drop-off Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Abandonment by Step</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Step</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Abandoned Count</TableHead>
                <TableHead className="text-right">% of Total Abandoned</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(stats.stepDropoff)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([step, count]) => (
                  <TableRow key={step}>
                    <TableCell>Step {step}</TableCell>
                    <TableCell>{getStepName(parseInt(step))}</TableCell>
                    <TableCell className="text-right">{count}</TableCell>
                    <TableCell className="text-right">
                      {stats.abandonedSessions > 0 
                        ? ((count / stats.abandonedSessions) * 100).toFixed(1)
                        : 0}%
                    </TableCell>
                  </TableRow>
                ))}
              {Object.keys(stats.stepDropoff).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No abandoned sessions to analyze
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sessions (Last 50)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session ID</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Time Ago</TableHead>
                <TableHead>Current Step</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentSessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="font-mono text-xs">
                    {session.session_id.slice(0, 8)}...
                  </TableCell>
                  <TableCell className="text-xs">
                    {formatDate(session.created_at)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {getTimeSinceCreation(session.created_at)}
                  </TableCell>
                  <TableCell>{getStepName(session.current_step)}</TableCell>
                  <TableCell className="text-xs">
                    {session.template_selected || '-'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {session.user_email || '-'}
                  </TableCell>
                  <TableCell>
                    {session.completed ? (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                        Completed
                      </span>
                    ) : session.abandoned_at ? (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-red-100 text-red-800">
                        Abandoned
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">
                        In Progress
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {recentSessions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No sessions found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
