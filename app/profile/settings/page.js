// Server component wrapper to force dynamic rendering
export const dynamic = 'force-dynamic';

import Client from './Client';

export default function Page() {
  return <Client />;
}
