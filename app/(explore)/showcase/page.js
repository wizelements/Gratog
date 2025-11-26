'use client';

import { useState } from 'react';
import { Box, Sparkles, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function ShowcasePage() {
  const [selectedModel, setSelectedModel] = useState('jar');

  const models = [
    { id: 'jar', name: 'Sea Moss Gel Jar', emoji: '🍯' },
    { id: 'bottle', name: 'Lemonade Bottle', emoji: '🧃' },
    { id: 'blend', name: 'Custom Blend', emoji: '🥤' }
  ];

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Back Button */}
        <Link href="/explore">
          <Button variant="ghost" className="text-white hover:bg-white/10 mb-8">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Hub
          </Button>
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-6xl mb-4">📦</div>
          <h1 className="text-5xl font-bold text-white mb-4">3D Product Showcase</h1>
          <p className="text-xl text-emerald-300 mb-8 max-w-2xl mx-auto">
            View our products in 3D and experience them in augmented reality
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Model Selector */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold mb-4">Select Product</h3>
            {models.map(model => (
              <Card
                key={model.id}
                className={
                  `cursor-pointer transition-all ${
                    selectedModel === model.id
                      ? 'bg-emerald-500/20 border-emerald-500'
                      : 'bg-black/40 border-white/10 hover:bg-black/60'
                  }`
                }
                onClick={() => setSelectedModel(model.id)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="text-4xl">{model.emoji}</div>
                  <div className="text-white font-medium">{model.name}</div>
                </CardContent>
              </Card>
            ))}

            <div className="mt-8 p-6 bg-amber-500/20 border-2 border-amber-500/50 rounded-lg">
              <div className="text-center">
                <Sparkles className="h-8 w-8 text-amber-400 mx-auto mb-3" />
                <h4 className="text-white font-semibold mb-2">Coming Soon!</h4>
                <p className="text-white/80 text-sm">
                  Full 3D models and AR experiences will be available soon.
                  This is a preview of the feature.
                </p>
              </div>
            </div>
          </div>

          {/* 3D Viewer Placeholder */}
          <div className="lg:col-span-2">
            <Card className="bg-gradient-to-br from-slate-900 to-emerald-900/20 border-emerald-500/30 h-[600px]">
              <CardContent className="h-full flex flex-col items-center justify-center p-8">
                <div className="text-8xl mb-6 animate-bounce-gentle">
                  {models.find(m => m.id === selectedModel)?.emoji}
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">
                  {models.find(m => m.id === selectedModel)?.name}
                </h3>
                <p className="text-white/60 mb-8 text-center max-w-md">
                  Interactive 3D model viewer will be displayed here.
                  Rotate, zoom, and explore products in detail.
                </p>

                <div className="space-y-4 w-full max-w-md">
                  <Button className="w-full bg-gradient-to-r from-blue-500 to-cyan-600" disabled>
                    <Box className="mr-2 h-4 w-4" />
                    View in 3D
                    <span className="ml-2 text-xs opacity-60">(Coming Soon)</span>
                  </Button>
                  <Button variant="outline" className="w-full border-white/20 text-white" disabled>
                    📱 View in AR
                    <span className="ml-2 text-xs opacity-60">(Coming Soon)</span>
                  </Button>
                </div>

                <div className="mt-8 text-center text-sm text-white/40">
                  <p>To enable full 3D functionality, install:</p>
                  <code className="text-emerald-400 text-xs">@react-three/fiber @react-three/drei three</code>
                </div>
              </CardContent>
            </Card>

            {/* Controls Info */}
            <div className="mt-4 grid grid-cols-3 gap-4">
              <Card className="bg-black/40 border-white/10">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl mb-2">👆</div>
                  <div className="text-white text-sm font-semibold">Rotate</div>
                  <div className="text-white/60 text-xs">Drag to rotate</div>
                </CardContent>
              </Card>
              <Card className="bg-black/40 border-white/10">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl mb-2">🔍</div>
                  <div className="text-white text-sm font-semibold">Zoom</div>
                  <div className="text-white/60 text-xs">Scroll to zoom</div>
                </CardContent>
              </Card>
              <Card className="bg-black/40 border-white/10">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl mb-2">📱</div>
                  <div className="text-white text-sm font-semibold">AR Mode</div>
                  <div className="text-white/60 text-xs">Place in space</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
