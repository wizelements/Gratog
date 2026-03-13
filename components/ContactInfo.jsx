'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Phone, Clock, MapPin, Instagram, Facebook, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import {
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_HREF,
  HAS_PUBLIC_PHONE,
  MARKET_LOCATION_LABEL,
  SUPPORT_EMAIL,
  SUPPORT_HOURS_LABEL,
} from '@/lib/site-config';

const contactDetails = [
  {
    icon: Mail,
    label: 'Email',
    value: SUPPORT_EMAIL,
    href: `mailto:${SUPPORT_EMAIL}`,
  },
  HAS_PUBLIC_PHONE
    ? {
      icon: Phone,
      label: 'Phone',
      value: CONTACT_PHONE_DISPLAY,
      href: CONTACT_PHONE_HREF,
    }
    : {
      icon: Phone,
      label: 'Phone',
      value: 'Available by callback request',
      href: `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Phone Support Request')}`,
    },
  {
    icon: MapPin,
    label: 'Location',
    value: MARKET_LOCATION_LABEL,
    href: null,
  },
];

const businessHours = [
  { day: 'Monday - Friday', hours: '9:00 AM - 6:00 PM EST' },
  { day: 'Saturday', hours: '10:00 AM - 4:00 PM EST' },
  { day: 'Sunday', hours: 'Closed' },
];

const socialLinks = [
  {
    icon: Instagram,
    label: 'Instagram',
    href: 'https://instagram.com/tasteofgratitude',
  },
  {
    icon: Facebook,
    label: 'Facebook',
    href: 'https://facebook.com/tasteofgratitude',
  },
];

export default function ContactInfo() {
  return (
    <section className="py-12 bg-gradient-to-br from-emerald-50 to-teal-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            We're Here to Help
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Have questions about our products or your order? Our friendly team is ready
            to assist you on your wellness journey.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card className="bg-white shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageCircle className="h-5 w-5 text-emerald-600" />
                Contact Us
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {contactDetails.map((contact, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <contact.icon className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{contact.label}</p>
                    {contact.href ? (
                      <Link
                        href={contact.href}
                        className="font-medium text-gray-900 hover:text-emerald-600 transition-colors"
                      >
                        {contact.value}
                      </Link>
                    ) : (
                      <p className="font-medium text-gray-900">{contact.value}</p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-white shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-emerald-600" />
                Business Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {businessHours.map((schedule, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
                  >
                    <span className="text-gray-700">{schedule.day}</span>
                    <span
                      className={`font-medium ${
                        schedule.hours === 'Closed'
                          ? 'text-red-500'
                          : 'text-emerald-600'
                      }`}
                    >
                      {schedule.hours}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Response time: Within 24 hours on business days. Support hours: {SUPPORT_HOURS_LABEL}.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-md md:col-span-2 lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                Follow Us
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Stay connected for wellness tips, new products, and exclusive offers.
              </p>
              <div className="flex gap-3">
                {socialLinks.map((social, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="lg"
                    className="flex-1 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300"
                    asChild
                  >
                    <Link href={social.href} target="_blank" rel="noopener noreferrer">
                      <social.icon className="h-5 w-5 mr-2 text-emerald-600" />
                      {social.label}
                    </Link>
                  </Button>
                ))}
              </div>
              <div className="mt-6 p-4 bg-emerald-50 rounded-lg">
                <p className="text-sm text-emerald-800 font-medium text-center">
                  💚 Black-owned & Family-operated since 2020
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
