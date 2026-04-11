import type { Metadata } from "next";
import { Montserrat, Sarabun } from "next/font/google";
import "./globals.css";
import Chatbot from '@/components/Chatbot';

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
    <html lang="th" className={`${montserrat.variable} ${sarabun.variable}`}>
      <body className="font-sans antialiased">
        {children}
        <Chatbot />
      </body>
    </html>
  );
}
