'use client';

import { Check, X, Sparkles, Leaf, Heart, Users, Award, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const comparisons = [
  {
    feature: 'Sourcing',
    us: 'Wildcrafted from pristine ocean waters',
    them: 'Farm-raised in controlled environments',
    icon: Leaf,
  },
  {
    feature: 'Preparation',
    us: 'Hand-harvested & sun-dried naturally',
    them: 'Mass-produced with shortcuts',
    icon: Sparkles,
  },
  {
    feature: 'Nutrient Density',
    us: '92 essential minerals preserved',
    them: 'Depleted through processing',
    icon: Heart,
  },
  {
    feature: 'Community',
    us: 'Local markets & wellness events',
    them: 'Online-only, no connection',
    icon: MapPin,
  },
  {
    feature: 'Support',
    us: '14-Day Challenge with guidance',
    them: 'No wellness journey support',
    icon: Award,
  },
  {
    feature: 'Philosophy',
    us: 'Holistic wellness, not just products',
    them: 'Transaction-focused',
    icon: Users,
  },
];

export default function WhyUsComparison() {
  return (
    <section className="py-16 bg-gradient-to-b from-white to-emerald-50">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Why Taste of Gratitude?
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Not all sea moss is created equal. Here's what sets us apart.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {comparisons.map((item, index) => (
            <Card key={index} className="relative overflow-hidden border-emerald-200 hover:shadow-lg transition-shadow">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-teal-500" />
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <item.icon className="w-5 h-5 text-emerald-600" />
                  </div>
                  <CardTitle className="text-lg">{item.feature}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2 p-3 bg-emerald-50 rounded-lg">
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-semibold text-emerald-700 block mb-1">TASTE OF GRATITUDE</span>
                    <p className="text-sm text-emerald-900">{item.us}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg opacity-75">
                  <X className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-semibold text-gray-500 block mb-1">GENERIC BRANDS</span>
                    <p className="text-sm text-gray-600">{item.them}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-emerald-700 font-medium mb-4">
            Experience the difference for yourself
          </p>
          <a 
            href="/catalog" 
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
          >
            <Sparkles className="w-5 h-5" />
            Shop Premium Sea Moss
          </a>
        </div>
      </div>
    </section>
  );
}
