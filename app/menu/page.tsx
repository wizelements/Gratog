import { redirect } from 'next/navigation';

export const metadata = {
  title: "This Week's Menu | Taste of Gratitude",
  description: 'The weekly menu now lives at /weekly-menu. Fresh small-batch sea moss gels, lemonades, refreshers, and shots for Atlanta farmers market pickup.',
  alternates: { canonical: '/weekly-menu' },
};

export default function MenuRedirectPage() {
  redirect('/weekly-menu');
}
