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
  const [publishing, setPublishing] = useState(false);
  
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

  const handlePublish = async () => {
    setPublishing(true);
    try {
      // Step 1: Save to DB
      const saveResponse = await fetch(`/api/admin/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: formData })
      });
      const saveData = await saveResponse.json();
      if (!saveData.success) {
        toast.error(saveData.error || 'Failed to save');
        return;
      }

      // Step 2: Sync to Square (which also triggers revalidation)
      const syncResponse = await fetch(`/api/admin/products/${productId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: formData,
          direction: 'to_square'
        })
      });
      const syncData = await syncResponse.json();

      if (syncData.success) {
        toast.success('Published! Changes are live on the site.');
        fetchProduct();
      } else {
        toast.warning('Saved locally but Square sync failed: ' + (syncData.error || 'Unknown error'));
      }
    } catch (error) {
      logger.error('Admin', 'Publish error', error);
      toast.error('Failed to publish');
    } finally {
      setPublishing(false);
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
            onClick={handleSave}
            disabled={saving || syncing || publishing}
            variant="outline"
            size="sm"
          >
            {saving ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Draft
              </>
            )}
          </Button>
          <Button
            onClick={handlePublish}
            disabled={publishing || saving || syncing}
            className="bg-[#D4AF37] hover:bg-[#B8941F] text-white"
          >
            {publishing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Publish to Site
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

      {/* Publish Information */}
      <Card>
        <CardHeader>
          <CardTitle>How Publishing Works</CardTitle>
          <CardDescription>
            Changes go live on your site instantly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-[#D4AF37] mt-0.5" />
              <div>
                <p className="font-medium">Publish to Site</p>
                <p className="text-sm text-muted-foreground">
                  Saves to database, syncs to Square, and refreshes the live site — all in one click. Changes appear instantly.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
              <div>
                <p className="font-medium">Save Draft</p>
                <p className="text-sm text-muted-foreground">
                  Saves changes locally without pushing to Square or the live site. Use for work-in-progress edits.
                </p>
              </div>
            </div>
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-sm text-emerald-900">
                <strong>💡 Square Dashboard changes are also instant.</strong> Any product updates made directly in your Square Dashboard will automatically appear on your site within seconds via webhooks.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
