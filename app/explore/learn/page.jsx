'use client';

import Link from 'next/link';
import { ArrowLeft, BookOpen, Lightbulb, Beaker, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const LEARNING_MODULES = [
  {
    id: 'sea-moss-101',
    title: 'Sea Moss 101',
    description: 'Complete guide to sea moss: origin, cultivation, and benefits',
    icon: BookOpen,
    color: 'from-emerald-500 to-green-600',
    sections: 5,
    readTime: '15 min',
    category: 'Foundations'
  },
  {
    id: 'minerals-science',
    title: 'The Science of 92 Minerals',
    description: 'Discover the essential minerals in sea moss and how they support your health',
    icon: Beaker,
    color: 'from-blue-500 to-cyan-600',
    sections: 6,
    readTime: '20 min',
    category: 'Science'
  },
  {
    id: 'thyroid-support',
    title: 'Thyroid Support & Iodine',
    description: 'Understanding how iodine and other compounds support thyroid health',
    icon: Heart,
    color: 'from-red-500 to-pink-600',
    sections: 4,
    readTime: '12 min',
    category: 'Health Benefits'
  },
  {
    id: 'immunity-boost',
    title: 'Immunity & Immune Response',
    description: 'How polysaccharides and minerals work to strengthen immunity',
    icon: Lightbulb,
    color: 'from-purple-500 to-pink-600',
    sections: 5,
    readTime: '18 min',
    category: 'Health Benefits'
  },
  {
    id: 'digestive-health',
    title: 'Digestive Health & Gut Wellness',
    description: 'Sea moss benefits for digestive system and gut microbiome',
    icon: Heart,
    color: 'from-orange-500 to-yellow-600',
    sections: 4,
    readTime: '14 min',
    category: 'Health Benefits'
  },
  {
    id: 'skin-wellness',
    title: 'Skin Health & Collagen',
    description: 'The connection between sea moss minerals and skin vitality',
    icon: Lightbulb,
    color: 'from-pink-500 to-rose-600',
    sections: 4,
    readTime: '11 min',
    category: 'Health Benefits'
  }
];

export default function LearningCenterPage() {
  const categories = [...new Set(LEARNING_MODULES.map(m => m.category))];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <Link href="/explore">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Explore
          </Button>
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Learning Center
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Deep-dive into the science, benefits, and stories behind our ingredients
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <Badge variant="default" className="bg-emerald-600">All</Badge>
          {categories.map(category => (
            <Badge key={category} variant="outline" className="cursor-pointer hover:bg-emerald-50">
              {category}
            </Badge>
          ))}
        </div>

        {/* Learning Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {LEARNING_MODULES.map((module) => {
            const Icon = module.icon;
            return (
              <Card key={module.id} className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-3 rounded-lg bg-gradient-to-br ${module.color}`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <Badge variant="outline">{module.category}</Badge>
                  </div>
                  <CardTitle className="text-xl">{module.title}</CardTitle>
                  <CardDescription>{module.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between">
                  <div className="flex gap-4 text-sm text-gray-500 mb-4">
                    <span>{module.sections} sections</span>
                    <span>•</span>
                    <span>{module.readTime} read</span>
                  </div>
                  <Button className={`w-full bg-gradient-to-r ${module.color} hover:opacity-90`}>
                    Start Learning
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Stats Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto text-center">
          <div className="p-6 bg-emerald-50 rounded-lg border border-emerald-200">
            <div className="text-3xl font-bold text-emerald-600 mb-2">6</div>
            <div className="text-gray-600">In-Depth Modules</div>
          </div>
          <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-3xl font-bold text-blue-600 mb-2">90+ min</div>
            <div className="text-gray-600">Total Learning Time</div>
          </div>
          <div className="p-6 bg-purple-50 rounded-lg border border-purple-200">
            <div className="text-3xl font-bold text-purple-600 mb-2">100%</div>
            <div className="text-gray-600">Science-Backed</div>
          </div>
        </div>
      </div>
    </div>
  );
}
