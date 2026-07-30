'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import StarRating from '@/components/StarRating';
import { MessageSquare, ThumbsUp, ThumbsDown, Award, Loader2, CheckCircle2, ChevronDown, Star } from 'lucide-react';
import { toast } from 'sonner';

const LOCAL_PENDING_REVIEW_PREFIX = 'pending-reviews';

function getPendingStorageKey(productId) {
  return `${LOCAL_PENDING_REVIEW_PREFIX}:${String(productId || '').trim()}`;
}

function getReviewFingerprint(review) {
  const email = String(review?.email || '').trim().toLowerCase();
  const name = String(review?.name || '').trim().toLowerCase();
  const title = String(review?.title || '').trim().toLowerCase();
  const comment = String(review?.comment || '').trim().toLowerCase();
  const rating = Number(review?.rating || 0);
  return `${email}|${name}|${title}|${comment}|${rating}`;
}

function readPendingReviews(productId) {
  if (typeof window === 'undefined' || !productId) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(getPendingStorageKey(productId));
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((review) => review && typeof review === 'object');
  } catch {
    return [];
  }
}

function writePendingReviews(productId, pendingReviews) {
  if (typeof window === 'undefined' || !productId) {
    return;
  }

  try {
    const key = getPendingStorageKey(productId);
    if (!Array.isArray(pendingReviews) || pendingReviews.length === 0) {
      window.localStorage.removeItem(key);
      return;
    }

    window.localStorage.setItem(key, JSON.stringify(pendingReviews));
  } catch {
    // Ignore storage failures so review submission UX still works.
  }
}

function dedupePendingReviews(items) {
  const byIdentity = new Set();

  return items.filter((review) => {
    const id = String(review?._id || '').trim();
    const fingerprint = getReviewFingerprint(review);
    const key = id || `fingerprint:${fingerprint}`;

    if (!key || byIdentity.has(key)) {
      return false;
    }

    byIdentity.add(key);
    return true;
  });
}

function reconcilePendingReviews(pendingReviews, publicReviews) {
  if (!Array.isArray(pendingReviews) || pendingReviews.length === 0) {
    return [];
  }

  const publicIds = new Set(
    publicReviews
      .map((review) => String(review?._id || '').trim())
      .filter(Boolean)
  );
  const publicFingerprints = new Set(publicReviews.map((review) => getReviewFingerprint(review)));

  return pendingReviews.filter((review) => {
    const id = String(review?._id || '').trim();
    if (id && publicIds.has(id)) {
      return false;
    }

    return !publicFingerprints.has(getReviewFingerprint(review));
  });
}

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

function buildReviewSummaryFromList(reviews) {
  const safeReviews = Array.isArray(reviews) ? reviews : [];
  const ratingDistribution = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  let ratingTotal = 0;
  let verifiedCount = 0;

  for (const review of safeReviews) {
    const rating = Number(review?.rating || 0);
    if (rating >= 1 && rating <= 5) {
      ratingDistribution[rating] += 1;
      ratingTotal += rating;
    }

    if (review?.verifiedPurchase === true) {
      verifiedCount += 1;
    }
  }

  const reviewCount = safeReviews.length;

  return {
    averageRating: reviewCount > 0 ? Number((ratingTotal / reviewCount).toFixed(1)) : 0,
    reviewCount,
    ratingDistribution,
    verifiedCount,
  };
}

