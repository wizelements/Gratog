'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Search,
  MapPin,
  Edit,
  Trash2,
  Plus,
  RefreshCw,
  ExternalLink,
  Clock,
  Calendar,
} from 'lucide-react';
import { createMarketSchema } from '@/lib/markets/schema';
import { DAY_OF_WEEK_LABELS } from '@/lib/markets/types';
import type { AdminMarket } from '@/lib/markets/types';
import type { CreateMarketInput } from '@/lib/markets/schema';

const INITIAL_FORM_STATE: CreateMarketInput = {
  name: '',
  address: '',
  city: '',
  state: 'GA',
  zip: '',
  lat: 33.749,
  lng: -84.388,
  hours: '09:00-13:00',
  dayOfWeek: 6,
  description: '',
  mapsUrl: '',
  isActive: true,
  featured: false,
};

interface FormErrors {
  [key: string]: string | undefined;
}

export default function MarketsPage() {
  const [markets, setMarkets] = useState<AdminMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingMarket, setEditingMarket] = useState<AdminMarket | null>(null);
  const [marketToDelete, setMarketToDelete] = useState<AdminMarket | null>(null);
  const [formData, setFormData] = useState<CreateMarketInput>(INITIAL_FORM_STATE);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const fetchMarkets = useCallback(async () => {
    try {
      const result = await adminFetch<{ success: boolean; markets: AdminMarket[]; error?: string }>('/api/admin/markets', { skipCsrf: true });
      if (result.success && result.data) {
        setMarkets(result.data.markets || []);
      } else {
        throw new Error(result.error || 'Failed to fetch markets');
      }
    } catch (error) {
      logger.error('Admin', 'Failed to fetch markets', error);
      toast.error('Failed to load markets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarkets();
  }, [fetchMarkets]);

  const validateForm = (): boolean => {
    const result = createMarketSchema.safeParse(formData);
    if (!result.success) {
      const errors: FormErrors = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        errors[field] = err.message;
      });
      setFormErrors(errors);
      return false;
    }
    setFormErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    setSubmitting(true);

    try {
      const url = '/api/admin/markets';
      const method = editingMarket ? 'PUT' : 'POST';
      const body = editingMarket
        ? { marketId: editingMarket.id, ...formData }
        : formData;

      const result = await adminFetch<{ success: boolean; market: AdminMarket; error?: string }>(url, {
        method,
        body: JSON.stringify(body),
      });

      if (!result.success) {
        throw new Error(result.error || 'Request failed');
      }

      if (editingMarket && result.data) {
        setMarkets((prev) =>
          prev.map((m) => (m.id === editingMarket.id ? result.data!.market : m))
        );
        toast.success('Market updated successfully');
      } else if (result.data) {
        setMarkets((prev) => [result.data!.market, ...prev]);
        toast.success('Market created successfully');
      }

      handleCloseDialog();
    } catch (error: any) {
      logger.error('Admin', 'Save market failed', error);
      toast.error(error.message || 'Failed to save market');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (market: AdminMarket) => {
    const newStatus = !market.isActive;

    // Optimistic update
    setMarkets((prev) =>
      prev.map((m) => (m.id === market.id ? { ...m, isActive: newStatus } : m))
    );

    try {
      const result = await adminFetch<{ success: boolean; error?: string }>('/api/admin/markets', {
        method: 'PUT',
        body: JSON.stringify({ marketId: market.id, isActive: newStatus }),
      });

      if (!result.success) {
        throw new Error(result.error || 'Update failed');
      }

      toast.success(`Market ${newStatus ? 'activated' : 'deactivated'}`);
    } catch (error) {
      // Rollback on error
      setMarkets((prev) =>
        prev.map((m) =>
          m.id === market.id ? { ...m, isActive: market.isActive } : m
        )
      );
      logger.error('Admin', 'Toggle active failed', error);
      toast.error('Failed to update market status');
    }
  };

  const handleDelete = async () => {
    if (!marketToDelete) return;

    const marketId = marketToDelete.id;
    const prevMarkets = markets;

    // Optimistic remove
    setMarkets((prev) => prev.filter((m) => m.id !== marketId));
    setDeleteDialogOpen(false);
    setMarketToDelete(null);

    try {
      const result = await adminFetch<{ success: boolean; error?: string }>('/api/admin/markets', {
        method: 'DELETE',
        body: JSON.stringify({ marketId }),
      });

      if (!result.success) {
        throw new Error(result.error || 'Delete failed');
      }

      toast.success('Market deleted successfully');
    } catch (error) {
      // Rollback
      setMarkets(prevMarkets);
      logger.error('Admin', 'Delete market failed', error);
      toast.error('Failed to delete market');
    }
  };

  const handleSeedMarkets = async () => {
    setSeeding(true);

    try {
      const result = await adminFetch<{ success: boolean; message?: string; error?: string }>('/api/admin/markets/seed', {
        method: 'POST',
      });

      if (!result.success) {
        throw new Error(result.error || 'Seed failed');
      }

      toast.success(result.data?.message || 'Markets seeded successfully');
      await fetchMarkets();
    } catch (error: any) {
      logger.error('Admin', 'Seed markets failed', error);
      toast.error(error.message || 'Failed to seed markets');
    } finally {
      setSeeding(false);
    }
  };

  const handleOpenEdit = (market: AdminMarket) => {
    setEditingMarket(market);
    setFormData({
      name: market.name,
      address: market.address,
      city: market.city,
      state: market.state,
      zip: market.zip,
      lat: market.lat,
      lng: market.lng,
      hours: market.hours,
      dayOfWeek: market.dayOfWeek,
      description: market.description,
      mapsUrl: market.mapsUrl || '',
      isActive: market.isActive,
      featured: market.featured,
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingMarket(null);
    setFormData(INITIAL_FORM_STATE);
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingMarket(null);
    setFormData(INITIAL_FORM_STATE);
    setFormErrors({});
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingMarket(null);
      setFormErrors({});
      if (!submitting) {
        setFormData(INITIAL_FORM_STATE);
      }
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'number' ? parseFloat(value) || 0 : value,
    }));
    // Clear error on change
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'dayOfWeek' ? parseInt(value) : value,
    }));
  };

  const filteredMarkets = markets.filter((market) => {
    const q = searchQuery.toLowerCase();
    return (
      market.name.toLowerCase().includes(q) ||
      market.city.toLowerCase().includes(q) ||
      market.description.toLowerCase().includes(q)
    );
  });

  const formatHours = (hours: string) => {
    try {
      const [start, end] = hours.split('-');
      const format = (t: string) => {
        const [h, m] = t.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const h12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        return `${h12}:${m} ${ampm}`;
      };
      return `${format(start)} - ${format(end)}`;
    } catch {
      return hours;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Markets</h1>
          <p className="text-muted-foreground mt-1">
            Manage your farmers market locations – {markets.length} total
          </p>
        </div>
        <div className="flex gap-2">
          {markets.length === 0 && (
            <Button
              variant="outline"
              onClick={handleSeedMarkets}
              disabled={seeding}
            >
              {seeding ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Seeding...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Seed Defaults
                </>
              )}
            </Button>
          )}
          <Button onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Market
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search markets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            aria-label="Search markets"
          />
        </div>
        <Button variant="outline" onClick={fetchMarkets} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Markets Grid */}
      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Loading markets...</p>
        </div>
      ) : filteredMarkets.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? 'No markets found matching your search.'
                : 'No markets yet. Add your first market or seed defaults.'}
            </p>
            {!searchQuery && markets.length === 0 && (
              <div className="flex justify-center gap-2">
                <Button onClick={handleSeedMarkets} variant="outline" disabled={seeding}>
                  Seed Default Markets
                </Button>
                <Button onClick={handleOpenCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Market
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMarkets.map((market) => (
            <Card key={market.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MapPin className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    <span className="line-clamp-1">{market.name}</span>
                  </CardTitle>
                  <div className="flex gap-1">
                    {market.featured && (
                      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        Featured
                      </Badge>
                    )}
                    <Badge
                      variant={market.isActive ? 'default' : 'secondary'}
                      className={
                        market.isActive
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : ''
                      }
                    >
                      {market.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {market.address}, {market.city}, {market.state} {market.zip}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{DAY_OF_WEEK_LABELS[market.dayOfWeek] || 'Saturday'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{formatHours(market.hours)}</span>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2">
                  {market.description}
                </p>

                {market.mapsUrl && (
                  <a
                    href={market.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View on Maps
                  </a>
                )}

                <div className="flex items-center justify-between gap-2 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(market)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(market)}
                  >
                    {market.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                    onClick={() => {
                      setMarketToDelete(market);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMarket ? 'Edit Market' : 'Add New Market'}
            </DialogTitle>
            <DialogDescription>
              {editingMarket
                ? 'Update the market information below.'
                : 'Enter the details for the new market location.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Market Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Serenbe Farmers Market"
                  className={formErrors.name ? 'border-red-500' : ''}
                />
                {formErrors.name && (
                  <p className="text-xs text-red-500">{formErrors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="hours">Hours (HH:MM-HH:MM) *</Label>
                <Input
                  id="hours"
                  name="hours"
                  value={formData.hours}
                  onChange={handleInputChange}
                  placeholder="09:00-13:00"
                  className={formErrors.hours ? 'border-red-500' : ''}
                />
                {formErrors.hours && (
                  <p className="text-xs text-red-500">{formErrors.hours}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Street Address *</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="10950 Hutcheson Ferry Rd"
                  className={formErrors.address ? 'border-red-500' : ''}
                />
                {formErrors.address && (
                  <p className="text-xs text-red-500">{formErrors.address}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="Palmetto"
                  className={formErrors.city ? 'border-red-500' : ''}
                />
                {formErrors.city && (
                  <p className="text-xs text-red-500">{formErrors.city}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    placeholder="GA"
                    maxLength={2}
                    className={formErrors.state ? 'border-red-500' : ''}
                  />
                  {formErrors.state && (
                    <p className="text-xs text-red-500">{formErrors.state}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP *</Label>
                  <Input
                    id="zip"
                    name="zip"
                    value={formData.zip}
                    onChange={handleInputChange}
                    placeholder="30268"
                    className={formErrors.zip ? 'border-red-500' : ''}
                  />
                  {formErrors.zip && (
                    <p className="text-xs text-red-500">{formErrors.zip}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dayOfWeek">Day of Week</Label>
                <Select
                  value={String(formData.dayOfWeek)}
                  onValueChange={(value) => handleSelectChange('dayOfWeek', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DAY_OF_WEEK_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mapsUrl">Google Maps URL</Label>
                <Input
                  id="mapsUrl"
                  name="mapsUrl"
                  type="url"
                  value={formData.mapsUrl}
                  onChange={handleInputChange}
                  placeholder="https://maps.google.com/?q=..."
                  className={formErrors.mapsUrl ? 'border-red-500' : ''}
                />
                {formErrors.mapsUrl && (
                  <p className="text-xs text-red-500">{formErrors.mapsUrl}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lat">Latitude</Label>
                <Input
                  id="lat"
                  name="lat"
                  type="number"
                  step="0.000001"
                  value={formData.lat}
                  onChange={handleInputChange}
                  placeholder="33.4848"
                  className={formErrors.lat ? 'border-red-500' : ''}
                />
                {formErrors.lat && (
                  <p className="text-xs text-red-500">{formErrors.lat}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lng">Longitude</Label>
                <Input
                  id="lng"
                  name="lng"
                  type="number"
                  step="0.000001"
                  value={formData.lng}
                  onChange={handleInputChange}
                  placeholder="-84.6860"
                  className={formErrors.lng ? 'border-red-500' : ''}
                />
                {formErrors.lng && (
                  <p className="text-xs text-red-500">{formErrors.lng}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                placeholder="Describe the market location and what customers can expect..."
                className={formErrors.description ? 'border-red-500' : ''}
              />
              {formErrors.description && (
                <p className="text-xs text-red-500">{formErrors.description}</p>
              )}
            </div>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => handleCheckboxChange('isActive', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm">Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) => handleCheckboxChange('featured', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm">Featured</span>
              </label>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingMarket ? (
                  'Save Changes'
                ) : (
                  'Create Market'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Market</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{marketToDelete?.name}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMarketToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
