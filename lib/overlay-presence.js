const OVERLAY_COUNT_KEY = '__gratogBlockingOverlayCount';
const OVERLAY_ATTR = 'data-overlay-open';

function canUseDOM() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function setOverlayAttribute(count) {
  if (!canUseDOM()) {
    return;
  }

  if (count > 0) {
    document.body.setAttribute(OVERLAY_ATTR, 'true');
    return;
  }

  document.body.removeAttribute(OVERLAY_ATTR);
}

export function acquireBlockingOverlay() {
  if (!canUseDOM()) {
    return () => {};
  }

  const currentCount = Number(window[OVERLAY_COUNT_KEY] || 0) + 1;
  window[OVERLAY_COUNT_KEY] = currentCount;
  setOverlayAttribute(currentCount);

  let isReleased = false;

  return () => {
    if (isReleased || !canUseDOM()) {
      return;
    }

    isReleased = true;
    const nextCount = Math.max(Number(window[OVERLAY_COUNT_KEY] || 1) - 1, 0);

    if (nextCount === 0) {
      delete window[OVERLAY_COUNT_KEY];
    } else {
      window[OVERLAY_COUNT_KEY] = nextCount;
    }

    setOverlayAttribute(nextCount);
  };
}
