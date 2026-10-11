'use client';

import { useState } from 'react';

const PAGE = 'https://tasteofgratitude.shop/share';
const WIDGET = '<script async src="https://tasteofgratitude.shop/taste-share-widget.js"></script>';

export default function ShareActions() {
  const [feedback, setFeedback] = useState('');

  async function copy(text, success) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard not available');
      await navigator.clipboard.writeText(text);
      setFeedback(success);
    } catch {
      setFeedback('Copy is unavailable in this browser. You can select the link above.');
    }
  }

  async function share() {
    if (typeof navigator.share !== 'function') {
      await copy(PAGE, 'Page link copied. Ready to send.');
      return;
    }
    try {
      await navigator.share({
        title: 'Taste of Gratitude',
        text: 'Fresh Georgia-made drinks and sea moss. Explore Taste of Gratitude.',
        url: PAGE,
      });
      setFeedback('Share sheet opened.');
    } catch (error) {
      if (error?.name !== 'AbortError') await copy(PAGE, 'Page link copied. Ready to send.');
    }
  }

  return (
    <div className="tog-actions" aria-label="Share Taste of Gratitude">
      <button type="button" className="tog-action-primary" onClick={share}>Share with someone <span aria-hidden="true">↗</span></button>
      <button type="button" className="tog-action-secondary" onClick={() => copy(PAGE, 'Share page link copied.')}>Copy page link</button>
      <button type="button" className="tog-action-tertiary" onClick={() => copy(WIDGET, 'Embeddable widget code copied.')}>Copy widget embed code</button>
      <p className="tog-feedback" role="status" aria-live="polite">{feedback || 'Send the link, show the QR, or embed the widget on another website.'}</p>
    </div>
  );
}
