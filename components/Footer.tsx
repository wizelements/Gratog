import Link from 'next/link';
import { Facebook, Instagram, Twitter, Youtube, Mail, Phone, MapPin } from 'lucide-react';

const footerLinks = {
  shop: [
    { label: 'All Products', href: '/catalog' },
    { label: 'Sea Moss Gels', href: '/catalog?category=sea-moss-gels' },
    { label: 'Lemonades', href: '/catalog?category=lemonades' },
    { label: 'Bundles', href: '/catalog?category=bundles' },
  ],
  learn: [
    { label: 'What is Sea Moss?', href: '/explore/learn/what-is-sea-moss' },
    { label: 'Health Benefits', href: '/explore/learn/health-benefits' },
    { label: 'How to Use', href: '/explore/learn/how-to-use' },
    { label: 'FAQ', href: '/explore/learn/faq' },
  ],
  company: [
    { label: 'About Us', href: '/about' },
    { label: 'Our Story', href: '/about#story' },
    { label: 'Contact', href: '/contact' },
    { label: 'Careers', href: '/careers' },
  ],
  support: [
    { label: 'Shipping Info', href: '/shipping' },
    { label: 'Returns', href: '/returns' },
    { label: 'Track Order', href: '/track-order' },
    { label: 'Help Center', href: '/help' },
  ],
};

const socialLinks = [
  { icon: Facebook, href: '#', label: 'Facebook' },
  { icon: Instagram, href: '#', label: 'Instagram' },
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Youtube, href: '#', label: 'YouTube' },
];

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1 mb-8 lg:mb-0">
            <Link href="/" className="inline-block">
              <span className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Taste of Gratitude
              </span>
            </Link>
            <p className="mt-4 text-sm text-gray-400 max-w-xs">
              Premium wildcrafted sea moss products. Hand-harvested with care for your wellness journey.
            </p>
            
            {/* Contact Info */}
            <div className="mt-6 space-y-3">
              <a 
                href="tel:+1234567890" 
                className="flex items-center gap-2 text-sm hover:text-emerald-400 transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span>(123) 456-7890</span>
              </a>
              <a 
                href="mailto:hello@tasteofgratitude.shop" 
                className="flex items-center gap-2 text-sm hover:text-emerald-400 transition-colors"
              >
                <Mail className="w-4 h-4" />
                <span>hello@tasteofgratitude.shop</span>
              </a>
              <div className="flex items-start gap-2 text-sm text-gray-400">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Atlanta, GA</span>
              </div>
            </div>
            
            {/* Social Links */}
            <div className="flex gap-4 mt-6">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Shop Links */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Shop</h3>
            <ul className="space-y-3">
              {footerLinks.shop.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-emerald-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Learn Links */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Learn</h3>
            <ul className="space-y-3">
              {footerLinks.learn.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-emerald-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Company</h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-emerald-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Support</h3>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-emerald-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} Taste of Gratitude. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
              <Link href="/privacy" className="text-sm text-gray-500 hover:text-emerald-400 transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-sm text-gray-500 hover:text-emerald-400 transition-colors">
                Terms of Service
              </Link>
              <Link href="/accessibility" className="text-sm text-gray-500 hover:text-emerald-400 transition-colors">
                Accessibility
              </Link>
              <Link href="/sitemap" className="text-sm text-gray-500 hover:text-emerald-400 transition-colors">
                Sitemap
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
