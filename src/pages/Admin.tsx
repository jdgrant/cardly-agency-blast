
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link } from 'react-router-dom';
import { Calendar, Upload, File } from 'lucide-react';

interface Order {
  id: number;
  template: string;
  clientCount: number;
  shippingWindow: string;
  hasLogo: boolean;
  hasSignature: boolean;
  total: number;
  submittedAt: string;
  clients: any[];
}

const Admin = () => {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      const storedOrders = JSON.parse(localStorage.getItem('holidayCardOrders') || '[]');
      setOrders(storedOrders);
    }
  }, [isAuthenticated]);

  const handleLogin = () => {
    // Simple password check (in real app, this would be server-side)
    if (password === 'admin123') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect password');
    }
  };

  const exportOrders = (format: 'csv' | 'json') => {
    if (format === 'json') {
      const dataStr = JSON.stringify(orders, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'holiday-card-orders.json';
      link.click();
    } else {
      const csvHeader = 'Order ID,Template,Client Count,Shipping Window,Has Logo,Has Signature,Total,Submitted At\n';
      const csvData = orders.map(order => 
        `${order.id},${order.template},${order.clientCount},${order.shippingWindow},${order.hasLogo},${order.hasSignature},$${order.total.toFixed(2)},${new Date(order.submittedAt).toLocaleDateString()}`
      ).join('\n');
      
      const dataBlob = new Blob([csvHeader + csvData], { type: 'text/csv' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'holiday-card-orders.csv';
      link.click();
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Admin Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}
            <Button onClick={handleLogin} className="w-full">
              Login
            </Button>
            <div className="text-center">
              <Link to="/" className="text-sm text-blue-600 hover:underline">
                ← Back to Home
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-blue-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg"></div>
            <span className="text-xl font-semibold text-gray-800">AgencyHolidayCards.com</span>
          </Link>
          <Badge variant="secondary">Admin Dashboard</Badge>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{orders.length}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Cards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {orders.reduce((sum, order) => sum + order.clientCount, 0)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                ${orders.reduce((sum, order) => sum + order.total, 0).toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders Table */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl font-bold">Recent Orders</CardTitle>
              <div className="space-x-2">
                <Button variant="outline" size="sm" onClick={() => exportOrders('csv')}>
                  Export CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportOrders('json')}>
                  Export JSON
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No orders submitted yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Cards</TableHead>
                      <TableHead>Shipping Window</TableHead>
                      <TableHead>Assets</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Submitted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-sm">#{order.id}</TableCell>
                        <TableCell>{order.template}</TableCell>
                        <TableCell>{order.clientCount}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{order.shippingWindow}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            {order.hasLogo && (
                              <Badge variant="secondary" className="text-xs">
                                Logo
                              </Badge>
                            )}
                            {order.hasSignature && (
                              <Badge variant="secondary" className="text-xs">
                                Signature
                              </Badge>
                            )}
                            {!order.hasLogo && !order.hasSignature && (
                              <span className="text-gray-400 text-sm">None</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          ${order.total.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {new Date(order.submittedAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
