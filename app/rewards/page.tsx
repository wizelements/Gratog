import { permanentRedirect } from 'next/navigation';

export default function RewardsRedirect() {
  permanentRedirect('/catalog');
}
