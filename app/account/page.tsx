import Link from 'next/link';
import { Mail, ShoppingBag, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default function CustomerAccountPage() {
  return (
    <main className="min-h-screen bg-stone-50 px-4 py-16 sm:py-24">
      <Card className="mx-auto max-w-xl rounded-3xl border-stone-200 p-6 text-center shadow-sm sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <User className="h-8 w-8 text-emerald-700" aria-hidden="true" />
        </div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-stone-950">Account access is temporarily unavailable</h1>
        <p className="mt-4 leading-7 text-stone-600">
          We are not offering phone-based account sign-in right now. No verification code will be sent and this page will not collect your phone number.
        </p>
        <p className="mt-3 leading-7 text-stone-600">
          To check an existing order, use the link in your order email or contact us for help.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Button asChild className="h-12 rounded-full bg-emerald-700 text-white hover:bg-emerald-800">
            <Link href="/catalog">
              <ShoppingBag className="mr-2 h-4 w-4" aria-hidden="true" />
              Shop the menu
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-12 rounded-full border-emerald-200 text-emerald-800 hover:bg-emerald-50">
            <Link href="/contact">
              <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
              Contact support
            </Link>
          </Button>
        </div>
      </Card>
    </main>
  );
}
