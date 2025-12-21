'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Sparkles, ShoppingCart, Package, CreditCard, Gift } from 'lucide-react';
import Link from 'next/link';

export default function WhatsNewModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Guard against SSR - localStorage only available in browser
    if (typeof window === 'undefined') return;
    
    // Check if user has seen the modal
    const hasSeenModal = localStorage.getItem('whats-new-square-v1');
    
    if (!hasSeenModal) {
      // Show modal after 2 seconds
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('whats-new-square-v1', 'true');
    }
    setIsOpen(false);
  };

  const features = [
    {
      icon: <CreditCard className="h-6 w-6 text-emerald-600" />,
      title: 'Secure Square Checkout',
      description: 'Bank-level security with multiple payment options including Apple Pay & Google Pay'
    },
    {
      icon: <Package className="h-6 w-6 text-teal-600" />,
      title: '19 Premium Products',
      description: 'Browse our full catalog of wildcrafted sea moss gels, lemonades, and wellness shots'
    },
    {
      icon: <ShoppingCart className="h-6 w-6 text-blue-600" />,
      title: 'Fast Checkout',
      description: 'Complete your order in seconds with our streamlined checkout experience'
    },
    {
      icon: <Gift className="h-6 w-6 text-purple-600" />,
      title: 'Order Tracking',
      description: 'Track your order status and receive updates every step of the way'
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between mb-4">
            <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-3 py-1">
              <Sparkles className="h-4 w-4 mr-2 inline" />
              What's New
            </Badge>
          </div>
          <DialogTitle className="text-2xl md:text-3xl font-bold text-emerald-900">
            Welcome to Our New Shopping Experience! 🎉
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground mt-2">
            We've upgraded our checkout with Square to make your shopping experience faster, safer, and more convenient than ever.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-6">
          {features.map((feature, index) => (
            <div key={index} className="flex gap-4 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-100">
              <div className="flex-shrink-0 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                {feature.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-emerald-900 mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Button
            asChild
            size="lg"
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Link href="/catalog" onClick={handleClose}>
              <ShoppingCart className="mr-2 h-5 w-5" />
              Browse Products
            </Link>
          </Button>
          <Button
            onClick={handleClose}
            size="lg"
            variant="outline"
            className="flex-1"
          >
            Got It!
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-4">
          This message will only be shown once. You can always view our catalog and try the new checkout anytime!
        </p>
      </DialogContent>
    </Dialog>
  );
}
