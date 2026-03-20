'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Mail, MapPin, Phone } from 'lucide-react';
import { toast } from 'sonner';
import {
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_HREF,
  HAS_PUBLIC_PHONE,
  MARKET_LOCATION_LABEL,
  SUPPORT_EMAIL,
  SUPPORT_HOURS_LABEL,
} from '@/lib/site-config';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message.');
      }
      
      toast.success('Message sent successfully! We\'ll get back to you soon.');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      setError(err.message || 'Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="container py-16">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Get in Touch</h1>
          <p className="text-muted-foreground text-lg">
            Have questions? We'd love to hear from you!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="icon-container mx-auto mb-4">
                <Mail className="h-6 w-6 text-[#D4AF37]" />
              </div>
              <h3 className="font-semibold mb-2">Email</h3>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-sm text-muted-foreground hover:text-[#D4AF37] transition-colors"
              >
                {SUPPORT_EMAIL}
              </a>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="icon-container mx-auto mb-4">
                <Phone className="h-6 w-6 text-[#D4AF37]" />
              </div>
              <h3 className="font-semibold mb-2">Phone</h3>
              {HAS_PUBLIC_PHONE ? (
                <a
                  href={CONTACT_PHONE_HREF}
                  className="text-sm text-muted-foreground hover:text-[#D4AF37] transition-colors"
                >
                  {CONTACT_PHONE_DISPLAY}
                </a>
              ) : (
                <a
                  href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Phone Support Request')}`}
                  className="text-sm text-muted-foreground hover:text-[#D4AF37] transition-colors"
                >
                  Request a callback by email
                </a>
              )}
              <p className="text-xs text-muted-foreground mt-1">{SUPPORT_HOURS_LABEL}</p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-6">
              <div className="icon-container mx-auto mb-4">
                <MapPin className="h-6 w-6 text-[#D4AF37]" />
              </div>
              <h3 className="font-semibold mb-2">Location</h3>
              <p className="text-sm text-muted-foreground">
                {MARKET_LOCATION_LABEL}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Send Us a Message</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#D4AF37] hover:bg-[#B8941F] text-white"
                size="lg"
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
