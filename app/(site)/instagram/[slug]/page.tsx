'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function InstagramPostPage() {
  const params = useParams();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPost() {
      try {
        const response = await fetch(`/api/instagram/post/${params.slug}`);
        if (response.ok) {
          const data = await response.json();
          setPost(data.post);
        }
      } catch (error) {
        console.error('Error fetching post:', { error: error instanceof Error ? error.message : error, stack: error instanceof Error ? error.stack : undefined });
      } finally {
        setLoading(false);
      }
    }

    if (params.slug) {
      fetchPost();
    }
  }, [params.slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-16">
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground mb-4">Post Not Found</h1>
            <p className="text-muted-foreground">This Instagram post could not be found.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-16">
        {/* Breadcrumbs */}
        <nav className="text-sm text-muted-foreground mb-8">
          <Link href="/" className="hover:text-primary">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/community" className="hover:text-primary">Community</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">Post</span>
        </nav>

        <div className="max-w-4xl mx-auto">
          <article className="bg-card rounded-lg shadow-lg overflow-hidden">
            {/* Featured Image/Video */}
            <div className="relative w-full" style={{ paddingBottom: '100%' }}>
              {post.mediaType === 'VIDEO' ? (
                <video
                  src={post.mediaUrl}
                  controls
                  className="absolute inset-0 w-full h-full object-cover"
                  poster={post.mediaUrl}
                />
              ) : (
                <img
                  src={post.mediaUrl}
                  alt={post.metaTitle}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
            </div>

            {/* Content */}
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{new Date(post.postedAt).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</span>
                  {post.likeCount > 0 && (
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                      </svg>
                      {post.likeCount} likes
                    </span>
                  )}
                  {post.commentsCount > 0 && (
                    <span>{post.commentsCount} comments</span>
                  )}
                </div>
                
                <a
                  href={post.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm"
                >
                  View on Instagram →
                </a>
              </div>

              <div className="prose prose-lg max-w-none">
                <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                  {post.caption}
                </p>
              </div>

              {/* Hashtags */}
              {post.hashtags && post.hashtags.length > 0 && (
                <div className="mt-8 flex flex-wrap gap-2">
                  {post.hashtags.map((tag: string) => (
                    <a
                      key={tag}
                      href={`/community?tag=${tag}`}
                      className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-sm hover:bg-primary/20 transition-colors"
                    >
                      #{tag}
                    </a>
                  ))}
                </div>
              )}

              {/* Share Buttons */}
              <div className="mt-8 pt-8 border-t border-border">
                <h3 className="text-sm font-semibold text-foreground mb-4">Share this post</h3>
                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      const url = window.location.href;
                      navigator.clipboard.writeText(url);
                      alert('Link copied to clipboard!');
                    }}
                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors text-sm"
                  >
                    Copy Link
                  </button>
                  <a
                    href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(post.metaTitle)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-[#1DA1F2] text-white rounded-md hover:bg-[#1a8cd8] transition-colors text-sm"
                  >
                    Share on X
                  </a>
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-[#4267B2] text-white rounded-md hover:bg-[#365899] transition-colors text-sm"
                  >
                    Share on Facebook
                  </a>
                </div>
              </div>
            </div>
          </article>

          {/* Related Products CTA */}
          <div className="mt-12 bg-primary/5 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              🌿 Nourish Your Wellness Journey
            </h2>
            <p className="text-muted-foreground mb-6">
              Discover our premium sea moss products crafted with gratitude and wildcrafted ingredients
            </p>
            <a
              href="/catalog"
              className="inline-block px-8 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-semibold"
            >
              Shop Now →
            </a>
          </div>
        </div>
      </main>

      <Footer />

      {/* Structured Data for SEO - SAFE to use dangerouslySetInnerHTML because:
          1. JSON.stringify() escapes all special characters
          2. Content is in script tag with type="application/ld+json" (not executed)
          3. Data comes from controlled post object, not user input */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SocialMediaPosting',
            headline: post.metaTitle,
            description: post.metaDescription,
            image: post.mediaUrl,
            datePublished: post.postedAt,
            author: {
              '@type': 'Organization',
              name: 'Taste of Gratitude',
              url: 'https://tasteofgratitude.shop'
            },
            publisher: {
              '@type': 'Organization',
              name: 'Taste of Gratitude',
              logo: {
                '@type': 'ImageObject',
                url: 'https://tasteofgratitude.shop/logo.png'
              }
            },
            interactionStatistic: [
              {
                '@type': 'InteractionCounter',
                interactionType: 'https://schema.org/LikeAction',
                userInteractionCount: post.likeCount
              },
              {
                '@type': 'InteractionCounter',
                interactionType: 'https://schema.org/CommentAction',
                userInteractionCount: post.commentsCount
              }
            ]
          })
        }}
      />
    </div>
  );
}
