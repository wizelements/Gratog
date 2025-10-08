import Link from 'next/link';
import { Facebook, Instagram, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-lg font-bold mb-4 bg-gradient-to-r from-[#D4AF37] to-[#8B7355] bg-clip-text text-transparent">
              Taste of Gratitude
            </h3>
            <p className="text-sm text-muted-foreground">
              Nourishing your wellness journey with nature's finest sea moss creations.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/catalog" className="text-muted-foreground hover:text-[#D4AF37] transition-colors">
                  Shop Products
                </Link>
              </li>
              <li>
                <Link href="/markets" className="text-muted-foreground hover:text-[#D4AF37] transition-colors">
                  Find Us at Markets
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-muted-foreground hover:text-[#D4AF37] transition-colors">
                  Our Story
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-muted-foreground hover:text-[#D4AF37] transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="font-semibold mb-4">Connect</h4>
            <div className="flex space-x-4">
              <a
                href="#"
                className="text-muted-foreground hover:text-[#D4AF37] transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="text-muted-foreground hover:text-[#D4AF37] transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="mailto:hello@tasteofgratitude.com"
                className="text-muted-foreground hover:text-[#D4AF37] transition-colors"
                aria-label="Email"
              >
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Taste of Gratitude. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
