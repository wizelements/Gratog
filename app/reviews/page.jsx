'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Camera, Loader2, MessageSquare, PlayCircle, Sparkles, Star } from 'lucide-react';
import ProductReviews from '@/components/ProductReviews';

const EXPERIENCE_REVIEW_ID = 'overall-experience';
const EXPERIENCE_REVIEW_NAME = 'Taste of Gratitude Experience';

export default function ReviewsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [interactions, setInteractions] = useState([]);
  const [interactionsLoading, setInteractionsLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch('/api/products');
        const data = await response.json();
        if (response.ok && data.success && Array.isArray(data.products)) {
          setProducts(data.products.slice(0, 9));
        }
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  useEffect(() => {
    async function fetchInteractions() {
      try {
        const response = await fetch('/api/interactions?limit=12');
        const data = await response.json();
        if (response.ok && data.success && Array.isArray(data.interactions)) {
          setInteractions(data.interactions);
        }
      } finally {
        setInteractionsLoading(false);
      }
    }

    fetchInteractions();
  }, []);

  const reviewProductLinks = useMemo(
    () => products.filter((product) => product?.slug && product?.name),
    [products]
  );

  const featuredInteractions = useMemo(() => {
    const ordered = [...interactions].sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
    return ordered.slice(0, 6);
  }, [interactions]);

  function getYouTubeEmbedUrl(url) {
    if (!url) return null;

    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes('youtube.com')) {
        const id = parsed.searchParams.get('v');
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      if (parsed.hostname.includes('youtu.be')) {
        const id = parsed.pathname.split('/').filter(Boolean)[0];
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      return null;
    } catch {
      return null;
    }
  }

  function isDirectVideo(url) {
    return typeof url === 'string' && /\.(mp4|webm|mov)(\?|$)/i.test(url);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#071a14] via-[#0f332a] to-[#f6f2e9]">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top,_#d4af37_0,_transparent_55%)]" />
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.12)_45%,transparent_100%)]" />
        <div className="container relative py-20 text-white">
          <Badge className="mb-4 bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#f9e8b8]">
            <Sparkles className="h-4 w-4 mr-2" />
            Review Studio
          </Badge>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight max-w-3xl mb-5">
            Tell The Story Behind Every Sip
          </h1>
          <p className="text-lg md:text-xl text-emerald-50/90 max-w-2xl">
            Drop a product review in one tap, or leave a full experience review about your journey with Taste of Gratitude.
          </p>
        </div>
      </section>

      <section className="container py-10">
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="bg-white/95 backdrop-blur border-emerald-100">
            <CardContent className="p-6">
              <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <MessageSquare className="h-5 w-5 text-emerald-700" />
              </div>
              <h2 className="font-bold text-lg text-emerald-900 mb-2">Fast Product Reviews</h2>
              <p className="text-sm text-emerald-800/80">Pick any product and jump directly into the review form.</p>
            </CardContent>
          </Card>
          <Card className="bg-white/95 backdrop-blur border-amber-100">
            <CardContent className="p-6">
              <div className="w-11 h-11 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                <Star className="h-5 w-5 text-amber-700" />
              </div>
              <h2 className="font-bold text-lg text-amber-900 mb-2">Rewards Built-In</h2>
              <p className="text-sm text-amber-800/80">Each review submission still earns reward points automatically.</p>
            </CardContent>
          </Card>
          <Card className="bg-white/95 backdrop-blur border-blue-100">
            <CardContent className="p-6">
              <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <Camera className="h-5 w-5 text-blue-700" />
              </div>
              <h2 className="font-bold text-lg text-blue-900 mb-2">Experience Reviews</h2>
              <p className="text-sm text-blue-800/80">Share service, delivery, pickup, and overall brand experience in one place.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="container pb-8">
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-emerald-100 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-2xl font-black text-emerald-900">Review A Specific Product</h2>
              <p className="text-sm text-muted-foreground">Select a product and we’ll open the review tab and form instantly.</p>
            </div>
          </div>

          {loading ? (
            <div className="py-10 text-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3 text-emerald-600" />
              Loading products...
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {reviewProductLinks.map((product) => (
                <Link
                  key={product.slug}
                  href={`/product/${product.slug}?tab=reviews&review=1`}
                  className="group rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 hover:border-emerald-300 hover:bg-emerald-50 transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-emerald-900 line-clamp-1">{product.name}</span>
                    <ArrowRight className="h-4 w-4 text-emerald-600 transition-transform group-hover:translate-x-1" />
                  </div>
                  <p className="text-xs text-emerald-800/80 mt-1">Open review form</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="container pb-8">
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-emerald-100 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
            <div>
              <h2 className="text-2xl font-black text-emerald-900">Live Customer Interactions</h2>
              <p className="text-sm text-muted-foreground max-w-2xl">
                Real reactions from markets, pop-ups, delivery moments, and video testimonials.
              </p>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
              <PlayCircle className="h-4 w-4 mr-1" />
              Updated by admin in real time
            </Badge>
          </div>

          {interactionsLoading ? (
            <div className="py-10 text-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3 text-emerald-600" />
              Loading live interactions...
            </div>
          ) : featuredInteractions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-emerald-200 p-8 text-center text-muted-foreground">
              New event interactions will appear here as soon as they are published.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredInteractions.map((interaction) => {
                const youtubeEmbed = getYouTubeEmbedUrl(interaction.mediaUrl);
                return (
                  <Card key={interaction.id || interaction._id} className="overflow-hidden border-emerald-100">
                    <CardContent className="p-4 space-y-3">
                      {youtubeEmbed ? (
                        <div className="relative w-full overflow-hidden rounded-lg border border-emerald-100" style={{ paddingTop: '56.25%' }}>
                          <iframe
                            src={youtubeEmbed}
                            title={interaction.title}
                            className="absolute inset-0 h-full w-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                          />
                        </div>
                      ) : isDirectVideo(interaction.mediaUrl) ? (
                        <video src={interaction.mediaUrl} controls className="w-full rounded-lg border border-emerald-100" preload="metadata" />
                      ) : null}

                      <div className="space-y-1">
                        <p className="font-semibold text-emerald-900 line-clamp-2">{interaction.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {interaction.customerName}
                          {interaction.sourcePlatform ? ` • ${interaction.sourcePlatform}` : ''}
                        </p>
                      </div>

                      <p className="text-sm text-gray-700 line-clamp-3">{interaction.text}</p>

                      {interaction.sourceUrl && (
                        <Link href={interaction.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-sm text-emerald-700 hover:text-emerald-800 font-medium">
                          View original post
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Link>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="container pb-16">
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-emerald-100 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-black text-emerald-900">Review Your Full Experience</h2>
              <p className="text-sm text-muted-foreground max-w-2xl">
                Not tied to one product? Share how delivery, pickup, support, and overall vibe felt.
              </p>
            </div>
            <Button asChild variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50">
              <Link href="/catalog">Shop More Products</Link>
            </Button>
          </div>

          <ProductReviews
            productId={EXPERIENCE_REVIEW_ID}
            productName={EXPERIENCE_REVIEW_NAME}
            autoOpenForm
            reviewHeading="Customer Experience Reviews"
            reviewSubheading="Tell us about your overall experience: quality, support, delivery, and how we made you feel."
          />
        </div>
      </section>
    </div>
  );
}
