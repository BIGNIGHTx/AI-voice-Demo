import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import Chatbot from '@/components/Chatbot';

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

const sukhumvit = localFont({
  src: "./font/SukhumvitSet-Medium.ttf",
  variable: "--font-sukhumvit",
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
    <html lang="th" className={`${montserrat.variable} ${sukhumvit.variable}`}>
      <body className="font-sans antialiased">
        {children}
        <Chatbot />
      </body>
    </html>
  );
}
