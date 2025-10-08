'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Bell, CheckCircle, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function WaitlistPage() {
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWaitlist();
  }, []);

  const fetchWaitlist = async () => {
    try {
      const response = await fetch('/api/waitlist');
      const data = await response.json();
      setWaitlist(data.waitlist || []);
    } catch (error) {
      console.error('Failed to fetch waitlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalCustomers = waitlist.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Waitlist Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage customer waitlists for out-of-stock products
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Products with Waitlists
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{waitlist.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Ready to Notify
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#D4AF37]">
              {waitlist.filter(w => w.count > 0).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Waitlist Items */}
      {loading ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">Loading waitlist...</p>
          </CardContent>
        </Card>
      ) : waitlist.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No customers on waitlist</p>
            <p className="text-sm text-muted-foreground mt-2">
              Customers will appear here when products are out of stock
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {waitlist.map(item => (
            <Card key={item.productId} className="hover-lift">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{item.productName}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.count} {item.count === 1 ? 'customer' : 'customers'} waiting
                    </p>
                  </div>
                  <Badge className="bg-[#D4AF37]">
                    {item.count}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {item.customers.slice(0, 5).map(customer => (
                    <div key={customer._id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{customer.customerName}</p>
                        <p className="text-sm text-muted-foreground">{customer.customerEmail}</p>
                        <p className="text-xs text-muted-foreground">
                          Joined {new Date(customer.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                      {customer.notified ? (
                        <Badge variant="secondary">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Notified
                        </Badge>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => toast.info('Notification feature coming soon!')}>
                          <Bell className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  
                  {item.count > 5 && (
                    <p className="text-sm text-muted-foreground text-center">
                      + {item.count - 5} more customers
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t flex gap-2">
                  <Button className="flex-1 bg-[#D4AF37] hover:bg-[#B8941F]" onClick={() => toast.info('Bulk notification feature coming soon!')}>
                    <Bell className="mr-2 h-4 w-4" />
                    Notify All via SMS
                  </Button>
                  <Button className="flex-1" variant="outline" onClick={() => toast.info('Bulk email feature coming soon!')}>
                    Notify All via Email
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
