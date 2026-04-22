'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Leaf, FlaskConical, ShieldCheck, MapPin } from 'lucide-react';

const differentiators = [
  {
    icon: Leaf,
    title: '100% Natural',
    description:
      'Our sea moss is wildcrafted from pristine ocean waters with no additives, preservatives, or artificial ingredients.',
  },
  {
    icon: FlaskConical,
    title: 'Lab Tested',
    description:
      'Every batch is third-party tested for purity, heavy metals, and contaminants to ensure the highest quality.',
  },
  {
    icon: ShieldCheck,
    title: 'Satisfaction Guarantee',
    description:
      "Not completely satisfied? We offer a 30-day money-back guarantee. Your wellness journey is risk-free with us.",
  },
  {
    icon: MapPin,
    title: 'Market Fresh Pickup',
    description:
      'Find us at Serenbe (Saturdays 9am–1pm) and Dunwoody (Saturdays 9am–12pm) farmers markets. Local delivery also available.',
  },
];

export default function WhyChooseUs() {
  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Why Choose Taste of Gratitude?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            We're committed to providing you with the highest quality sea moss products
            and an exceptional customer experience.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {differentiators.map((item, index) => (
            <Card
              key={index}
              className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-none bg-gradient-to-br from-emerald-50 to-teal-50"
            >
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                  <item.icon className="h-7 w-7 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
