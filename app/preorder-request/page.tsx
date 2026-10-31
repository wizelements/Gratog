import { redirect } from 'next/navigation';

export default async function LegacyPreorderRequest({searchParams}: {
  searchParams: Promise<{product?:string}>;
}) {
  const product=(await searchParams).product||'';
  redirect(product ? `/order-request?product=${encodeURIComponent(product)}` : '/order-request');
}
