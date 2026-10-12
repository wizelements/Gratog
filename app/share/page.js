import ShareActions from './ShareActions';

export const dynamic = 'force-static';

export const metadata = {
  title: 'Share Taste of Gratitude | Fresh Georgia Drinks & Sea Moss',
  description: 'Share Taste of Gratitude with someone who loves good flavors. Explore our Georgia-made lemonades, sea moss gels and market favorites.',
  alternates: { canonical: '/share' },
  openGraph: {
    title: 'Good things are meant to be shared | Taste of Gratitude',
    description: 'Small-batch drinks, sea moss and fresh favorites, handcrafted in Atlanta. Ordering available in Georgia only.',
    url: 'https://tasteofgratitude.shop/share',
    type: 'website',
    siteName: 'Taste of Gratitude',
    images: ['/og-image.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Share Taste of Gratitude',
    description: 'Fresh flavors. Made with gratitude. Handcrafted in Atlanta for Georgia customers.',
    images: ['/og-image.jpg'],
  },
};

const styles = [
  '.tog-share{--ink:#20372d;--forest:#14382b;--gold:#b08042;--cream:#f7f4ec;--line:#dbded2;min-height:80vh;background:radial-gradient(ellipse at 90% 4%,#eff0d9 0%,transparent 43%),radial-gradient(ellipse at 5% 93%,#f3e9d8 0%,transparent 36%),var(--cream);color:var(--ink);font-family:inherit;padding:clamp(2rem,6vw,6rem) 1.25rem 4rem;}',
  '.tog-share *{box-sizing:border-box;}',
  '.tog-shell{max-width:1130px;margin:auto;}',
  '.tog-overline{display:inline-flex;align-items:center;gap:.6rem;font-size:.72rem;font-weight:750;letter-spacing:.18em;text-transform:uppercase;color:#637360;}',
  '.tog-overline::before{content:"";width:23px;height:2px;background:var(--gold);display:block;}',
  '.tog-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(340px,.9fr);gap:clamp(2rem,5vw,5rem);align-items:center;}',
  '.tog-share h1{font-size:clamp(3.25rem,6.6vw,6.7rem);letter-spacing:-.065em;font-weight:650;line-height:.96;max-width:650px;margin:1.3rem 0 1.6rem;}',
  '.tog-share h1 em{font-family:Georgia,serif;font-weight:400;color:#597750;letter-spacing:-.065em;}',
  '.tog-desc{font-size:clamp(1.02rem,1.65vw,1.17rem);max-width:490px;line-height:1.8;color:#536256;margin-bottom:1.6rem;}',
  '.tog-linkbox{display:inline-block;font-size:.96rem;font-weight:650;color:#20432d;background:#eef1e6;padding:.8rem 1rem;border-radius:12px;border:1px solid #d9dfd3;overflow-wrap:anywhere;text-decoration:underline;text-underline-offset:3px;}',
  '.tog-actions{display:flex;flex-wrap:wrap;gap:.65rem;margin-top:1.4rem;max-width:580px;}',
  '.tog-actions button{cursor:pointer;border-radius:12px;padding:.87rem 1.2rem;min-height:46px;border:1px solid #bec9bb;font-size:.88rem;font-weight:700;transition:transform .15s ease,background .15s ease;}',
  '.tog-actions button:hover{transform:translateY(-2px);}',
  '.tog-actions button:focus-visible,.tog-share a:focus-visible{outline:3px solid #bf8d44;outline-offset:3px;}',
  '.tog-action-primary{background:#173e30;color:white;border-color:#173e30!important;}',
  '.tog-action-secondary{background:white;color:#244533;}',
  '.tog-action-tertiary{background:transparent;color:#315040;}',
  '.tog-feedback{flex-basis:100%;font-size:.81rem;color:#5b6c60;min-height:1.35rem;margin:.1rem 0 0;}',
  '.tog-qr-card{background:#183e2f;padding:clamp(1.5rem,3.5vw,3rem);border-radius:28px;color:#fff;position:relative;overflow:hidden;box-shadow:0 25px 65px #13312224;}',
  '.tog-qr-card::before{content:"";position:absolute;width:240px;height:240px;right:-120px;top:-130px;border:1px solid #ffffff24;border-radius:50%;box-shadow:0 0 0 43px #ffffff08,0 0 0 85px #ffffff04;pointer-events:none;}',
  '.tog-qr-top{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:1.5rem;}',
  '.tog-monogram{font-family:Georgia,serif;border:1px solid #b0bda9a0;border-radius:100%;height:44px;width:44px;display:grid;place-items:center;font-size:1.1rem;color:#f3dfaf;}',
  '.tog-qr-label{letter-spacing:.16em;text-transform:uppercase;color:#e0e8d8;font-size:.67rem;font-weight:750;}',
  '.tog-qr-window{background:#fff;border-radius:19px;max-width:290px;margin:0 auto;padding:1rem;box-shadow:0 10px 33px #07150d45;}',
  '.tog-qr-window img{width:100%;height:auto;display:block;image-rendering:pixelated;}',
  '.tog-qr-heading{font-size:clamp(1.65rem,2.7vw,2.45rem);font-family:Georgia,serif;font-weight:400;letter-spacing:-.02em;margin:1.5rem 0 .5rem;text-align:center;}',
  '.tog-qr-caption{text-align:center;line-height:1.55;color:#dce4d6;font-size:.91rem;margin:.2rem auto 1.1rem;max-width:285px;}',
  '.tog-download{text-align:center;display:block;color:#fff;font-size:.84rem;text-underline-offset:4px;margin-top:1.2rem;}',
  '.tog-details{border-top:1px solid var(--line);margin-top:clamp(3rem,6vw,5rem);padding-top:1.6rem;display:grid;grid-template-columns:1fr 1fr 1fr;gap:1.5rem;}',
  '.tog-details>div{padding-right:1rem;}',
  '.tog-details strong{display:block;font-size:.9rem;margin-bottom:.35rem;}',
  '.tog-details p{font-size:.86rem;line-height:1.6;color:#5b6b60;margin:0;}',
  '.tog-details a{color:var(--forest);font-weight:700;text-underline-offset:3px;}',
  '@media(max-width:800px){.tog-grid{grid-template-columns:1fr;gap:2.7rem;}.tog-share h1{font-size:clamp(3.6rem,12vw,5.2rem);}.tog-qr-card{max-width:470px;width:100%;margin:auto;}.tog-details{grid-template-columns:1fr;gap:1.1rem;}.tog-share{padding-top:2.2rem;}}',
  '@media(max-width:410px){.tog-actions button{width:100%;}.tog-qr-card{border-radius:20px;}.tog-share h1{font-size:3.3rem;}}',
  '@media(prefers-reduced-motion:reduce){.tog-share *{transition:none!important;}}',
].join('\n');

export default function SharePage() {
  return (
    <main className="tog-share">
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="tog-shell">
        <div className="tog-grid">
          <section aria-labelledby="tog-share-title">
            <span className="tog-overline">Handcrafted in Atlanta · Made to share</span>
            <h1 id="tog-share-title">A little goodness, <em>passed along.</em></h1>
            <p className="tog-desc">Found a favorite worth sharing? Introduce someone to small-batch lemonades, vibrant market drinks, and sea moss made with gratitude. Send this page or let them scan the code.</p>
            <a className="tog-linkbox" href="https://tasteofgratitude.shop/share">tasteofgratitude.shop/share</a>
            <ShareActions />
          </section>
          <aside className="tog-qr-card" aria-label="Scannable Taste of Gratitude share card">
            <div className="tog-qr-top">
              <span className="tog-qr-label">Taste of Gratitude</span>
              <span className="tog-monogram" aria-hidden="true">TG</span>
            </div>
            <div className="tog-qr-window">
              <img src="/share/qr.svg" width="492" height="492" alt="QR code opening the Taste of Gratitude share page" />
            </div>
            <h2 className="tog-qr-heading">Scan. Discover. Enjoy.</h2>
            <p className="tog-qr-caption">One little scan opens a whole lot of fresh flavor.</p>
            <a className="tog-download" href="/share/qr.svg" download="Taste-of-Gratitude-Share-QR.svg">Save this QR code ↗</a>
          </aside>
        </div>
        <div className="tog-details" aria-label="Explore Taste of Gratitude">
          <div>
            <strong>Find your next favorite</strong>
            <p>Explore drinks, sea moss gels, and other fresh picks. <a href="/catalog">Shop the collection ↗</a></p>
          </div>
          <div>
            <strong>See us at the market</strong>
            <p>Find upcoming markets and available pickup options. <a href="/markets">Explore markets ↗</a></p>
          </div>
          <div>
            <strong>Georgia, with gratitude</strong>
            <p>Georgia customers: local delivery is available for eligible shop products within 35 miles of Atlanta ZIP 30331, verified by address at checkout. Market preorders are currently pickup-only.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
