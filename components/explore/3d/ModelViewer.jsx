'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Maximize2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ModelViewer({
  modelUrl,
  poster,
  alt = '3D Model',
  ar = false,
  autoRotate = true,
  cameraControls = true,
  exposure = 1,
  environmentImage,
  shadowIntensity = 1,
  className = '',
  onLoad,
  onError
}) {
  const viewerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const loadModelViewer = async () => {
      try {
        if (typeof window !== 'undefined' && !customElements.get('model-viewer')) {
          await import('@google/model-viewer');
        }
      } catch (err) {
        console.error('Failed to load model-viewer:', err);
        setError('Failed to load 3D viewer');
      }
    };

    loadModelViewer();
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const handleLoad = () => {
      setLoading(false);
      onLoad?.();
    };

    const handleError = (event) => {
      setLoading(false);
      setError('Failed to load 3D model');
      onError?.(event);
    };

    viewer.addEventListener('load', handleLoad);
    viewer.addEventListener('error', handleError);

    return () => {
      viewer.removeEventListener('load', handleLoad);
      viewer.removeEventListener('error', handleError);
    };
  }, [onLoad, onError]);

  const toggleFullscreen = async () => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    try {
      if (!document.fullscreenElement) {
        await viewer.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen failed:', err);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}>
        <div className="text-center p-8">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <model-viewer
        ref={viewerRef}
        src={modelUrl}
        poster={poster}
        alt={alt}
        ar={ar}
        ar-modes={ar ? "webxr scene-viewer quick-look" : undefined}
        camera-controls={cameraControls}
        auto-rotate={autoRotate}
        exposure={exposure}
        environment-image={environmentImage}
        shadow-intensity={shadowIntensity}
        style={{
          width: '100%',
          height: '100%',
          minHeight: '400px'
        }}
      />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-2" />
            <p className="text-gray-600 text-sm">Loading 3D model...</p>
          </div>
        </div>
      )}

      {!loading && (
        <Button
          variant="outline"
          size="icon"
          className="absolute top-4 right-4 bg-white hover:bg-gray-100 shadow-lg"
          onClick={toggleFullscreen}
          aria-label="Toggle fullscreen"
        >
          <Maximize2 className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
