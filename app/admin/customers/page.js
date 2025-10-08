'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Phone, Mail, ShoppingBag, Users, Star, User } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [segment, setSegment] = useState('all');

  useEffect(() => {
    fetchCustomers();
  }, [segment]);

  const fetchCustomers = async () => {
    try {
      const params = new URLSearchParams();
      if (segment !== 'all') params.append('segment', segment);
      
      const response = await fetch(`/api/customers?${params}`);
      const data = await response.json();
      setCustomers(data.customers || []);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone.includes(searchQuery)
  );

  const segments = {
    all: customers.length,
    new: customers.filter(c => c.segment === 'new').length,
    regular: customers.filter(c => c.segment === 'regular').length,
    vip: customers.filter(c => c.segment === 'vip').length,
    inactive: customers.filter(c => c.segment === 'inactive').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Customers</h1>
        <p className="text-muted-foreground mt-1">
          Manage your customer relationships
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{segments.all}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" />
              New
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{segments.new}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Regular
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{segments.regular}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Star className="h-4 w-4 text-[#D4AF37]" />
              VIP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#D4AF37]">{segments.vip}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={segment} onValueChange={setSegment}>
        <TabsList>
          <TabsTrigger value="all">All ({segments.all})</TabsTrigger>
          <TabsTrigger value="new">New ({segments.new})</TabsTrigger>
          <TabsTrigger value="regular">Regular ({segments.regular})</TabsTrigger>
          <TabsTrigger value="vip">VIP ({segments.vip})</TabsTrigger>
          <TabsTrigger value="inactive">Inactive ({segments.inactive})</TabsTrigger>
        </TabsList>

        <TabsContent value={segment} className="mt-6">
          {loading ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground">Loading customers...</p>
              </CardContent>
            </Card>
          ) : filteredCustomers.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No customers found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredCustomers.map(customer => (
                <Card key={customer._id} className="hover-lift">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{customer.name}</h3>
                          {customer.segment === 'vip' && (
                            <Badge className="bg-[#D4AF37]">
                              <Star className="h-3 w-3 mr-1" />
                              VIP
                            </Badge>
                          )}
                          {customer.segment === 'new' && (
                            <Badge variant="secondary">New</Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            {customer.email}
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            {customer.phone}
                          </div>
                          <div className="flex items-center gap-2">
                            <ShoppingBag className="h-4 w-4" />
                            {customer.stats?.totalOrders || 0} orders • ${((customer.stats?.totalSpent || 0) / 100).toFixed(2)} spent
                          </div>
                        </div>

                        {customer.stats?.lastOrderDate && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Last order: {new Date(customer.stats.lastOrderDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Phone className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Mail className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
