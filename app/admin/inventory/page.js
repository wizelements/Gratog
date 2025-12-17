'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

export default function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adjustingProduct, setAdjustingProduct] = useState(null);
  const [adjustment, setAdjustment] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/admin/products');
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      logger.error('Admin', 'Failed to fetch products', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustStock = async () => {
    if (!adjustingProduct || !adjustment) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/inventory/${adjustingProduct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adjustment: parseInt(adjustment),
          reason: reason || 'Manual adjustment'
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Stock updated successfully! New stock: ${data.newStock}`);
        setAdjustingProduct(null);
        setAdjustment('');
        setReason('');
        fetchProducts();
      } else {
        toast.error(data.error || 'Failed to update stock');
      }
    } catch (error) {
      toast.error('Failed to update stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  const lowStockProducts = products.filter(p => p.stock <= p.lowStockThreshold);
  const outOfStockProducts = products.filter(p => p.stock === 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Inventory Management</h1>
        <p className="text-muted-foreground mt-1">
          Track and manage product stock levels
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 dark:border-yellow-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-yellow-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Low Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{lowStockProducts.length}</div>
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-600">
              Out of Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{outOfStockProducts.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Products List */}
      {loading ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">Loading inventory...</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Stock Levels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="relative h-16 w-16 flex-shrink-0 rounded-md overflow-hidden">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{product.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {product.subtitle}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Last restocked: {product.lastRestocked ? new Date(product.lastRestocked).toLocaleDateString() : 'Never'}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-2xl font-bold">{product.stock}</div>
                      <div className="text-xs text-muted-foreground">units</div>
                    </div>

                    <Badge
                      variant={
                        product.stock === 0
                          ? 'destructive'
                          : product.stock <= product.lowStockThreshold
                          ? 'default'
                          : 'secondary'
                      }
                      className={
                        product.stock === 0
                          ? ''
                          : product.stock <= product.lowStockThreshold
                          ? 'bg-yellow-600'
                          : 'bg-green-600'
                      }
                    >
                      {product.stock === 0
                        ? 'Out of Stock'
                        : product.stock <= product.lowStockThreshold
                        ? 'Low Stock'
                        : 'In Stock'}
                    </Badge>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAdjustingProduct(product);
                            setAdjustment('');
                            setReason('');
                          }}
                        >
                          Adjust
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Adjust Stock - {product.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Current Stock</Label>
                            <div className="text-2xl font-bold mt-1">{product.stock} units</div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="adjustment">Adjustment Amount</Label>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setAdjustment(prev => (parseInt(prev) || 0) - 10)}
                              >
                                <Minus className="h-4 w-4" />
                                10
                              </Button>
                              <Input
                                id="adjustment"
                                type="number"
                                placeholder="0"
                                value={adjustment}
                                onChange={(e) => setAdjustment(e.target.value)}
                                className="text-center text-lg font-bold"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setAdjustment(prev => (parseInt(prev) || 0) + 10)}
                              >
                                <Plus className="h-4 w-4" />
                                10
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Use positive numbers to add stock, negative to remove
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="reason">Reason (optional)</Label>
                            <Input
                              id="reason"
                              placeholder="e.g., New shipment, Damage, Sale"
                              value={reason}
                              onChange={(e) => setReason(e.target.value)}
                            />
                          </div>

                          {adjustment && (
                            <div className="p-3 bg-muted rounded-md">
                              <p className="text-sm font-medium">
                                New stock will be:{' '}
                                <span className="text-lg font-bold text-[#D4AF37]">
                                  {product.stock + parseInt(adjustment || 0)} units
                                </span>
                              </p>
                            </div>
                          )}

                          <Button
                            onClick={handleAdjustStock}
                            className="w-full bg-[#D4AF37] hover:bg-[#B8941F]"
                            disabled={!adjustment || isSubmitting}
                          >
                            {isSubmitting ? 'Updating...' : 'Update Stock'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
