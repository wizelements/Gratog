'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Send } from 'lucide-react';
import RetentionForm from '@/components/RetentionForm';
import { getActiveMarketPickups } from '@/data/markets';

/**
 * Optional Telegram alerts opt-in page.
 *
 * Telegram is offered as a free, instant channel for weekly menu alerts. It is
 * completely optional and does not replace email. Checkout, lead capture, and
 * preorder flows work the same whether Telegram is configured or not.
 *
 * Env required to show the bot button:
 *   NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=tasteofgratitude_bot
 *
 * Optional channel/group link:
 *   NEXT_PUBLIC_TELEGRAM_CHANNEL_URL=https://t.me/tasteofgratitude
 */

export default function TelegramAlertsPage() {
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
  const channelUrl = process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_URL;
  const botUrl = botUsername
    ? `https://t.me/${botUsername}?start=weekly_menu_alerts`
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href="/"
            className="text-sm text-stone-600 hover:text-stone-900 flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> Back home
          </Link>
        </div>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Send className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-stone-950">Get Telegram alerts</h1>
          <p className="text-stone-600 mt-2">
            Optional instant weekly menu alerts on Telegram. Email reminders still go out as usual.
          </p>
        </div>

        <Card className="border-emerald-100 mb-6">
          <CardContent className="p-6 space-y-4">
            <h2 className="font-semibold text-stone-900">How it works</h2>
            <ul className="text-sm text-stone-600 space-y-2 list-disc list-inside">
              <li>Tap the button to open the Taste of Gratitude bot.</li>
              <li>Press Start. That is the opt-in.</li>
              <li>You get one short message when the weekly menu drops.</li>
              <li>No spam. Reply STOP anytime.</li>
            </ul>

            {botUrl ? (
              <Button asChild className="w-full bg-[#0088cc] hover:bg-[#0077b3] text-white">
                <a href={botUrl} target="_blank" rel="noopener noreferrer">
                  <Send className="w-4 h-4 mr-2" />
                  Open Telegram bot
                </a>
              </Button>
            ) : (
              <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg">
                Telegram alerts are not configured yet. Ask the team for the bot link, or sign up with email below to get the menu by email.
              </p>
            )}

            {channelUrl && (
              <p className="text-sm text-center">
                <a href={channelUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline">
                  Join the Taste of Gratitude Telegram channel →
                </a>
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h3 className="font-semibold text-stone-900 text-center">Or stay on the email list</h3>
          <RetentionForm
            intent="telegram_alerts"
            source="telegram_alerts_page"
            title="Get weekly menu alerts"
            description="If you prefer email, or want both channels, drop your email and market below. We will match it to your Telegram opt-in if you also start the bot."
            cta="Get alerts"
            collectEmail
            requireEmail
            collectMarket
            marketOptions={getActiveMarketPickups()}
            metadata={{ channel: 'telegram_alerts_page' }}
          />
        </div>
      </div>
    </div>
  );
}
