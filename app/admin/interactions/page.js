'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Film, Loader2, Radio, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';

const TYPE_OPTIONS = [
  { value: 'video_review', label: 'Video Review' },
  { value: 'customer_experience', label: 'Customer Experience' },
  { value: 'event_moment', label: 'Event Moment' }
];

export default function AdminInteractionsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [interactions, setInteractions] = useState([]);
  const [form, setForm] = useState({
    type: 'event_moment',
    title: '',
    customerName: '',
    text: '',
    mediaUrl: '',
    sourceUrl: '',
    sourcePlatform: '',
    published: true,
    featured: false
  });

  const publishedCount = useMemo(
    () => interactions.filter((interaction) => interaction.published).length,
    [interactions]
  );

  useEffect(() => {
    fetchInteractions();
  }, []);

  async function fetchInteractions() {
    try {
      const response = await adminFetch('/api/admin/interactions?includeDrafts=true&limit=100');
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load interactions');
      }
      setInteractions(data.interactions || []);
    } catch (error) {
      toast.error(error.message || 'Failed to load interactions');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);

    try {
      const response = await adminFetch('/api/admin/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to publish interaction');
      }

      toast.success(form.published ? 'Interaction published' : 'Interaction saved as draft');
      setForm({
        type: 'event_moment',
        title: '',
        customerName: '',
        text: '',
        mediaUrl: '',
        sourceUrl: '',
        sourcePlatform: '',
        published: true,
        featured: false
      });
      fetchInteractions();
    } catch (error) {
      toast.error(error.message || 'Failed to save interaction');
    } finally {
      setSaving(false);
    }
  }

  async function toggleField(id, updates) {
    try {
      const response = await adminFetch(`/api/admin/interactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update interaction');
      }

      fetchInteractions();
    } catch (error) {
      toast.error(error.message || 'Update failed');
    }
  }

  async function removeInteraction(id) {
    try {
      const response = await adminFetch(`/api/admin/interactions/${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete interaction');
      }

      toast.success('Interaction deleted');
      fetchInteractions();
    } catch (error) {
      toast.error(error.message || 'Delete failed');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Live Interactions</h1>
        <p className="text-muted-foreground mt-1">
          Post video reviews and customer moments in seconds during or after events.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase text-muted-foreground mb-2">Total</p>
            <p className="text-3xl font-bold">{interactions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase text-muted-foreground mb-2">Published</p>
            <p className="text-3xl font-bold text-emerald-600">{publishedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase text-muted-foreground mb-2">Drafts</p>
            <p className="text-3xl font-bold text-amber-600">{interactions.length - publishedCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-amber-600" />
            Quick Publish
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Type</label>
                <select
                  className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={form.type}
                  onChange={(event) => setForm({ ...form, type: event.target.value })}
                >
                  {TYPE_OPTIONS.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Customer Name</label>
                <Input
                  value={form.customerName}
                  onChange={(event) => setForm({ ...form, customerName: event.target.value })}
                  placeholder="Customer or creator name"
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  placeholder="Freshly posted from Saturday market"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Platform (optional)</label>
                <Input
                  value={form.sourcePlatform}
                  onChange={(event) => setForm({ ...form, sourcePlatform: event.target.value })}
                  placeholder="Instagram, TikTok, In-person"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Interaction Text</label>
              <Textarea
                value={form.text}
                onChange={(event) => setForm({ ...form, text: event.target.value })}
                rows={3}
                placeholder="Customer reaction, quote, or what happened at the event"
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Video/Media URL (optional)</label>
                <Input
                  type="url"
                  value={form.mediaUrl}
                  onChange={(event) => setForm({ ...form, mediaUrl: event.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="text-sm font-medium">Source URL (optional)</label>
                <Input
                  type="url"
                  value={form.sourceUrl}
                  onChange={(event) => setForm({ ...form, sourceUrl: event.target.value })}
                  placeholder="Original post link"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-1">
              <label className="text-sm inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(event) => setForm({ ...form, published: event.target.checked })}
                />
                Publish now
              </label>
              <label className="text-sm inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(event) => setForm({ ...form, featured: event.target.checked })}
                />
                Feature on top
              </label>
            </div>

            <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Radio className="h-4 w-4 mr-2" />}
              {form.published ? 'Publish Interaction' : 'Save Draft'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Film className="h-5 w-5 text-emerald-700" />
            Posted Interactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
              Loading interactions...
            </div>
          ) : interactions.length === 0 ? (
            <p className="text-muted-foreground">No interactions yet.</p>
          ) : (
            <div className="space-y-4">
              {interactions.map((interaction) => (
                <div key={interaction.id} className="border rounded-lg p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-lg">{interaction.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {interaction.customerName}
                        {interaction.sourcePlatform ? ` • ${interaction.sourcePlatform}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={interaction.published ? 'default' : 'secondary'}>
                        {interaction.published ? 'Published' : 'Draft'}
                      </Badge>
                      {interaction.featured && <Badge className="bg-amber-500">Featured</Badge>}
                    </div>
                  </div>

                  <p className="text-sm mt-3">{interaction.text}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleField(interaction.id, { published: !interaction.published })}
                    >
                      {interaction.published ? 'Unpublish' : 'Publish'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleField(interaction.id, { featured: !interaction.featured })}
                    >
                      {interaction.featured ? 'Unfeature' : 'Feature'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => removeInteraction(interaction.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
