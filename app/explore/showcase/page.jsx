'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Box, Smartphone, ArrowLeft, Sparkles, Rotate3d, Eye } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const PRODUCTS = [
  {
    id: 'sea-moss-gel',
    name: 'Sea Moss Gel',
    description: 'Premium wildcrafted sea moss gel packed with 92 minerals',
    image: '/images/products/sea-moss-gel.jpg',
    price: '$25.00',
    benefits: ['Thyroid Support', 'Immunity', 'Skin Health']
  },
  {
    id: 'elderberry-syrup',
    name: 'Elderberry Syrup',
    description: 'Immune-boosting elderberry syrup with honey and spices',
    image: '/images/products/elderberry-syrup.jpg',
    price: '$18.00',
    benefits: ['Immunity', 'Antioxidants', 'Respiratory']
  }
];

export default function ShowcasePage() {
  const [selectedProduct, setSelectedProduct] = useState(PRODUCTS[0]);
  const [rotation, setRotation] = useState(0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <Link href="/explore">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Explore
          </Button>
        </Link>

        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            3D Product Showcase
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Interactive product visualization experience
          </p>
        </div>

        <div className="flex justify-center gap-4 mb-8">
          {PRODUCTS.map((product) => (
            <Button
              key={product.id}
              variant={selectedProduct.id === product.id ? 'default' : 'outline'}
              onClick={() => setSelectedProduct(product)}
              className="flex items-center gap-2"
            >
              <Box className="w-4 h-4" />
              {product.name}
            </Button>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          <div>
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="relative min-h-[500px] bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center">
                  <div 
                    className="relative w-64 h-64 transition-transform duration-300 ease-out"
                    style={{ transform: `rotateY(${rotation}deg)` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-200/50 to-teal-300/50 rounded-2xl shadow-2xl flex items-center justify-center">
                      <div className="text-center p-6">
                        <div className="text-6xl mb-4">🫙</div>
                        <h3 className="text-xl font-bold text-emerald-800">{selectedProduct.name}</h3>
                        <p className="text-emerald-600 mt-2">{selectedProduct.price}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => setRotation(r => r - 45)}
                      className="bg-white/80 backdrop-blur"
                    >
                      <Rotate3d className="w-4 h-4 mr-1" />
                      Rotate Left
                    </Button>
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => setRotation(r => r + 45)}
                      className="bg-white/80 backdrop-blur"
                    >
                      Rotate Right
                      <Rotate3d className="w-4 h-4 ml-1 scale-x-[-1]" />
                    </Button>
                  </div>
                  
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-amber-500 text-white">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Preview Mode
                    </Badge>
                  </div>
                </div>
                
                <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 border-t">
                  <div className="flex items-center gap-3 text-purple-700">
                    <Sparkles className="w-5 h-5" />
                    <div>
                      <p className="font-semibold">Full 3D & AR Coming Soon!</p>
                      <p className="text-sm text-purple-600">Interactive 3D models with AR placement</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-3xl">{selectedProduct.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="text-gray-600 text-lg mb-4">{selectedProduct.description}</p>
                  <p className="text-4xl font-bold text-emerald-600">{selectedProduct.price}</p>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Key Benefits</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.benefits.map((benefit) => (
                      <Badge key={benefit} variant="secondary" className="text-sm px-3 py-1">
                        {benefit}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Button className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-lg py-6">
                    Add to Cart - {selectedProduct.price}
                  </Button>
                  <Button variant="outline" className="w-full text-lg py-6">
                    Learn More
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* AR Instructions */}
            <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-blue-600" />
                  How to Use AR
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-blue-600">1.</span>
                    <span>Switch to the "AR View" tab</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-blue-600">2.</span>
                    <span>Tap the AR button on the 3D model</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-blue-600">3.</span>
                    <span>Point your camera at a flat surface</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-blue-600">4.</span>
                    <span>Tap to place the product in your space!</span>
                  </li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
