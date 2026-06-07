'use client';

export const dynamic = 'force-dynamic';

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
  Edit,
  Trash2,
  Plus,
  RefreshCw,
  Image as ImageIcon,
  Calendar,
  CheckCircle,
} from 'lucide-react';
import { createMenuSchema } from '@/lib/menus/schema';
import type { AdminMenu } from '@/lib/menus/types';
import type { CreateMenuInput } from '@/lib/menus/schema';
import type { AdminMarket } from '@/lib/markets/types';

const INITIAL_FORM_STATE: CreateMenuInput = {
  title: '',
  description: '',
  imageUrl: '',
  thumbnailUrl: '',
  marketId: '',
  weekStart: '',
  weekEnd: '',
  isActive: false,
  linkedProducts: [],
};

interface FormErrors {
  [key: string]: string | undefined;
}

function formatDateRange(start: string, end: string): string {
  try {
    const s = new Date(start);
    const e = new Date(end);
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const yearOpts: Intl.DateTimeFormatOptions = { ...opts, year: 'numeric' };
    if (s.getFullYear() !== e.getFullYear()) {
      return `${s.toLocaleDateString('en-US', yearOpts)} – ${e.toLocaleDateString('en-US', yearOpts)}`;
    }
    return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', yearOpts)}`;
  } catch {
    return `${start} – ${end}`;
  }
}

