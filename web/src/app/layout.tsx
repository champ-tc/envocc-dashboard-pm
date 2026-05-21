import type { Metadata } from "next";
import { Toaster } from 'react-hot-toast';
import { Kanit } from 'next/font/google';
import "./globals.css";

const kanit = Kanit({
  subsets: ['thai', 'latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-kanit',
});

export const metadata: Metadata = { title: "PM2.5 Patient" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" data-theme="winter" suppressHydrationWarning>
      <body className={`${kanit.variable} ${kanit.className} bg-slate-50 text-slate-900 antialiased`} suppressHydrationWarning>
        <Toaster position="top-right" />
        {children}
      </body>
    </html>
  );
}