import type { Metadata } from "next";
import { Toaster } from 'react-hot-toast';
import { Kanit } from 'next/font/google';
import "./globals.css";

const appFont = Kanit({
    subsets: ['thai', 'latin'],
    weight: ['400', '500', '600', '700', '800', '900'],
    display: 'swap',
    variable: '--font-app',
});

export const metadata: Metadata = {
  title: "PM2.5 Patient Database",
  description: "ระบบฐานข้อมูลผู้ป่วยจากฝุ่นละอองขนาดไม่เกิน 2.5 ไมครอน (PM2.5)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={appFont.variable} lang="th" data-theme="winter" suppressHydrationWarning>
      <body className="bg-slate-50 text-slate-900 antialiased" suppressHydrationWarning>
        <Toaster position="top-right" />
        {children}
      </body>
    </html>
  );
}
