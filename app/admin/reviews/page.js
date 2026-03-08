'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldAlert,
  Star,
  XCircle,
} from 'lucide-react';

const STATUS_FILTERS = ['pending', 'approved', 'rejected', 'all'];

function getReviewId(review) {
  if (typeof review?._id === 'string') return review._id;
  if (typeof review?._id?.$oid === 'string') return review._id.$oid;
  return '';
}

function getReviewStatus(review) {
  if (review?.hidden) return 'hidden';
  if (review?.rejected) return 'rejected';
  if (review?.approved) return 'approved';
  return 'pending';
}

function formatDate(value) {
  if (!value) return 'Unknown date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleString();
}

export default function AdminReviewsPage() {
  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0, avgRating: 0 });
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);

  const fetchReviews = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100', page: '1' });
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      const response = await adminFetch(`/api/admin/reviews?${params.toString()}`);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch reviews');
      }

      setReviews(Array.isArray(data.reviews) ? data.reviews : []);
      setStats(data.stats || { total: 0, pending: 0, approved: 0, rejected: 0, avgRating: 0 });
    } catch (error) {
      logger.error('AdminReviews', 'Failed to fetch review queue', error);
      toast.error('Could not load reviews right now');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [statusFilter]);

  const filteredReviews = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return reviews;

    return reviews.filter((review) => {
      const haystack = [
        review.name,
        review.email,
        review.productName,
        review.productId,
        review.title,
        review.comment,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [reviews, searchQuery]);

  const runAction = async (review, action) => {
    const reviewId = getReviewId(review);
    if (!reviewId) {
      toast.error('Missing review identifier');
      return;
    }

    setActioningId(reviewId);
    try {
      const response = await adminFetch(`/api/admin/reviews/${reviewId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update review');
      }

      const successCopy = {
        approve: 'Review approved and now visible on the site.',
        reject: 'Review rejected.',
        hide: 'Review hidden from public view.',
        unhide: 'Review restored to public visibility.',
      };

      toast.success(successCopy[action] || 'Review updated');
      await fetchReviews({ silent: true });
    } catch (error) {
      logger.error('AdminReviews', 'Failed to update review', error);
      toast.error(error.message || 'Could not update review');
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Review Moderation</h1>
          <p className="text-muted-foreground mt-1">Submitted reviews stay pending until approved. Pending reviews are not shown publicly.</p>
        </div>
        <Button
          variant="outline"
          onClick={() => fetchReviews()}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Queue
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 dark:border-amber-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-amber-600" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-700">{stats.pending || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 dark:border-emerald-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-700">{stats.approved || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-700">{stats.rejected || 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Filter Moderation Queue
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((value) => (
              <Button
                key={value}
                type="button"
                variant={statusFilter === value ? 'default' : 'outline'}
                onClick={() => setStatusFilter(value)}
                className="capitalize"
              >
                {value}
              </Button>
            ))}
          </div>
          <Input
            placeholder="Search by customer, email, product, or review text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3" />
            Loading reviews...
          </CardContent>
        </Card>
      ) : filteredReviews.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="font-medium">No reviews found for this filter</p>
            <p className="text-sm text-muted-foreground mt-1">Try another status filter or search query.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review) => {
            const reviewId = getReviewId(review);
            const status = getReviewStatus(review);
            const isUpdating = actioningId === reviewId;

            return (
              <Card key={reviewId || `${review.email}-${review.createdAt}`} className="hover-lift">
                <CardContent className="p-5 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-lg">{review.title || 'Untitled review'}</h3>
                      <p className="text-sm text-muted-foreground">
                        {review.name || 'Unknown customer'} • {review.email || 'No email'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {review.productName || review.productId || 'Unknown product'} • Submitted {formatDate(review.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={status === 'approved' ? 'default' : status === 'rejected' ? 'destructive' : 'secondary'} className="capitalize">
                        {status}
                      </Badge>
                      {review.verifiedPurchase && (
                        <Badge variant="outline" className="gap-1">
                          <ShieldAlert className="h-3 w-3" />
                          Verified Purchase
                        </Badge>
                      )}
                      <Badge variant="outline" className="gap-1">
                        <Star className="h-3 w-3 text-amber-500" />
                        {Number(review.rating || 0).toFixed(1)}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{review.comment || 'No review text provided.'}</p>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => runAction(review, 'approve')}
                      disabled={isUpdating || review.approved === true}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                      Approve
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => runAction(review, 'reject')}
                      disabled={isUpdating || review.rejected === true}
                    >
                      Reject
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => runAction(review, review.hidden ? 'unhide' : 'hide')}
                      disabled={isUpdating}
                    >
                      {review.hidden ? <Eye className="h-4 w-4 mr-1" /> : <EyeOff className="h-4 w-4 mr-1" />}
                      {review.hidden ? 'Unhide' : 'Hide'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
