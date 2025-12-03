'use client';

import IngredientRush from '@/components/explore/games/IngredientRush';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function IngredientRushPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-white py-8">
      <div className="container mx-auto px-4">
        <Link href="/explore/games">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Games
          </Button>
        </Link>

        <IngredientRush />
      </div>
    </div>
  );
}
