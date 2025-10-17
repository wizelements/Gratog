'use client';

import UGCChallenge from '@/components/UGCChallenge';

export default function UGCPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 py-12">
      <div className="container mx-auto px-4">
        <UGCChallenge />
      </div>
    </div>
  );
}