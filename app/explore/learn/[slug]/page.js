// Server component wrapper to force dynamic rendering
export const revalidate = 0;

import Client from './Client';

export default async function LearnPage({ params }) {
  const { slug } = await params;

  return <Client initialSlug={slug} />;
}
