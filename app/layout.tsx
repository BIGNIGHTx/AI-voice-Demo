import type { Metadata } from "next";
import { Sarabun } from "next/font/google";
import "./globals.css";
import Chatbot from '@/components/Chatbot';

const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800"],
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
    <html lang="th">
      <body className={`${sarabun.className} antialiased`}>
        {children}
        <Chatbot />
      </body>
    </html>
  );
}
