// Server component wrapper to force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import Client from './Client';

export default function LearnPage() {
  return <Client />;
}
