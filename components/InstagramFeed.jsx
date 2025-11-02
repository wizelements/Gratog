'use client';

import { useState, useEffect } from 'react';
import { Heart, MessageCircle, ExternalLink, Loader2, Instagram } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

export default function InstagramFeed({ limit = 6 }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState('mock');

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await fetch(`/api/instagram/posts?limit=${limit}`);
      const data = await response.json();
      if (response.ok) {
        setPosts(data.posts || []);
        setSource(data.source);
      }
    } catch (error) {
      console.error('Failed to fetch Instagram posts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-600" />
        <p className="text-muted-foreground mt-2">Loading posts...</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <Instagram className="h-12 w-12 mx-auto text-gray-400 mb-3" />
        <p className="text-lg font-medium text-gray-600">No posts yet</p>
        <p className="text-muted-foreground">Follow us on Instagram @tasteofgratitude</p>
      </div>
    );
  }

  return (
    <div>
      {source === 'mock' && (
        <div className="mb-6">
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            <Instagram className="h-3 w-3 mr-1" />
            Preview Mode - Configure Instagram API for live feed
          </Badge>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post) => (
          <div
            key={post.id}
            className="group relative bg-white rounded-lg overflow-hidden border border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all duration-300"
          >
            {/* Image */}
            <div className="relative aspect-square overflow-hidden bg-gray-100">
              <Image
                src={post.imageUrl}
                alt={post.caption?.substring(0, 100) || 'Instagram post'}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
              
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <div className="flex gap-4 text-white">
                  <div className="flex items-center gap-1">
                    <Heart className="h-5 w-5" />
                    <span className="font-semibold">{post.likes}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="h-5 w-5" />
                    <span className="font-semibold">{post.comments}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Caption */}
            <div className="p-4">
              <p className="text-sm text-gray-700 line-clamp-3 mb-3">
                {post.caption}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {new Date(post.timestamp).toLocaleDateString()}
                </span>
                <Button
                  asChild
                  size="sm"
                  variant="ghost"
                  className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                >
                  <a
                    href={post.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View
                  </a>
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center mt-8">
        <Button
          asChild
          size="lg"
          variant="outline"
          className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
        >
          <a
            href="https://instagram.com/tasteofgratitude"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Instagram className="mr-2 h-5 w-5" />
            Follow @tasteofgratitude
          </a>
        </Button>
      </div>
    </div>
  );
}
