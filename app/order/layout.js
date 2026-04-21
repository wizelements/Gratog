import Script from 'next/script';

export default function OrderLayout({ children }) {
  return (
    <>
      <Script
        id="square-web-payments"
        src="https://web.squarecdn.com/v1/square.js"
        strategy="afterInteractive"
      />
      {children}
    </>
  );
}
