import GoogleAnalytics from '@/components/GoogleAnalytics';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { buildApiUrl } from '@/lib/apiConfig';
import { cn } from '@/lib/utils';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { ClientLayout } from './ClientLayout';
import './globals.css';
import { Providers } from './providers';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const appTitle = 'Apple Repair Services - Affordable & Reliable';
const appMainDescription =
  'Experience top-notch Apple repair services at unbeatable prices - online and in-store. From iPhones to Macs, we offer a wide range of services for all your Apple needs.';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export async function generateMetadata(): Promise<Metadata> {
  const fallbackTitle = appTitle;
  const fallbackDesc = appMainDescription;
  try {
    const url = buildApiUrl('/store/public');
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (res.ok) {
      const data = await res.json();
      const s = data?.settings || {};
      const title = s.metaTitle || s.storeName || fallbackTitle;
      const description = s.metaDescription || s.description || fallbackDesc;
      return {
        title,
        description,
        openGraph: {
          title,
          description,
          siteName: s.storeName || fallbackTitle,
          type: 'website',
        },
        twitter: { card: 'summary', title, description },
      };
    }
  } catch (err) {
    // ignore
  }
  return { title: fallbackTitle, description: fallbackDesc };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={cn(
        'h-full',
        'antialiased',
        geistSans.variable,
        geistMono.variable,
        'font-sans'
      )}
    >
      <body className="min-h-screen flex flex-col">
        <Providers>
          <GoogleAnalytics />
          <TooltipProvider>
            <ClientLayout>{children}</ClientLayout>
          </TooltipProvider>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
