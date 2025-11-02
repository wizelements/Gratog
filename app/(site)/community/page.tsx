'use client';

import { useEffect } from 'react';
import InstagramFeed from '@/components/InstagramFeed';
import NewsletterSignup from '@/components/NewsletterSignup';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  Users,
  Heart,
  MessageCircle,
  Award,
  ShoppingBag,
  Camera,
  Mail,
  Star,
} from 'lucide-react';
import AnalyticsSystem from '@/lib/analytics';

export default function CommunityPage() {
  useEffect(() => {
    AnalyticsSystem.initPostHog();
  }, []);

  const communityStats = [
    { icon: Users, label: 'Community Members', value: '500+', color: 'text-emerald-600' },
    { icon: Heart, label: 'Products Reviewed', value: '250+', color: 'text-rose-600' },
    { icon: Camera, label: 'Challenge Entries', value: '180+', color: 'text-orange-600' },
    { icon: Award, label: 'Rewards Earned', value: '1,200+', color: 'text-purple-600' },
  ];

  const communityFeatures = [
    {
      icon: Star,
      title: 'Product Reviews',
      description: 'Share your experience and earn 10 reward points per review',
      action: 'Write Review',
      link: '/catalog',
      color: 'bg-yellow-100 text-yellow-600',
    },
    {
      icon: Camera,
      title: 'Spicy Bloom Challenge',
      description: 'Join our viral challenge and win amazing prizes',
      action: 'Join Challenge',
      link: '/ugc/spicy-bloom',
      color: 'bg-orange-100 text-orange-600',
    },
    {
      icon: Award,
      title: 'Market Passport',
      description: 'Collect stamps at markets and unlock exclusive rewards',
      action: 'Get Passport',
      link: '/passport',
      color: 'bg-emerald-100 text-emerald-600',
    },
    {
      icon: Mail,
      title: 'Wellness Newsletter',
      description: 'Get exclusive tips, recipes, and early product access',
      action: 'Subscribe Now',
      link: '#newsletter',
      color: 'bg-blue-100 text-blue-600',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-600 text-white py-20">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-4 bg-white/20 text-white px-4 py-2 text-sm">
              <Users className="h-4 w-4 mr-2 inline" />
              Join 500+ Wellness Enthusiasts
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Our Wellness Community
            </h1>
            <p className="text-xl text-emerald-50 mb-8">
              Connect, share, and grow together on your wellness journey. Get rewarded for every
              interaction!
            </p>
          </div>
        </div>
      </section>

      {/* Community Stats */}
      <section className="py-12 bg-white border-b">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {communityStats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center">
                  <div className="flex justify-center mb-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Community Features */}
      <section className="py-16 bg-muted/50">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-emerald-900 mb-4">
              Ways to Engage & Earn Rewards
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Every action you take earns you points towards exclusive rewards and VIP status
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {communityFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-lg p-6 border border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all"
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${feature.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{feature.description}</p>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="w-full border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                  >
                    <Link href={feature.link}>{feature.action}</Link>
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Instagram Feed */}
      <section className="py-16 bg-white">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-emerald-900 mb-4">
              Follow Our Wellness Journey
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join us on Instagram for daily inspiration, behind-the-scenes, and community highlights
            </p>
          </div>

          <InstagramFeed limit={6} />
        </div>
      </section>

      {/* Newsletter Signup */}
      <section id="newsletter" className="py-16 bg-muted/50">
        <div className="container max-w-3xl">
          <NewsletterSignup />
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 bg-gradient-to-br from-emerald-600 to-teal-600 text-white">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Your Wellness Journey?</h2>
          <p className="text-xl text-emerald-50 mb-8 max-w-2xl mx-auto">
            Browse our premium sea moss collection and join our growing community of wellness
            enthusiasts
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="bg-white text-emerald-600 hover:bg-emerald-50"
            >
              <Link href="/catalog">
                <ShoppingBag className="mr-2 h-5 w-5" />
                Shop Products
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/10"
            >
              <Link href="/about">Read Our Story</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
