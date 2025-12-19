'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { HelpCircle, MessageCircle, Phone, Mail, X } from 'lucide-react';
import Link from 'next/link';

const QUICK_HELP = [
  {
    icon: HelpCircle,
    title: 'FAQ',
    description: 'Answers to common questions',
    action: () => {
      const faqSection = document.getElementById('faq');
      if (faqSection) {
        faqSection.scrollIntoView({ behavior: 'smooth' });
      }
    },
    link: '/#faq',
  },
  {
    icon: Phone,
    title: 'Call Us',
    description: '(404) 555-1234',
    action: () => (window.location.href = 'tel:+14045551234'),
  },
  {
    icon: MessageCircle,
    title: 'Chat',
    description: 'Real-time support',
    action: () => {
      if (window.Tawk_API?.toggle) {
        window.Tawk_API.toggle();
      }
    },
  },
  {
    icon: Mail,
    title: 'Email',
    description: 'hello@tasteofgratitude.com',
    action: () => (window.location.href = 'mailto:hello@tasteofgratitude.com'),
  },
];

export default function HelpCenter() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {/* Help Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="sm"
        variant="outline"
        className="border-emerald-500/50 text-emerald-600 hover:bg-emerald-600 hover:text-white gap-2"
        aria-label="Help center"
        aria-expanded={isOpen}
        title="Need help?"
      >
        <HelpCircle className="h-4 w-4" />
        <span className="hidden sm:inline text-xs">Help</span>
      </Button>

      {/* Help Panel */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 bg-white border rounded-lg shadow-2xl p-6 z-50 min-w-[380px] max-w-sm"
          role="region"
          aria-label="Help and support options"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">How can we help?</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-100 rounded"
              aria-label="Close help panel"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2 mb-4">
            {QUICK_HELP.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.title}
                  onClick={() => {
                    item.action();
                    setIsOpen(false);
                  }}
                  className="w-full text-left p-3 hover:bg-gray-50 rounded-lg border border-gray-200 hover:border-[#D4AF37] transition-all group"
                  role="menuitem"
                >
                  <div className="flex items-start gap-3">
                    <Icon className="h-5 w-5 text-[#D4AF37] flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 text-sm group-hover:text-[#D4AF37]">
                        {item.title}
                      </p>
                      <p className="text-xs text-gray-600 truncate">
                        {item.description}
                      </p>
                    </div>
                    <span className="text-gray-400 group-hover:text-[#D4AF37] flex-shrink-0">
                      →
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Popular Topics */}
          <div className="border-t pt-4">
            <h4 className="text-xs font-bold text-gray-900 uppercase mb-2">
              Popular Topics
            </h4>
            <div className="space-y-1 text-xs">
              {[
                { title: 'How to use sea moss gel', href: '/explore/learn' },
                { title: 'Shipping & tracking', href: '/contact' },
                { title: 'Returns & refunds', href: '/policies' },
                { title: 'Account & orders', href: '/profile' },
              ].map((topic) => (
                <Link
                  key={topic.title}
                  href={topic.href}
                  className="block px-2 py-1.5 text-gray-600 hover:text-[#D4AF37] hover:bg-gray-50 rounded transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  • {topic.title}
                </Link>
              ))}
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-900 leading-relaxed">
              <strong>Response times:</strong> Phone calls answered 9am-5pm ET.
              Chat available during business hours. Email responses within 24
              hours.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
