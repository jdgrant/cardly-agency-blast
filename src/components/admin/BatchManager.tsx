import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Send, Calendar, Package } from 'lucide-react';

interface Batch {
  id: string;
  name: string;
  drop_date: string;
  status: string;
  pcm_batch_id?: number;
  created_at: string;
  updated_at: string;
  order_count: number;
}

interface Order {
  id: string;
  template_id: string;
  card_quantity: number;
  client_count: number;
  final_price: number;
  status: string;
  drop_date?: string;
  contact_firstname?: string;
  contact_lastname?: string;
  created_at: string;
}

const BatchManager = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchDropDate, setNewBatchDropDate] = useState('');
  const [showCreateStandardDialog, setShowCreateStandardDialog] = useState(false);
  const { toast } = useToast();

  // Standard mailing windows and their drop dates
  const standardMailingWindows = [
    { window: 'dec-1-5', name: 'December 1-5 Batch', dropDate: `${new Date().getFullYear()}-11-29` },
    { window: 'dec-6-10', name: 'December 6-10 Batch', dropDate: `${new Date().getFullYear()}-12-04` },
    { window: 'dec-11-15', name: 'December 11-15 Batch', dropDate: `${new Date().getFullYear()}-12-09` },
    { window: 'dec-16-20', name: 'December 16-20 Batch', dropDate: `${new Date().getFullYear()}-12-14` },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const sessionId = sessionStorage.getItem('adminSessionId');
      if (!sessionId) {
        throw new Error('No admin session found');
      }

      // Fetch batches
      const { data: batchesData, error: batchesError } = await supabase
        .rpc('get_batches', { session_id_param: sessionId });

      if (batchesError) throw batchesError;

      setBatches(batchesData || []);

      // Fetch approved orders not in any batch
      const { data: ordersData, error: ordersError } = await supabase
        .rpc('get_admin_orders', { session_id_param: sessionId });

      if (ordersError) throw ordersError;

      // Filter for approved orders only
      const approvedOrders = (ordersData || []).filter((order: Order) => 
        order.status === 'approved'
      );

      setAvailableOrders(approvedOrders);
    } catch (error) {
      console.error('Fetch data error:', error);
      toast({
        title: "Error",
        description: "Failed to fetch batches data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createBatch = async () => {
    if (!newBatchName || !newBatchDropDate) {
      toast({
        title: "Validation Error",
        description: "Please provide both name and drop date",
        variant: "destructive"
      });
      return;
    }

    try {
      const sessionId = sessionStorage.getItem('adminSessionId');
      if (!sessionId) {
        throw new Error('No admin session found');
      }

      const { data: batchId, error } = await supabase
        .rpc('create_batch', { 
          session_id_param: sessionId,
          batch_name: newBatchName,
          batch_drop_date: newBatchDropDate
        });

      if (error) throw error;

      toast({
        title: "Batch Created",
        description: `Batch "${newBatchName}" created successfully`,
      });

      setNewBatchName('');
      setNewBatchDropDate('');
      setShowCreateDialog(false);
      fetchData();
    } catch (error) {
      console.error('Create batch error:', error);
      toast({
        title: "Error",
        description: "Failed to create batch",
        variant: "destructive"
      });
    }
  };

  const createStandardBatches = async () => {
    try {
      const sessionId = sessionStorage.getItem('adminSessionId');
      if (!sessionId) {
        throw new Error('No admin session found');
      }

      let created = 0;
      const existingBatchNames = batches.map(b => b.name);

      for (const window of standardMailingWindows) {
        // Skip if batch already exists
        if (existingBatchNames.includes(window.name)) {
          continue;
        }

        const { error } = await supabase
          .rpc('create_batch', { 
            session_id_param: sessionId,
            batch_name: window.name,
            batch_drop_date: window.dropDate
          });

        if (error) {
          console.error(`Error creating batch for ${window.name}:`, error);
        } else {
          created++;
        }
      }

      if (created > 0) {
        toast({
          title: "Standard Batches Created",
          description: `${created} standard mailing window batches created`,
        });
        fetchData();
      } else {
        toast({
          title: "No New Batches",
          description: "All standard batches already exist",
        });
      }
    } catch (error) {
      console.error('Create standard batches error:', error);
      toast({
        title: "Error",
        description: "Failed to create standard batches",
        variant: "destructive"
      });
    }
  };

  const addOrdersToBatch = async () => {
    if (!selectedBatch || selectedOrders.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select orders to add to the batch",
        variant: "destructive"
      });
      return;
    }

    try {
      const sessionId = sessionStorage.getItem('adminSessionId');
      if (!sessionId) {
        throw new Error('No admin session found');
      }

      const { data: addedCount, error } = await supabase
        .rpc('add_orders_to_batch', { 
          session_id_param: sessionId,
          batch_id_param: selectedBatch.id,
          order_ids: selectedOrders
        });

      if (error) throw error;

      toast({
        title: "Orders Added",
        description: `${addedCount} orders added to batch "${selectedBatch.name}"`,
      });

      setSelectedOrders([]);
      setShowOrderDialog(false);
      setSelectedBatch(null);
      fetchData();
    } catch (error) {
      console.error('Add orders to batch error:', error);
      toast({
        title: "Error",
        description: "Failed to add orders to batch",
        variant: "destructive"
      });
    }
  };

  const getCustomerName = (order: Order) => {
    if (order.contact_firstname && order.contact_lastname) {
      return `${order.contact_firstname} ${order.contact_lastname}`;
    }
    return order.contact_firstname || order.contact_lastname || 'No customer name';
  };

  const formatDropDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'sent_to_pcm': return 'default';
      case 'completed': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex space-x-2">
        {/* Create Standard Batches Button */}
        <Button 
          className="flex items-center space-x-2"
          variant="default"
          onClick={createStandardBatches}
        >
          <Calendar className="w-4 h-4" />
          <span>Create Standard Drop Date Batches</span>
        </Button>
        
        {/* Create Custom Batch Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Create Custom Batch</span>
            </Button>
          </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Batch</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="batch-name">Batch Name</Label>
              <Input
                id="batch-name"
                value={newBatchName}
                onChange={(e) => setNewBatchName(e.target.value)}
                placeholder="e.g., December 1-5 Batch"
              />
            </div>
            <div>
              <Label htmlFor="drop-date">Drop Date</Label>
              <Input
                id="drop-date"
                type="date"
                value={newBatchDropDate}
                onChange={(e) => setNewBatchDropDate(e.target.value)}
              />
            </div>
            <Button onClick={createBatch} className="w-full">
              Create Batch
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>

      {/* Standard Batches Information Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800 text-sm">Standard Mailing Window Batches</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-blue-700 mb-3">
            Click "Create Standard Drop Date Batches" to automatically create batches for all mailing windows:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {standardMailingWindows.map((window) => (
              <div key={window.window} className="flex justify-between bg-white px-2 py-1 rounded">
                <span className="font-medium">{window.name}</span>
                <span className="text-gray-600">Drop: {new Date(window.dropDate).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Orders to Batch Dialog */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Add Orders to Batch: {selectedBatch?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Select</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Cards</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedOrders.includes(order.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedOrders([...selectedOrders, order.id]);
                            } else {
                              setSelectedOrders(selectedOrders.filter(id => id !== order.id));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {order.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>{getCustomerName(order)}</TableCell>
                      <TableCell>{order.card_quantity}</TableCell>
                      <TableCell>${Number(order.final_price).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="default">{order.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Selected: {selectedOrders.length} orders
              </p>
              <Button onClick={addOrdersToBatch} disabled={selectedOrders.length === 0}>
                Add Selected Orders
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Batches Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="w-5 h-5" />
            <span>Batches</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch Name</TableHead>
                  <TableHead>Drop Date</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>PCM Batch ID</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-medium">
                      {batch.name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>{formatDropDate(batch.drop_date)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {batch.order_count} orders
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(batch.status)}>
                        {batch.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {batch.pcm_batch_id ? (
                        <span className="font-mono text-sm">#{batch.pcm_batch_id}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(batch.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedBatch(batch);
                            setShowOrderDialog(true);
                          }}
                        >
                          Add Orders
                        </Button>
                        {batch.status === 'pending' && batch.order_count > 0 && (
                          <Button
                            size="sm"
                            className="flex items-center space-x-1"
                          >
                            <Send className="w-3 h-3" />
                            <span>Send to PCM</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {batches.length === 0 && !loading && (
              <div className="text-center py-8 text-muted-foreground">
                No batches created yet. Create your first batch to get started.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BatchManager;