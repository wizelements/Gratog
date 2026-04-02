'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, TrendingUp, Search } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function RecommendationsWidget({ 
  type = 'ingredient', 
  ingredient = 'ginger',
  cartItems = [],
  className = ''
}) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState({});

  useEffect(() => {
    fetchRecommendations();
  }, [type, ingredient]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      
      let url = '';
      
      if (type === 'ingredient') {
        url = `/api/recommendations?type=ingredient&ingredient=${ingredient}&limit=4`;
      } else if (type === 'complementary') {
        // POST request for complementary
        const response = await fetch('/api/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'complementary',
            data: { cartItems, limit: 4 }
          })
        });
        const data = await response.json();
        if (data.success) {
          setRecommendations(data.products || []);
          setMetadata({ message: data.message, suggestions: data.suggestions });
        }
        setLoading(false);
        return;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setRecommendations(data.products || []);
        setMetadata({ 
          icon: data.icon, 
          benefits: data.benefits,
          tagline: data.tagline 
        });
      }
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  const getIcon = () => {
    if (type === 'ingredient') return metadata.icon || '🌿';
    if (type === 'complementary') return '✨';
    return '🔥';
  };

  const getTitle = () => {
    if (type === 'ingredient') return metadata.tagline || `Products with ${ingredient}`;
    if (type === 'complementary') return metadata.message || 'Complete Your Wellness';
    return 'Recommended For You';
  };

  return (
    <Card className={`${className} border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50`}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="text-3xl">{getIcon()}</span>
          <div>
            <CardTitle className="text-xl">{getTitle()}</CardTitle>
            {metadata.benefits && (
              <p className="text-sm text-muted-foreground mt-1">
                Benefits: {metadata.benefits.slice(0, 3).join(', ')}
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {recommendations.map((product) => (
            <Link 
              key={product.id} 
              href={`/product/${product.slug || product.id}`}
              className="group"
            >
              <div className="bg-white rounded-lg p-3 hover:shadow-lg transition-shadow">
                <div className="relative h-32 mb-2 rounded-md overflow-hidden bg-gradient-to-br from-emerald-100 to-teal-100">
                  {product.displayImage || product.image ? (
                    <Image
                      src={product.displayImage || product.image}
                      alt={product.imageAlt || product.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Sparkles className="h-8 w-8 text-emerald-600" />
                    </div>
                  )}
                  
                  {product.ingredientIcons && product.ingredientIcons[0] && (
                    <div className="absolute top-1 left-1 bg-white/90 rounded-full w-6 h-6 flex items-center justify-center text-sm">
                      {product.ingredientIcons[0]}
                    </div>
                  )}
                </div>
                
                <h4 className="text-sm font-semibold line-clamp-2 mb-1 group-hover:text-emerald-600 transition-colors">
                  {product.name}
                </h4>
                
                <p className="text-emerald-600 font-bold text-lg">
                  ${(product.price || 0).toFixed(2)}
                </p>
                
                {product.tags && product.tags[0] && (
                  <Badge variant="secondary" className="text-xs mt-1">
                    #{product.tags[0]}
                  </Badge>
                )}
              </div>
            </Link>
          ))}
        </div>
        
        {metadata.suggestions && metadata.suggestions.length > 0 && (
          <div className="mt-4 p-3 bg-white rounded-lg">
            <p className="text-sm font-medium text-emerald-700">💡 Missing ingredients:</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {metadata.suggestions.map((suggestion, idx) => (
                <Badge key={idx} variant="outline" className="border-emerald-400">
                  {suggestion}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
