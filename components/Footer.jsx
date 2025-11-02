'use client';

import Link from 'next/link';
import { Facebook, Instagram, Mail } from 'lucide-react';
import NewsletterSignup from '@/components/NewsletterSignup';

export default function Footer() {
  return (
    <footer className="border-t bg-gradient-to-b from-muted/30 to-muted/60">
      {/* Newsletter Section */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-b">
        <div className="container py-12">
          <div className="max-w-2xl mx-auto">
            <NewsletterSignup />
          </div>
        </div>
      </div>

      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <h3 className="text-xl font-bold mb-4 bg-gradient-to-r from-[#D4AF37] to-[#8B7355] bg-clip-text text-transparent">
              Taste of Gratitude
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Nourishing your wellness journey with nature's finest sea moss creations.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#D4AF37]/10 rounded-full text-xs font-semibold text-[#D4AF37]">
              🌿 100% Natural & Organic
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4 text-lg">Quick Links</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link 
                  href="/catalog" 
                  className="text-muted-foreground hover:text-[#D4AF37] transition-colors inline-flex items-center gap-2 group"
                >
                  <span className="w-0 group-hover:w-2 h-0.5 bg-[#D4AF37] transition-all" />
                  Shop Products
                </Link>
              </li>
              <li>
                <Link 
                  href="/markets" 
                  className="text-muted-foreground hover:text-[#D4AF37] transition-colors inline-flex items-center gap-2 group"
                >
                  <span className="w-0 group-hover:w-2 h-0.5 bg-[#D4AF37] transition-all" />
                  Find Us at Markets
                </Link>
              </li>
              <li>
                <Link 
                  href="/community" 
                  className="text-muted-foreground hover:text-[#D4AF37] transition-colors inline-flex items-center gap-2 group"
                >
                  <span className="w-0 group-hover:w-2 h-0.5 bg-[#D4AF37] transition-all" />
                  Community
                </Link>
              </li>
              <li>
                <Link 
                  href="/about" 
                  className="text-muted-foreground hover:text-[#D4AF37] transition-colors inline-flex items-center gap-2 group"
                >
                  <span className="w-0 group-hover:w-2 h-0.5 bg-[#D4AF37] transition-all" />
                  Our Story
                </Link>
              </li>
              <li>
                <Link 
                  href="/contact" 
                  className="text-muted-foreground hover:text-[#D4AF37] transition-colors inline-flex items-center gap-2 group"
                >
                  <span className="w-0 group-hover:w-2 h-0.5 bg-[#D4AF37] transition-all" />
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Support & Legal */}
          <div>
            <h4 className="font-semibold mb-4 text-lg">Support & Legal</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link 
                  href="/faq" 
                  className="text-muted-foreground hover:text-[#D4AF37] transition-colors inline-flex items-center gap-2 group"
                >
                  <span className="w-0 group-hover:w-2 h-0.5 bg-[#D4AF37] transition-all" />
                  FAQ
                </Link>
              </li>
              <li>
                <Link 
                  href="/terms" 
                  className="text-muted-foreground hover:text-[#D4AF37] transition-colors inline-flex items-center gap-2 group"
                >
                  <span className="w-0 group-hover:w-2 h-0.5 bg-[#D4AF37] transition-all" />
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link 
                  href="/privacy" 
                  className="text-muted-foreground hover:text-[#D4AF37] transition-colors inline-flex items-center gap-2 group"
                >
                  <span className="w-0 group-hover:w-2 h-0.5 bg-[#D4AF37] transition-all" />
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link 
                  href="/rewards" 
                  className="text-muted-foreground hover:text-[#D4AF37] transition-colors inline-flex items-center gap-2 group"
                >
                  <span className="w-0 group-hover:w-2 h-0.5 bg-[#D4AF37] transition-all" />
                  Rewards Program
                </Link>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="font-semibold mb-4 text-lg">Connect With Us</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Follow us for wellness tips, recipes, and special offers!
            </p>
            <div className="flex space-x-3">
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-muted hover:bg-[#D4AF37] text-muted-foreground hover:text-white transition-all flex items-center justify-center group"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5 group-hover:scale-110 transition-transform" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-muted hover:bg-[#D4AF37] text-muted-foreground hover:text-white transition-all flex items-center justify-center group"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5 group-hover:scale-110 transition-transform" />
              </a>
              <a
                href="mailto:hello@tasteofgratitude.com"
                className="w-10 h-10 rounded-full bg-muted hover:bg-[#D4AF37] text-muted-foreground hover:text-white transition-all flex items-center justify-center group"
                aria-label="Email"
              >
                <Mail className="h-5 w-5 group-hover:scale-110 transition-transform" />
              </a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t text-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Taste of Gratitude. Crafted with ❤️ for your wellness journey.
          </p>
        </div>
      </div>
    </footer>
  );
}
