'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function NewsletterSignup({ variant = 'default' }) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, firstName }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubscribed(true);
        toast.success('🎉 Welcome to our wellness community!');
        setEmail('');
        setFirstName('');
        
        // Reset after 5 seconds
        setTimeout(() => setSubscribed(false), 5000);
      } else {
        toast.error(data.error || 'Failed to subscribe. Please try again.');
      }
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'inline') {
    return (
      <form onSubmit={handleSubmit} className="flex gap-2 max-w-md">
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading || subscribed}
          className="flex-1"
        />
        <Button
          type="submit"
          disabled={loading || subscribed}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : subscribed ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            'Subscribe'
          )}
        </Button>
      </form>
    );
  }

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-8 border border-emerald-100">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center">
          <Mail className="h-6 w-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-emerald-900">Join Our Wellness Community</h3>
          <p className="text-emerald-600">Get exclusive tips, recipes & early access to new products</p>
        </div>
      </div>

      {subscribed ? (
        <div className="flex items-center gap-2 p-4 bg-emerald-100 rounded-lg">
          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          <p className="text-emerald-800 font-medium">✨ You're subscribed! Check your inbox for a welcome gift.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              type="text"
              placeholder="First name (optional)"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={loading}
            />
            <Input
              type="email"
              placeholder="Email address *"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Subscribing...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Subscribe to Newsletter
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            We respect your privacy. Unsubscribe anytime.
          </p>
        </form>
      )}
    </div>
  );
}
