import { permanentRedirect } from 'next/navigation';

export default function RetiredCommunityPage() {
  permanentRedirect('/about');
}