function normalizeReviewSummary(summary, fallbackReviews = []) {
  const fallback = buildReviewSummaryFromList(fallbackReviews);
  const source = summary && typeof summary === 'object' ? summary : {};

  return {
    averageRating: Number.isFinite(Number(source.averageRating))
      ? Number(source.averageRating)
      : fallback.averageRating,
    reviewCount: Number.isFinite(Number(source.reviewCount))
      ? Number(source.reviewCount)
      : fallback.reviewCount,
    verifiedCount: Number.isFinite(Number(source.verifiedCount))
      ? Number(source.verifiedCount)
      : fallback.verifiedCount,
    ratingDistribution: {
      1: Number(source.ratingDistribution?.[1] ?? fallback.ratingDistribution[1]),
      2: Number(source.ratingDistribution?.[2] ?? fallback.ratingDistribution[2]),
      3: Number(source.ratingDistribution?.[3] ?? fallback.ratingDistribution[3]),
      4: Number(source.ratingDistribution?.[4] ?? fallback.ratingDistribution[4]),
      5: Number(source.ratingDistribution?.[5] ?? fallback.ratingDistribution[5]),
    },
  };
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
  const [pendingReviews, setPendingReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState(() => buildReviewSummaryFromList([]));
  const [signupPrompt, setSignupPrompt] = useState({
    visible: false,
    name: '',
    email: '',
    registerHref: '',
  });

  useEffect(() => {
    setPendingReviews(readPendingReviews(productId));
  }, [productId]);

  useEffect(() => {
    setLoading(true);
    setReviewSummary(buildReviewSummaryFromList([]));
    fetchReviews();
  }, [productId]);

  useEffect(() => {
    const reconciled = reconcilePendingReviews(pendingReviews, reviews);
    if (reconciled.length !== pendingReviews.length) {
      setPendingReviews(reconciled);
      writePendingReviews(productId, reconciled);
    }
  }, [pendingReviews, productId, reviews]);

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
        const fetchedReviews = Array.isArray(data.reviews) ? data.reviews : [];
        setReviews(fetchedReviews);
        setReviewSummary(normalizeReviewSummary(data.summary, fetchedReviews));
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
        const submittedReview = {
          ...data.review,
          _id: String(data.review?._id || `pending-${Date.now()}`),
          productId,
          productName,
          name: sanitized.name,
          email: sanitized.email.toLowerCase(),
          rating: formData.rating,
          title: sanitized.title,
          comment: sanitized.comment,
          createdAt: data.review?.createdAt || new Date().toISOString(),
          verifiedPurchase: Boolean(data.review?.verifiedPurchase),
          approved: false,
          hidden: false,
          reviewStatus: data.reviewStatus || 'pending_moderation',
        };

        if (submittedReview.reviewStatus === 'pending_moderation') {
          setPendingReviews((current) => {
            const next = dedupePendingReviews([submittedReview, ...current]);
            writePendingReviews(productId, next);
            return next;
          });
        }

        const pointsEarned = Number.isFinite(data.pointsEarned) ? data.pointsEarned : 10;
        const shouldSuggestSignup =
          data.signupPrompt?.recommended === true
          || (data.pendingCustomer?.signupSuggested === true && data.review?.verifiedPurchase === false);
        const registerHref = typeof data.signupPrompt?.registerHref === 'string' && data.signupPrompt.registerHref
          ? data.signupPrompt.registerHref
          : `/register?from=review&intent=claim-rewards&name=${encodeURIComponent(sanitized.name)}&email=${encodeURIComponent(sanitized.email)}`;
        const pendingCopy = data.reviewStatus === 'pending_moderation'
          ? 'It will appear after approval.'
          : 'It may take a moment to appear publicly.';
        const signupCopy = shouldSuggestSignup
          ? ' Create a free account to save your rewards and review history.'
          : '';
        toast.success(
          `🎉 Review submitted! ${pendingCopy} You earned ${pointsEarned} reward points!${signupCopy}`,
          { duration: 5000 }
        );
        setFormData({ name: '', email: '', rating: 0, title: '', comment: '' });
        setShowForm(false);
        setSignupPrompt({
          visible: shouldSuggestSignup,
          name: sanitized.name,
          email: sanitized.email,
          registerHref,
        });
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

  const avgRating = Number.isFinite(reviewSummary.averageRating)
    ? reviewSummary.averageRating
    : 0;
  const totalReviews = Number.isFinite(reviewSummary.reviewCount)
    ? reviewSummary.reviewCount
    : reviews.length;

  const ratingBreakdown = [5, 4, 3, 2, 1].map(stars => ({
    stars,
    count: Number(reviewSummary.ratingDistribution?.[stars] || 0),
    percent: totalReviews === 0
      ? 0
      : (Number(reviewSummary.ratingDistribution?.[stars] || 0) / totalReviews) * 100,
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
    return <RatingBadge avgRating={avgRating} count={totalReviews} />;
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
              <span className="text-muted-foreground">({totalReviews} reviews)</span>
            </div>
            {totalReviews > 0 && (
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
              <p className="text-xs text-muted-foreground mt-2">
                Honest feedback from all customers is welcome. Verified purchase badges are added when we can match an order.
              </p>
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

      {signupPrompt.visible && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5">
          <p className="text-sm font-semibold text-emerald-900">Want to save your points and track your review status?</p>
          <p className="text-sm text-emerald-800 mt-1">
            Create a free account to manage rewards and keep your profile up to date.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
              <Link
                href={signupPrompt.registerHref}
              >
                Create Free Account
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSignupPrompt((current) => ({ ...current, visible: false }))}
            >
              Maybe Later
            </Button>
          </div>
        </div>
      )}

      {pendingReviews.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-amber-900">Your Pending Review{pendingReviews.length > 1 ? 's' : ''}</h3>
            <p className="text-sm text-amber-800">
              Your submission is saved and awaiting moderation approval before it appears publicly.
            </p>
          </div>

          <div className="space-y-3">
            {pendingReviews.map((review) => {
              const reviewId = String(review?._id || getReviewFingerprint(review));
              return (
                <div key={reviewId} className="bg-white rounded-lg p-4 border border-amber-100">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{review.title || 'Pending review'}</p>
                      <p className="text-sm text-slate-600">
                        {new Date(review.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="secondary" className="bg-amber-100 text-amber-900 border-amber-300">
                      Pending Approval
                    </Badge>
                  </div>
                  <div className="mt-2">
                    <StarRating rating={review.rating} readonly size={14} />
                  </div>
                  <p className="mt-2 text-sm text-slate-700 leading-relaxed">{review.comment}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reviews List */}
      {loading ? (
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-600" />
          <p className="text-muted-foreground mt-2">Loading reviews...</p>
        </div>
      ) : totalReviews === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-3" />
          <p className="text-lg font-medium text-gray-600">
            {pendingReviews.length > 0 ? 'No public reviews yet' : 'No reviews yet'}
          </p>
          <p className="text-muted-foreground">
            {pendingReviews.length > 0
              ? 'Your pending review is queued above and will appear here after approval.'
              : 'Be the first to share your experience!'}
          </p>
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
                {showAllReviews ? 'Show Less' : `View All ${totalReviews} Reviews`}
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
