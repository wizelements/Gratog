'use client';

import { useEffect, useState, useCallback, createContext, useContext } from 'react';

const AnnouncerContext = createContext(null);

/**
 * Live region announcer for screen readers
 * Use for dynamic content updates: cart changes, form submissions, etc.
 */
export function A11yAnnouncerProvider({ children }) {
  const [message, setMessage] = useState('');
  const [politeness, setPoliteness] = useState('polite');

  const announce = useCallback((text, priority = 'polite') => {
    setMessage('');
    setPoliteness(priority);
    // Small delay to ensure screen readers pick up the change
    setTimeout(() => setMessage(text), 100);
  }, []);

  const announcePolite = useCallback((text) => announce(text, 'polite'), [announce]);
  const announceAssertive = useCallback((text) => announce(text, 'assertive'), [announce]);

  return (
    <AnnouncerContext.Provider value={{ announce, announcePolite, announceAssertive }}>
      {children}
      {/* Polite live region */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeness === 'polite' ? message : ''}
      </div>
      {/* Assertive live region for urgent announcements */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {politeness === 'assertive' ? message : ''}
      </div>
    </AnnouncerContext.Provider>
  );
}

/**
 * Hook to access the announcer
 * @returns {{ announce: (text: string, priority?: 'polite' | 'assertive') => void, announcePolite: (text: string) => void, announceAssertive: (text: string) => void }}
 */
export function useA11yAnnouncer() {
  const context = useContext(AnnouncerContext);
  if (!context) {
    // Return no-op functions if used outside provider
    return {
      announce: () => {},
      announcePolite: () => {},
      announceAssertive: () => {},
    };
  }
  return context;
}

/**
 * Standalone announcer component for simple use cases
 * Place near dynamic content that needs to be announced
 */
export function A11yAnnounce({ message, priority = 'polite' }) {
  if (!message) return null;

  return (
    <div
      role={priority === 'assertive' ? 'alert' : 'status'}
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}
