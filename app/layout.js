import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FloatingCart from '@/components/FloatingCart';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Taste of Gratitude | Premium Sea Moss Gel',
  description: 'Nourishing your wellness journey with nature\'s finest sea moss creations. Shop our premium sea moss gel products.',
  keywords: 'sea moss, sea moss gel, elderberry, wellness, natural supplements, immune support',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <FloatingCart />
        </div>
        <Toaster />
      </body>
    </html>
  );
}
