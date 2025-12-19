'use client';

/**
 * Admin Layout Wrapper - Simple passthrough component
 * Admin routes have their own layout in app/(admin)/layout.js
 * This just ensures consistent component structure
 */
export default function AdminLayoutWrapper({ children }) {
  return <>{children}</>;
}
