'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Client-side route protection for admin pages
 * 
 * IMPORTANT: This is a UX enhancement only, NOT a security boundary.
 * All actual security is enforced server-side via:
 * 1. Middleware (middleware.ts) - blocks unauthenticated requests to /admin/*
 * 2. API routes - each validates admin token via requireAdmin()
 * 
 * This component provides a smooth loading experience and
 * redirects users who somehow reach admin pages without auth.
 */
export default function ProtectedRoute({ children }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const response = await fetch('/api/admin/auth/me', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        // Not authenticated - redirect to login
        const currentPath = window.location.pathname;
        router.push(`/admin/login?redirect=${encodeURIComponent(currentPath)}`);
        return;
      }
      
      const data = await response.json();
      
      if (data.success && data.user && data.user.role === 'admin') {
        setIsAuthenticated(true);
      } else {
        // Invalid response - redirect to login
        router.push('/admin/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/admin/login');
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37] mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Will redirect, show nothing
    return null;
  }

  return children;
}
