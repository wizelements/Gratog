'use client';

import BenefitSort from '@/components/explore/games/BenefitSort';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function BenefitSortPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white py-8">
      <div className="container mx-auto px-4">
        <Link href="/explore/games">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Games
          </Button>
        </Link>

        <BenefitSort />
      </div>
    </div>
  );
}
