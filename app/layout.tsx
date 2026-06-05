import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ZapysUa",
  description: "Telegram Mini App",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <html lang="uk" suppressHydrationWarning>

      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>

      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-black text-white`}
      >

        <ThemeProvider>
          {children}
        </ThemeProvider>

      </body>
    </html>
  );
}