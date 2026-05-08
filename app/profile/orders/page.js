// Server component wrapper to force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import Client from './Client';

export default function Page() {
  return <Client />;
}
