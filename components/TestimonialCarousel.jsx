'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, ChevronLeft, ChevronRight, BadgeCheck } from 'lucide-react';

const testimonials = [
  {
    id: 1,
    name: 'Sarah M.',
    location: 'Atlanta, GA',
    rating: 5,
    text: "I've been using Taste of Gratitude's sea moss gel for 3 months now and my energy levels have completely transformed. The quality is unmatched!",
    verified: true,
  },
  {
    id: 2,
    name: 'Marcus T.',
    location: 'Houston, TX',
    rating: 5,
    text: 'Best sea moss I have ever tried. You can taste the difference in quality. Fast shipping and great customer service too.',
    verified: true,
  },
  {
    id: 3,
    name: 'Keisha W.',
    location: 'Brooklyn, NY',
    rating: 5,
    text: 'My whole family uses these products now. The wildcrafted quality is amazing and we love supporting a Black-owned business.',
    verified: true,
  },
  {
    id: 4,
    name: 'David L.',
    location: 'Chicago, IL',
    rating: 4,
    text: "Great products and the subscription makes it so convenient. I never have to worry about running out. Highly recommend!",
    verified: true,
  },
  {
    id: 5,
    name: 'Tanya R.',
    location: 'Miami, FL',
    rating: 5,
    text: 'The golden sea moss gel has done wonders for my skin and digestion. I tell everyone about Taste of Gratitude!',
    verified: true,
  },
];

function StarRating({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );
}

export default function TestimonialCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  }, []);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, nextSlide]);

  const handleManualNav = (direction) => {
    setIsAutoPlaying(false);
    if (direction === 'next') nextSlide();
    else prevSlide();
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  return (
    <section className="py-12 bg-gradient-to-br from-emerald-50 to-teal-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            What Our Customers Say
          </h2>
          <p className="text-muted-foreground">
            Join thousands of satisfied customers on their wellness journey
          </p>
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {testimonials.map((testimonial) => (
                <div key={testimonial.id} className="w-full flex-shrink-0 px-4">
                  <Card className="bg-white shadow-lg">
                    <CardContent className="p-6 md:p-8 text-center">
                      <StarRating rating={testimonial.rating} />
                      <blockquote className="mt-4 text-lg text-gray-700 italic">
                        "{testimonial.text}"
                      </blockquote>
                      <div className="mt-6 flex flex-col items-center gap-2">
                        <p className="font-semibold text-gray-900">
                          {testimonial.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {testimonial.location}
                        </p>
                        {testimonial.verified && (
                          <Badge
                            variant="secondary"
                            className="bg-emerald-100 text-emerald-700"
                          >
                            <BadgeCheck className="h-3 w-3 mr-1" />
                            Verified Purchase
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>

          <Button
            variant="outline"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 md:-translate-x-4 bg-white shadow-md hover:bg-emerald-50"
            onClick={() => handleManualNav('prev')}
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 md:translate-x-4 bg-white shadow-md hover:bg-emerald-50"
            onClick={() => handleManualNav('next')}
            aria-label="Next testimonial"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>

          <div className="flex justify-center gap-2 mt-6">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentIndex(index);
                  setIsAutoPlaying(false);
                  setTimeout(() => setIsAutoPlaying(true), 10000);
                }}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? 'bg-emerald-600 w-6'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
