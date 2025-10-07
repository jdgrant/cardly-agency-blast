import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Search, Calendar, CreditCard, Package, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OrderData {
  id: string;
  readable_order_id: string;
  template_id: string;
  card_quantity: number;
  final_price: number;
  mailing_window: string;
  status: string;
  created_at: string;
  client_count: number;
}

const OrderStatus = () => {
  const [orderId, setOrderId] = useState('');
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!orderId.trim()) {
      toast({
        title: "Please enter an order ID",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // First try to find by readable order ID using the find_order_by_short_id function
      const { data: orders, error: searchError } = await supabase
        .rpc('find_order_by_short_id', { short_id: orderId.trim() });

      let foundOrder = null;
      if (!searchError && orders && orders.length > 0) {
        foundOrder = orders[0];
      } else {
        // If not found by short ID, try finding by UUID using the secure function
        try {
          const { data: orderByUuid, error: uuidError } = await supabase
            .rpc('get_order_by_id', { order_id: orderId.trim() });
          
          if (!uuidError && orderByUuid && orderByUuid.length > 0) {
            foundOrder = orderByUuid[0];
          }
        } catch (uuidError) {
          // Continue to not found handling
        }
      }

      if (!foundOrder) {
        toast({
          title: "Order not found",
          description: "Please check your order ID and try again.",
          variant: "destructive"
        });
        setOrderData(null);
      } else {
        setOrderData(foundOrder);
        toast({
          title: "Order found",
          description: "Order details loaded successfully."
        });
      }
    } catch (error) {
      console.error('Error searching for order:', error);
      toast({
        title: "Search failed",
        description: "There was an error searching for your order.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600';
      case 'processing': return 'text-blue-600';
      case 'approved': return 'text-green-600';
      case 'send_to_print': return 'text-purple-600';
      case 'sent': return 'text-green-600';
      case 'shipped': return 'text-green-600';
      case 'delivered': return 'text-green-800';
      case 'blocked': return 'text-red-600';
      case 'canceled': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'pending': return 'Your order has been received and is awaiting review.';
      case 'approved': return 'Your order has been approved and is ready for production.';
      case 'send_to_print': return 'Your cards have been sent to print and are in production.';
      case 'sent': return 'Your cards have been completed and sent out.';
      case 'processing': return 'Your cards are being printed and prepared for shipping.';
      case 'shipped': return 'Your cards have been shipped and are on their way.';
      case 'delivered': return 'Your cards have been delivered successfully.';
      case 'blocked': return 'This order has been blocked and requires attention.';
      case 'canceled': return 'This order has been canceled.';
      default: return 'Status information not available.';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-green-50 p-4">
      <div className="max-w-2xl mx-auto py-8">
        <div className="mb-6">
          <Button 
            onClick={() => navigate('/')} 
            variant="ghost" 
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center">Check Order Status</CardTitle>
            <p className="text-muted-foreground text-center">
              Enter your order ID to view the current status of your holiday card order
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="order-id">Order ID</Label>
              <div className="flex gap-2">
                <Input
                  id="order-id"
                  placeholder="e.g., 08092025-b9e8b"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button 
                  onClick={handleSearch}
                  disabled={isLoading}
                  className="px-6"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {orderData && (
              <>
                <Separator />
                
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Order Number</p>
                    <p className="text-2xl font-bold text-primary">{orderData.readable_order_id}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-center">
                    <p className={`text-lg font-semibold capitalize ${getStatusColor(orderData.status)}`}>
                      {orderData.status}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getStatusDescription(orderData.status)}
                    </p>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Order Details
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cards:</span>
                          <span>{orderData.card_quantity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Recipients:</span>
                          <span>{orderData.client_count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Mailing Window:</span>
                          <span>{orderData.mailing_window}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Order Date:</span>
                          <span>{new Date(orderData.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-semibold flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Payment Summary
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Amount:</span>
                          <span className="font-semibold">${orderData.final_price.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Payment Status:</span>
                          <span className="text-yellow-600">Pending</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4" />
                    Order Timeline
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Order received - {new Date(orderData.created_at).toLocaleDateString()}</span>
                    </div>
                    {orderData.status !== 'pending' && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Order processing started</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${orderData.status === 'shipped' || orderData.status === 'delivered' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <span className={orderData.status === 'shipped' || orderData.status === 'delivered' ? '' : 'text-muted-foreground'}>
                        Cards shipped
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${orderData.status === 'delivered' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <span className={orderData.status === 'delivered' ? '' : 'text-muted-foreground'}>
                        Cards delivered
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <Button 
                    onClick={() => {
                      setOrderData(null);
                      setOrderId('');
                    }}
                    variant="outline"
                  >
                    Search Another Order
                  </Button>
                </div>
              </>
            )}

            <div className="text-center text-sm text-muted-foreground">
              <p>Need help? Contact us at orders@dividedeye.com</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrderStatus;