import type {Metadata} from 'next';
import './globals.css'; // Global styles
import { MatchProvider } from '@/hooks/use-match-session';
import { Inter, JetBrains_Mono } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'MatchDay Tracker',
  description: 'Log and track football match results',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body suppressHydrationWarning className="bg-white text-slate-900 font-sans">
        <MatchProvider>
          {children}
        </MatchProvider>
      </body>
    </html>
  );
}
