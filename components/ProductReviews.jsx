'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import StarRating from '@/components/StarRating';
import { MessageSquare, ThumbsUp, Award, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ProductReviews({ productId, productName }) {
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

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const fetchReviews = async () => {
    try {
      const response = await fetch(`/api/reviews?productId=${productId}`);
      const data = await response.json();
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
          ...formData,
          productId,
          productName,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(
          `🎉 Review submitted! You earned ${data.pointsEarned} reward points!`,
          { duration: 5000 }
        );
        setFormData({ name: '', email: '', rating: 0, title: '', comment: '' });
        setShowForm(false);
        fetchReviews();
      } else {
        toast.error(data.error || 'Failed to submit review');
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

  return (
    <div className="space-y-6">
      {/* Reviews Summary */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-6 border border-emerald-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-emerald-900 mb-2">Customer Reviews</h3>
            <div className="flex items-center gap-3">
              <StarRating rating={avgRating} readonly size={20} />
              <span className="text-lg font-semibold text-emerald-800">
                {avgRating.toFixed(1)} out of 5
              </span>
              <span className="text-muted-foreground">({reviews.length} reviews)</span>
            </div>
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
                placeholder="Share your thoughts about this product..."
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
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review._id}
              className="bg-white rounded-lg p-6 border border-gray-200 hover:border-emerald-200 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">{review.name}</span>
                    {review.verified && (
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

              {review.helpful > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <span className="text-sm text-muted-foreground">
                    <ThumbsUp className="h-4 w-4 inline mr-1" />
                    {review.helpful} people found this helpful
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
