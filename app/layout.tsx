import type { Metadata } from "next";
import { Montserrat, Sarabun, Great_Vibes } from "next/font/google";

import DemoMockProvider from '@/components/DemoMockProvider';
import AppClientShell from '@/components/auth/AppClientShell';
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

const sarabun = Sarabun({
  weight: ["100", "200", "300", "400", "500", "600", "700", "800"],
  subsets: ["thai", "latin"],
  variable: "--font-sarabun",
  display: "swap",
});

const greatVibes = Great_Vibes({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-great-vibes",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI Voice File Manager",
  description: "AI Voice Analysis Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${montserrat.variable} ${sarabun.variable} ${greatVibes.variable}`}>
      <body className="font-sans antialiased">
        <DemoMockProvider>{children}</DemoMockProvider>
        <AppClientShell />
      </body>
    </html>
  );
}
