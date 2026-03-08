'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import StarRating from '@/components/StarRating';
import { MessageSquare, ThumbsUp, ThumbsDown, Award, Loader2, CheckCircle2, ChevronDown, Star } from 'lucide-react';
import { toast } from 'sonner';

export function RatingBadge({ avgRating, count, size = 'default' }) {
  const sizes = { small: 12, default: 16, large: 20 };
  const iconSize = sizes[size] || sizes.default;
  return (
    <div className={`flex items-center gap-1.5 ${size === 'small' ? 'text-xs' : size === 'large' ? 'text-base' : 'text-sm'}`}>
      <StarRating rating={avgRating} readonly size={iconSize} />
      <span className="font-semibold text-gray-900">{Number(avgRating).toFixed(1)}</span>
      <span className="text-muted-foreground">({count})</span>
    </div>
  );
}

export default function ProductReviews({
  productId,
  productName,
  compact = false,
  autoOpenForm = false,
  reviewHeading = 'Customer Reviews',
  reviewSubheading = 'Share your thoughts about this product...'
}) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    rating: 0,
    title: '',
    comment: '',
  });

  const [showAllReviews, setShowAllReviews] = useState(false);
  const [votingReviewId, setVotingReviewId] = useState(null);

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  useEffect(() => {
    if (autoOpenForm) {
      setShowForm(true);
    }
  }, [autoOpenForm]);

  const fetchReviews = async () => {
    try {
      const response = await fetch(`/api/reviews?productId=${encodeURIComponent(productId)}`);
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setReviews(data.reviews || []);
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!productId) {
      toast.error('Could not determine which product to review. Please refresh and try again.');
      return;
    }

    const sanitized = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      title: formData.title.trim(),
      comment: formData.comment.trim(),
    };

    if (!sanitized.name || !sanitized.email || !sanitized.title || !sanitized.comment) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.rating === 0) {
      toast.error('Please select a star rating');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...sanitized,
          rating: formData.rating,
          productId,
          productName,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        const pointsEarned = Number.isFinite(data.pointsEarned) ? data.pointsEarned : 10;
        const pendingCopy = data.reviewStatus === 'pending_moderation'
          ? 'It will appear after approval.'
          : 'It may take a moment to appear publicly.';
        toast.success(
          `🎉 Review submitted! ${pendingCopy} You earned ${pointsEarned} reward points!`,
          { duration: 5000 }
        );
        setFormData({ name: '', email: '', rating: 0, title: '', comment: '' });
        setShowForm(false);
        fetchReviews();
      } else {
        const fallbackMessage = response.status === 429
          ? 'Too many attempts. Please wait before submitting again.'
          : 'Failed to submit review';
        toast.error(data.error || fallbackMessage);
      }
    } catch (error) {
      console.error('Review submission error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const ratingBreakdown = [5, 4, 3, 2, 1].map(stars => ({
    stars,
    count: reviews.filter(r => r.rating === stars).length,
    percent: reviews.length === 0 ? 0 : (reviews.filter(r => r.rating === stars).length / reviews.length) * 100,
  }));

  const sortedReviews = [...reviews].sort((a, b) => (b.helpful || 0) - (a.helpful || 0));
  const topReviews = sortedReviews.slice(0, 3);
  const remainingReviews = sortedReviews.slice(3);

  const handleHelpfulVote = async (reviewId, isHelpful) => {
    if (!reviewId) {
      toast.error('This review is unavailable for feedback.');
      return;
    }

    if (votingReviewId === reviewId) {
      return;
    }

    setVotingReviewId(reviewId);

    try {
      const response = await fetch('/api/reviews/helpful', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, helpful: isHelpful }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        toast.success(isHelpful ? 'Thanks for your feedback!' : 'Feedback recorded');
        await fetchReviews();
        return;
      }

      const fallbackMessage = response.status === 429
        ? 'Too many votes right now. Please wait and try again.'
        : 'Could not submit feedback';
      toast.error(data.error || fallbackMessage);
    } catch {
      toast.error('Could not submit feedback');
    } finally {
      setVotingReviewId((current) => (current === reviewId ? null : current));
    }
  };

  if (compact) {
    return <RatingBadge avgRating={avgRating} count={reviews.length} />;
  }

  return (
    <div className="space-y-6">
      {/* Reviews Summary */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-6 border border-emerald-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-emerald-900 mb-2">{reviewHeading}</h3>
            <div className="flex items-center gap-3">
              <StarRating rating={avgRating} readonly size={20} />
              <span className="text-lg font-semibold text-emerald-800">
                {avgRating.toFixed(1)} out of 5
              </span>
              <span className="text-muted-foreground">({reviews.length} reviews)</span>
            </div>
            {reviews.length > 0 && (
              <div className="mt-3 space-y-1.5 w-full md:w-auto md:min-w-[200px]">
                {ratingBreakdown.map(({ stars, count, percent }) => (
                  <div key={stars} className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600 w-8 text-right">{stars}★</span>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden min-w-[80px]">
                      <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${percent}%` }} />
                    </div>
                    <span className="text-gray-500 w-10 text-right text-xs">
                      {count > 0 ? `${Math.round(percent)}%` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-emerald-600 hover:bg-emerald-700"
            size="lg"
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Write a Review
          </Button>
        </div>
      </div>

      {/* Review Form */}
      {showForm && (
        <div className="bg-white rounded-lg p-6 border border-emerald-100">
          <h4 className="text-xl font-bold text-emerald-900 mb-4">Share Your Experience</h4>
          <div className="mb-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-start gap-2">
              <Award className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-yellow-900">Earn 10 Reward Points!</p>
                <p className="text-xs text-yellow-700">Leave a review and get points towards exclusive rewards</p>
              </div>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email *</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Rating *</label>
              <StarRating
                rating={formData.rating}
                onRate={(rating) => setFormData({ ...formData, rating })}
                size={32}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Review Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="Sum up your experience"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Your Review *</label>
              <Textarea
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                required
                rows={4}
                placeholder={reviewSubheading}
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Submit Review
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Reviews List */}
      {loading ? (
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-600" />
          <p className="text-muted-foreground mt-2">Loading reviews...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-3" />
          <p className="text-lg font-medium text-gray-600">No reviews yet</p>
          <p className="text-muted-foreground">Be the first to share your experience!</p>
          <p className="text-xs text-gray-500 mt-2">Recently submitted reviews can take a short moderation window before they appear publicly.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-900">Top Reviews</h3>
          {topReviews.map((review) => (
            <ReviewCard
              key={review._id}
              review={review}
              onHelpfulVote={handleHelpfulVote}
              isVoting={votingReviewId === review._id}
            />
          ))}

          {remainingReviews.length > 0 && (
            <>
              <button
                onClick={() => setShowAllReviews(!showAllReviews)}
                className="w-full flex items-center justify-center gap-2 py-3 text-emerald-600 font-semibold hover:bg-emerald-50 rounded-lg transition"
              >
                {showAllReviews ? 'Show Less' : `View All ${reviews.length} Reviews`}
                <ChevronDown className={`h-5 w-5 transition-transform ${showAllReviews ? 'rotate-180' : ''}`} />
              </button>

              {showAllReviews && (
                <div className="space-y-4">
                  {remainingReviews.map((review) => (
                    <ReviewCard
                      key={review._id}
                      review={review}
                      onHelpfulVote={handleHelpfulVote}
                      isVoting={votingReviewId === review._id}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ReviewCard({ review, onHelpfulVote, isVoting }) {
  const isVerified = Boolean(review.verifiedPurchase || review.verified);

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200 hover:border-emerald-200 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-gray-900">{review.name}</span>
            {isVerified && (
              <Badge variant="secondary" className="text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            )}
          </div>
          <StarRating rating={review.rating} readonly size={16} />
        </div>
        <span className="text-sm text-muted-foreground">
          {new Date(review.createdAt).toLocaleDateString()}
        </span>
      </div>

      <h4 className="font-semibold text-gray-900 mb-2">{review.title}</h4>
      <p className="text-gray-700 leading-relaxed">{review.comment}</p>

      <div className="mt-3 pt-3 border-t flex items-center gap-4">
        <button
          type="button"
          onClick={() => onHelpfulVote(review._id, true)}
          disabled={isVoting}
          className="text-sm text-muted-foreground hover:text-emerald-600 transition inline-flex items-center gap-1"
        >
          <ThumbsUp className="h-4 w-4" />
          {isVoting ? 'Submitting...' : `Helpful${review.helpful > 0 ? ` (${review.helpful})` : ''}`}
        </button>
        <button
          type="button"
          onClick={() => onHelpfulVote(review._id, false)}
          disabled={isVoting}
          className="text-sm text-muted-foreground hover:text-red-500 transition inline-flex items-center gap-1"
        >
          <ThumbsDown className="h-4 w-4" />
          {isVoting ? 'Submitting...' : 'Not Helpful'}
        </button>
      </div>
    </div>
  );
}