export default function MenusPage() {
  const [menus, setMenus] = useState<AdminMenu[]>([]);
  const [markets, setMarkets] = useState<AdminMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<AdminMenu | null>(null);
  const [menuToDelete, setMenuToDelete] = useState<AdminMenu | null>(null);
  const [formData, setFormData] = useState<CreateMenuInput>(INITIAL_FORM_STATE);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchMenus = useCallback(async () => {
    try {
      const result = await adminFetch<{ success: boolean; menus: AdminMenu[]; error?: string }>('/api/admin/menus', { skipCsrf: true });
      if (result.success && result.data) {
        setMenus(result.data.menus || []);
      } else {
        throw new Error(result.error || 'Failed to fetch menus');
      }
    } catch (error) {
      logger.error('Admin', 'Failed to fetch menus', error);
      toast.error('Failed to load menus');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMarkets = useCallback(async () => {
    try {
      const result = await adminFetch<{ success: boolean; markets: AdminMarket[]; error?: string }>('/api/admin/markets', { skipCsrf: true });
      if (result.success && result.data) {
        setMarkets(result.data.markets || []);
      }
    } catch {
      // Markets are optional for the menu form
    }
  }, []);

  useEffect(() => {
    fetchMenus();
    fetchMarkets();
  }, [fetchMenus, fetchMarkets]);

  const validateForm = (): boolean => {
    const result = createMenuSchema.safeParse(formData);
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
      const url = '/api/admin/menus';
      const method = editingMenu ? 'PUT' : 'POST';
      const body = editingMenu
        ? { menuId: editingMenu.id, ...formData }
        : formData;

      const result = await adminFetch<{ success: boolean; menu: AdminMenu; error?: string }>(url, {
        method,
        body: JSON.stringify(body),
      });

      if (!result.success) {
        throw new Error(result.error || 'Request failed');
      }

      if (editingMenu && result.data) {
        setMenus((prev) =>
          prev.map((m) => (m.id === editingMenu.id ? result.data!.menu : m))
        );
        toast.success('Menu updated successfully');
      } else if (result.data) {
        setMenus((prev) => [result.data!.menu, ...prev]);
        toast.success('Menu created successfully');
      }

      handleCloseDialog();
    } catch (error: any) {
      logger.error('Admin', 'Save menu failed', error);
      toast.error(error.message || 'Failed to save menu');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetActive = async (menu: AdminMenu) => {
    const prevMenus = menus;

    // Optimistic update
    setMenus((prev) =>
      prev.map((m) => ({
        ...m,
        isActive: m.id === menu.id,
      }))
    );

    try {
      const result = await adminFetch<{ success: boolean; error?: string }>('/api/admin/menus', {
        method: 'POST',
        body: JSON.stringify({ action: 'setActive', menuId: menu.id }),
      });

      if (!result.success) {
        throw new Error(result.error || 'Update failed');
      }

      toast.success(`"${menu.title}" set as active menu`);
    } catch (error) {
      setMenus(prevMenus);
      logger.error('Admin', 'Set active menu failed', error);
      toast.error('Failed to set active menu');
    }
  };

  const handleDelete = async () => {
    if (!menuToDelete) return;

    const menuId = menuToDelete.id;
    const prevMenus = menus;

    // Optimistic remove
    setMenus((prev) => prev.filter((m) => m.id !== menuId));
    setDeleteDialogOpen(false);
    setMenuToDelete(null);

    try {
      const result = await adminFetch<{ success: boolean; error?: string }>('/api/admin/menus', {
        method: 'DELETE',
        body: JSON.stringify({ menuId }),
      });

      if (!result.success) {
        throw new Error(result.error || 'Delete failed');
      }

      toast.success('Menu deleted successfully');
    } catch (error) {
      setMenus(prevMenus);
      logger.error('Admin', 'Delete menu failed', error);
      toast.error('Failed to delete menu');
    }
  };

  const handleOpenEdit = (menu: AdminMenu) => {
    setEditingMenu(menu);
    setFormData({
      title: menu.title,
      description: menu.description || '',
      imageUrl: menu.imageUrl,
      thumbnailUrl: menu.thumbnailUrl || '',
      marketId: menu.marketId || '',
      weekStart: menu.weekStart ? menu.weekStart.split('T')[0] : '',
      weekEnd: menu.weekEnd ? menu.weekEnd.split('T')[0] : '',
      isActive: menu.isActive,
      linkedProducts: menu.linkedProducts || [],
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingMenu(null);
    setFormData(INITIAL_FORM_STATE);
    setFormErrors({});
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingMenu(null);
    setFormData(INITIAL_FORM_STATE);
    setFormErrors({});
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingMenu(null);
      setFormErrors({});
      if (!submitting) {
        setFormData(INITIAL_FORM_STATE);
      }
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const filteredMenus = menus.filter((menu) => {
    const q = searchQuery.toLowerCase();
    return (
      menu.title.toLowerCase().includes(q) ||
      (menu.description || '').toLowerCase().includes(q)
    );
  });

  const getMarketName = (marketId?: string) => {
    if (!marketId) return null;
    const market = markets.find((m) => m.id === marketId);
    return market?.name || null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Menus</h1>
          <p className="text-muted-foreground mt-1">
            Manage your weekly menus – {menus.length} total
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Menu
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search menus..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            aria-label="Search menus"
          />
        </div>
        <Button variant="outline" onClick={fetchMenus} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Menus Grid */}
      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Loading menus...</p>
        </div>
      ) : filteredMenus.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? 'No menus found matching your search.'
                : 'No menus yet. Create your first weekly menu.'}
            </p>
            {!searchQuery && menus.length === 0 && (
              <Button onClick={handleOpenCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Create Menu
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMenus.map((menu) => (
            <Card key={menu.id} className="overflow-hidden hover:shadow-md transition-shadow">
              {/* Thumbnail */}
              {(menu.thumbnailUrl || menu.imageUrl) && (
                <div className="aspect-video bg-muted overflow-hidden">
                  <img
                    src={menu.thumbnailUrl || menu.imageUrl}
                    alt={menu.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ImageIcon className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <span className="line-clamp-1">{menu.title}</span>
                  </CardTitle>
                  <Badge
                    variant={menu.isActive ? 'default' : 'secondary'}
                    className={
                      menu.isActive
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : ''
                    }
                  >
                    {menu.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{formatDateRange(menu.weekStart, menu.weekEnd)}</span>
                </div>

                {menu.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {menu.description}
                  </p>
                )}

                {getMarketName(menu.marketId) && (
                  <p className="text-xs text-muted-foreground">
                    Market: {getMarketName(menu.marketId)}
                  </p>
                )}

                <div className="flex items-center justify-between gap-2 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(menu)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  {!menu.isActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetActive(menu)}
                      className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-900/20"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Set Active
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                    onClick={() => {
                      setMenuToDelete(menu);
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
              {editingMenu ? 'Edit Menu' : 'Create New Menu'}
            </DialogTitle>
            <DialogDescription>
              {editingMenu
                ? 'Update the menu information below.'
                : 'Enter the details for the new weekly menu.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Week of June 2, 2026"
                  className={formErrors.title ? 'border-red-500' : ''}
                />
                {formErrors.title && (
                  <p className="text-xs text-red-500">{formErrors.title}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="imageUrl">Menu Image URL *</Label>
                <p className="text-xs text-muted-foreground">Paste a public Canva export or image URL. For best results, use a vertical PNG/JPG.</p>
                <Input
                  id="imageUrl"
                  name="imageUrl"
                  type="url"
                  value={formData.imageUrl}
                  onChange={handleInputChange}
                  placeholder="https://example.com/menu-image.png"
                  className={formErrors.imageUrl ? 'border-red-500' : ''}
                />
                {formErrors.imageUrl && (
                  <p className="text-xs text-red-500">{formErrors.imageUrl}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="thumbnailUrl">Thumbnail URL (optional)</Label>
                <Input
                  id="thumbnailUrl"
                  name="thumbnailUrl"
                  type="url"
                  value={formData.thumbnailUrl}
                  onChange={handleInputChange}
                  placeholder="https://example.com/menu-thumb.png"
                  className={formErrors.thumbnailUrl ? 'border-red-500' : ''}
                />
                {formErrors.thumbnailUrl && (
                  <p className="text-xs text-red-500">{formErrors.thumbnailUrl}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="weekStart">Week Start (Monday) *</Label>
                <Input
                  id="weekStart"
                  name="weekStart"
                  type="date"
                  value={formData.weekStart}
                  onChange={handleInputChange}
                  className={formErrors.weekStart ? 'border-red-500' : ''}
                />
                {formErrors.weekStart && (
                  <p className="text-xs text-red-500">{formErrors.weekStart}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="weekEnd">Week End (Sunday) *</Label>
                <Input
                  id="weekEnd"
                  name="weekEnd"
                  type="date"
                  value={formData.weekEnd}
                  onChange={handleInputChange}
                  className={formErrors.weekEnd ? 'border-red-500' : ''}
                />
                {formErrors.weekEnd && (
                  <p className="text-xs text-red-500">{formErrors.weekEnd}</p>
                )}
              </div>

              {markets.length > 0 && (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="marketId">Market (optional)</Label>
                  <select
                    id="marketId"
                    name="marketId"
                    value={formData.marketId || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, marketId: e.target.value }))
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">All markets</option>
                    {markets.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                placeholder="This week featuring our seasonal summer specials..."
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
                ) : editingMenu ? (
                  'Save Changes'
                ) : (
                  'Create Menu'
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
            <AlertDialogTitle>Delete Menu</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{menuToDelete?.title}&quot;? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMenuToDelete(null)}>
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
