// Server component wrapper to force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import ProfileClient from './ProfileClient';

export default function ProfilePage() {
  return <ProfileClient />;
}
