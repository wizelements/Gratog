'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id;
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    price: 0,
    images: []
  });

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/admin/products/${productId}`);
      const data = await response.json();
      
      if (data.success) {
        setProduct(data.product);
        setFormData({
          name: data.product.name || '',
          description: data.product.description || '',
          category: data.product.intelligentCategory || data.product.category || '',
          price: data.product.price || 0,
          images: data.product.images || []
        });
      } else {
        toast.error('Failed to load product');
      }
    } catch (error) {
      logger.error('Admin', 'Failed to fetch product', error);
      toast.error('Error loading product');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: formData,
          syncToSquare: false, // Just save to DB
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Product updated successfully');
        fetchProduct(); // Refresh
      } else {
        toast.error(data.error || 'Failed to update product');
      }
    } catch (error) {
      logger.error('Admin', 'Save error', error);
      toast.error('Error saving product');
    } finally {
      setSaving(false);
    }
  };

  const handleSyncToSquare = async () => {
    setSyncing(true);
    try {
      const response = await fetch(`/api/admin/products/${productId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: formData,
          direction: 'to_square'
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Synced to Square successfully');
        fetchProduct();
      } else {
        toast.error(data.error || 'Failed to sync to Square');
      }
    } catch (error) {
      logger.error('Admin', 'Sync error', error);
      toast.error('Error syncing to Square');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading product...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-center">Product not found</p>
            <Button onClick={() => router.back()} className="w-full mt-4">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/admin/products')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Product</h1>
            <p className="text-muted-foreground mt-1">
              Update product information and sync to Square
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleSyncToSquare}
            disabled={syncing || saving}
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
                Sync to Square
              </>
            )}
          </Button>
          <Button onClick={handleSave} disabled={saving || syncing}>
            {saving ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Product Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Product Information</CardTitle>
          <CardDescription>
            Edit basic product details. Changes will be saved locally and can be synced to Square.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Images */}
          {formData.images.length > 0 && (
            <div>
              <Label>Product Images</Label>
              <div className="grid grid-cols-4 gap-4 mt-2">
                {formData.images.map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    <Image
                      src={img}
                      alt={`Product image ${idx + 1}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Product Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleUpdate('name', e.target.value)}
              placeholder="Enter product name"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleUpdate('description', e.target.value)}
              placeholder="Enter product description"
              rows={6}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="category">Category</Label>
              {product?.manualCategoryOverride && (
                <Badge variant="outline" className="text-xs">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Manual Override
                </Badge>
              )}
            </div>
            <Select
              value={formData.category}
              onValueChange={(value) => handleUpdate('category', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Sea Moss Gels">Sea Moss Gels</SelectItem>
                <SelectItem value="Lemonades & Juices">Lemonades & Juices</SelectItem>
                <SelectItem value="Wellness Shots">Wellness Shots</SelectItem>
                <SelectItem value="Herbal Blends & Teas">Herbal Blends & Teas</SelectItem>
                <SelectItem value="Bundles & Seasonal">Bundles & Seasonal</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Manually set categories will persist even when syncing from Square
            </p>
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="price">Price ($)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => handleUpdate('price', parseFloat(e.target.value))}
              placeholder="0.00"
            />
          </div>

          {/* Product Metadata */}
          <div className="pt-4 border-t">
            <h3 className="font-semibold mb-3">Product Metadata</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Square ID:</span>
                <p className="font-mono text-xs mt-1">{product.squareId || product.id}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Intelligent Category:</span>
                <Badge className="mt-1">{product.intelligentCategory}</Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Last Synced:</span>
                <p className="text-xs mt-1">
                  {product.syncedAt ? new Date(product.syncedAt).toLocaleString() : 'Never'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Source:</span>
                <p className="text-xs mt-1">{product.source || 'square_sync'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sync Information */}
      <Card>
        <CardHeader>
          <CardTitle>Sync Information</CardTitle>
          <CardDescription>
            Understand how changes are synced between admin, database, and Square
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
              <div>
                <p className="font-medium">Save Changes</p>
                <p className="text-sm text-muted-foreground">
                  Updates the local database (unified_products collection) immediately
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium">Sync to Square</p>
                <p className="text-sm text-muted-foreground">
                  Pushes changes to Square Catalog API and updates the catalog
                </p>
              </div>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-900">
                <strong>Note:</strong> Changes are saved locally first. Use "Sync to Square" to push updates to Square's catalog.
                The app will automatically use the latest data from unified_products.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
