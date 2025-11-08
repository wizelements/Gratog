'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Search, Package, DollarSign, Edit, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { toast } from 'sonner';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/admin/products');
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncFromSquare = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/admin/products/sync', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success(`Synced ${data.synced} products from Square`);
        fetchProducts();
      } else {
        toast.error(data.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync from Square');
    } finally {
      setSyncing(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground mt-1">
            Manage your product catalog - {products.length} products
          </p>
        </div>
        <Button
          onClick={handleSyncFromSquare}
          disabled={syncing}
          variant="outline"
        >
          {syncing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync from Square
            </>
          )}
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="overflow-hidden hover-lift">
              <div className="relative h-48 bg-muted">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
                {product.featured && (
                  <Badge className="absolute top-3 right-3 bg-[#D4AF37]">
                    Featured
                  </Badge>
                )}
              </div>
              <CardHeader>
                <CardTitle className="text-lg">{product.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {product.subtitle}
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-[#D4AF37]" />
                      <span className="font-bold text-lg">
                        ${typeof product.price === 'number' && product.price > 100 ? (product.price / 100).toFixed(2) : (product.price || 0).toFixed(2)}
                      </span>
                    </div>
                    <Badge variant="outline">
                      {product.category || 'Uncategorized'}
                    </Badge>
                  </div>
                  <div className="pt-3 border-t">
                    <Link href={`/admin/products/${product.id}`}>
                      <Button className="w-full" variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Product
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredProducts.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">
              No products found matching your search.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
