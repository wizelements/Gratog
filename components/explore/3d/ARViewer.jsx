'use client';

import { useState } from 'react';
import ModelViewer from './ModelViewer';
import { Card, CardContent } from '@/components/ui/card';
import { Smartphone, Scan, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ARViewer({
  modelUrl,
  iosModelUrl,
  poster,
  alt,
  className = '',
  onARActivate
}) {
  const [showInstructions, setShowInstructions] = useState(true);

  const handleARClick = () => {
    setShowInstructions(false);
    onARActivate?.();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {showInstructions && (
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong className="font-semibold">View in AR:</strong> Tap the AR button below to place this product in your space.
            <ul className="mt-2 space-y-1 text-sm">
              <li className="flex items-start gap-2">
                <Smartphone className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span><strong>Android:</strong> Opens in AR viewer</span>
              </li>
              <li className="flex items-start gap-2">
                <Scan className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span><strong>iOS:</strong> Opens in Quick Look AR</span>
              </li>
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <ModelViewer
            modelUrl={modelUrl}
            poster={poster}
            alt={alt}
            ar={true}
            autoRotate={true}
            cameraControls={true}
            exposure={1.2}
            shadowIntensity={1}
            className="w-full min-h-[500px]"
            onLoad={handleARClick}
          />
        </CardContent>
      </Card>

      <div className="text-center text-sm text-gray-600">
        <p>Rotate, zoom, and explore from every angle</p>
        <p className="mt-1">AR works best in well-lit areas with flat surfaces</p>
      </div>
    </div>
  );
}
