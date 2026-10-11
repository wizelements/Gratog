/* Taste of Gratitude share widget — no dependencies, no analytics, no checkout integration. */
(function () {
  'use strict';
  var script = document.currentScript;
  if (!script || !script.parentNode) return;

  var isCompact = script.getAttribute('data-variant') === 'compact';
  var host = document.createElement('div');
  host.setAttribute('data-taste-of-gratitude-widget', 'share');
  host.style.cssText = 'display:block;max-width:100%;margin:0 auto;';
  script.parentNode.insertBefore(host, script);
  var root = host.attachShadow({ mode: 'open' });

  var style = document.createElement('style');
  style.textContent = [
    ':host{display:block;contain:content;--ink:#153a2c;--cream:#f8f5ed;color:var(--ink);font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;}',
    '*{box-sizing:border-box;}',
    '.card{display:grid;grid-template-columns:1fr auto;gap:18px;align-items:center;border:1px solid #d6ddce;border-radius:18px;background:var(--cream);padding:22px;max-width:520px;box-shadow:0 12px 24px #193d2510;}',
    '.eyebrow{font-size:10px;letter-spacing:.17em;text-transform:uppercase;color:#63735f;font-weight:800;margin:0 0 9px;}',
    'h3{font-family:Georgia,serif;font-size:25px;letter-spacing:-.03em;line-height:1.15;font-weight:400;margin:0 0 9px;}',
    'p{font-size:13px;color:#5a675d;line-height:1.6;margin:0 0 15px;}',
    '.button{display:inline-flex;align-items:center;justify-content:center;border-radius:10px;background:#173e30;color:white;text-decoration:none;font-size:12px;line-height:1.2;font-weight:750;padding:12px 15px;min-height:40px;}',
    '.button:hover{background:#275542;}',
    '.button:focus-visible,.qr:focus-visible{outline:3px solid #c19655;outline-offset:3px;}',
    '.qr{display:block;background:white;border:1px solid #e4e8de;border-radius:12px;padding:8px;width:125px;flex-shrink:0;}',
    '.qr img{display:block;width:100%;height:auto;image-rendering:pixelated;}',
    '.note{margin-top:8px!important;margin-bottom:0!important;font-size:10px!important;}',
    '.compact{grid-template-columns:1fr 92px;padding:14px;gap:12px;border-radius:12px;}',
    '.compact h3{font-size:20px;}.compact .qr{width:92px;padding:5px;}.compact p,.compact .note{display:none;}',
    '@media(max-width:340px){.card{grid-template-columns:1fr;}.qr{order:-1;}}',
    '@media(prefers-reduced-motion:reduce){*{transition:none!important;}}'
  ].join('\n');

  var card = document.createElement('div');
  card.className = 'card' + (isCompact ? ' compact' : '');
  card.innerHTML =
    '<div><div class="eyebrow">Handcrafted in Atlanta</div>' +
    '<h3>Pass along a little gratitude.</h3>' +
    '<p>Fresh drinks, sea moss, and market favorites. Georgia orders only.</p>' +
    '<a class="button" href="https://tasteofgratitude.shop/share" target="_blank" rel="noopener noreferrer">Discover &amp; share ↗</a>' +
    '<p class="note">Taste of Gratitude · tasteofgratitude.shop</p></div>' +
    '<a class="qr" href="https://tasteofgratitude.shop/share" target="_blank" rel="noopener noreferrer" aria-label="Open Taste of Gratitude share page">' +
    '<img alt="Scan to open Taste of Gratitude" width="108" height="108" loading="lazy" decoding="async" src="https://tasteofgratitude.shop/share/qr.svg"></a>';
  root.appendChild(style);
  root.appendChild(card);
}());
