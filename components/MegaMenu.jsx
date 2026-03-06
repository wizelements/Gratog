'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, Sparkles, Leaf } from 'lucide-react';

const MENU_ITEMS = {
  Shop: {
    icon: Sparkles,
    sections: [
      {
        title: 'Products',
        items: [
          { label: 'All Products', href: '/catalog' },
          { label: 'Sea Moss Gel', href: '/catalog?category=gel' },
          { label: 'Wellness Shots', href: '/catalog?category=shot' },
          { label: 'Lemonades', href: '/catalog?category=lemonade' },
          { label: 'Juices', href: '/catalog?category=juice' },
        ],
      },
      {
        title: 'Special',
        items: [
          { label: 'Bundles & Discounts', href: '/catalog?type=bundle' },
          { label: 'Bestsellers', href: '/catalog?sort=popular' },
          { label: 'New Arrivals', href: '/catalog?sort=newest' },
        ],
      },
    ],
  },
  Learn: {
    icon: Leaf,
    sections: [
      {
        title: 'Education',
        items: [
          { label: 'What is Sea Moss?', href: '/#what-is-sea-moss' },
          { label: 'Health Benefits', href: '/#benefits' },
          { label: 'How to Use', href: '/explore/learn' },
          { label: 'Ingredients Guide', href: '/explore/ingredients' },
        ],
      },
      {
        title: 'Community',
        items: [
          { label: 'Explore Content', href: '/explore' },
          { label: 'Games & Quizzes', href: '/explore/games' },
          { label: 'Customer Stories', href: '/explore/showcase' },
        ],
      },
    ],
  },
};

export default function MegaMenu({ trigger = 'Catalog', onClick }) {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef(null);
  const containerRef = useRef(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 200);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const menuConfig = MENU_ITEMS[trigger] || MENU_ITEMS.Shop;
  const Icon = menuConfig.icon;

  return (
    <div
      ref={containerRef}
      className="relative group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        className="text-sm font-medium transition-all hover:text-[#D4AF37] relative group/button flex items-center gap-1 py-2"
        onClick={() => onClick?.()}
      >
        {trigger}
        <ChevronDown
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Mega Menu Dropdown */}
      {isOpen && (
        <div
          className="absolute left-0 top-full mt-0 bg-white border-t-4 border-[#D4AF37] shadow-2xl rounded-b-lg min-w-max z-50"
          role="menu"
        >
          <div className="grid grid-cols-2 gap-8 p-6 min-w-[600px]">
            {menuConfig.sections.map((section, idx) => (
              <div key={idx} className="space-y-3">
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  {idx === 0 && <Icon className="h-4 w-4 text-[#D4AF37]" />}
                  {section.title}
                </h3>
                <ul className="space-y-2">
                  {section.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="text-sm text-gray-700 hover:text-[#D4AF37] hover:translate-x-1 transition-all flex items-center gap-2 group"
                        onClick={() => setIsOpen(false)}
                        role="menuitem"
                      >
                        <span className="h-1.5 w-1.5 bg-[#D4AF37] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Menu Footer with Featured */}
          <div className="border-t bg-gradient-to-r from-[#D4AF37]/5 to-teal-100/5 px-6 py-4">
            <p className="text-xs text-gray-600 mb-2 font-medium">Featured</p>
            <div className="flex gap-4">
              {[
                { label: 'Bestsellers', href: '/catalog?sort=popular' },
                { label: 'New Products', href: '/catalog?sort=newest' },
                { label: 'Rewards', href: '/rewards' },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium text-[#D4AF37] hover:underline"
                  onClick={() => setIsOpen(false)}
                  role="menuitem"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
