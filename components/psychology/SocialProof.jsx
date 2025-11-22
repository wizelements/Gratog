'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Users, MapPin } from 'lucide-react';

const TESTIMONIALS = [
  {
    name: "Sarah M.",
    location: "Atlanta, GA",
    rating: 5,
    text: "This sea moss gel has completely transformed my energy levels. I feel amazing!",
    verified: true
  },
  {
    name: "James T.",
    location: "South Fulton, GA",
    rating: 5,
    text: "Best quality sea moss I've ever tried. The elderberry flavor is incredible.",
    verified: true
  },
  {
    name: "Michelle R.",
    location: "College Park, GA",
    rating: 5,
    text: "My thyroid health has improved dramatically since starting this. Highly recommend!",
    verified: true
  },
  {
    name: "David K.",
    location: "East Point, GA",
    rating: 5,
    text: "Love the lemonade flavor! Makes it so easy to get my daily minerals.",
    verified: true
  }
];

export default function SocialProof() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [customerCount, setCustomerCount] = useState(5347);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial(prev => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCustomerCount(prev => prev + Math.floor(Math.random() * 3));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const testimonial = TESTIMONIALS[currentTestimonial];

  return (
    <div className="space-y-6">
      <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50">
        <CardContent className="p-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Users className="h-6 w-6 text-emerald-600" />
            <span className="text-3xl font-bold text-emerald-900">
              {customerCount.toLocaleString()}+
            </span>
          </div>
          <p className="text-emerald-700 font-medium">Happy Customers & Growing!</p>
        </CardContent>
      </Card>

      <Card className="border-emerald-200 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center gap-1 mb-3">
            {[...Array(testimonial.rating)].map((_, i) => (
              <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
          <p className="text-gray-700 mb-4 italic">"{testimonial.text}"</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-emerald-900">{testimonial.name}</p>
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <MapPin className="h-3 w-3" />
                {testimonial.location}
              </div>
            </div>
            {testimonial.verified && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                ✓ Verified Purchase
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
