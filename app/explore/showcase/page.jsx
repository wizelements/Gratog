'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Box, Smartphone, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import ModelViewer from '@/components/explore/3d/ModelViewer';
import ARViewer from '@/components/explore/3d/ARViewer';

// Sample product data - in production, fetch from API
const PRODUCTS = [
  {
    id: 'sea-moss-gel',
    name: 'Sea Moss Gel',
    description: 'Premium wildcrafted sea moss gel packed with 92 minerals',
    modelUrl: '/models/products/jar-placeholder.glb',
    poster: '/images/products/sea-moss-gel.jpg',
    price: '$25.00',
    benefits: ['Thyroid Support', 'Immunity', 'Skin Health']
  },
  {
    id: 'elderberry-syrup',
    name: 'Elderberry Syrup',
    description: 'Immune-boosting elderberry syrup with honey and spices',
    modelUrl: '/models/products/bottle-placeholder.glb',
    poster: '/images/products/elderberry-syrup.jpg',
    price: '$18.00',
    benefits: ['Immunity', 'Antioxidants', 'Respiratory']
  }
];

export default function ShowcasePage() {
  const [selectedProduct, setSelectedProduct] = useState(PRODUCTS[0]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
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
            Explore our products in stunning 3D and place them in your space with AR
          </p>
        </div>

        {/* Product Selector */}
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

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* 3D Viewer */}
          <div>
            <Tabs defaultValue="3d" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="3d">
                  <Box className="w-4 h-4 mr-2" />
                  3D View
                </TabsTrigger>
                <TabsTrigger value="ar">
                  <Smartphone className="w-4 h-4 mr-2" />
                  AR View
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="3d" className="mt-4">
                <Card>
                  <CardContent className="p-0">
                    <ModelViewer
                      modelUrl={selectedProduct.modelUrl}
                      poster={selectedProduct.poster}
                      alt={selectedProduct.name}
                      ar={false}
                      autoRotate={true}
                      cameraControls={true}
                      className="w-full min-h-[600px] rounded-lg"
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="ar" className="mt-4">
                <ARViewer
                  modelUrl={selectedProduct.modelUrl}
                  poster={selectedProduct.poster}
                  alt={selectedProduct.name}
                />
              </TabsContent>
            </Tabs>
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
