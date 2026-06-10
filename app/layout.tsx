import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { TelegramProvider } from "@/components/providers/TelegramProvider";
import "./globals.css";
import { cn } from "@/lib/utils";


const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ZapysUa — особистий кабінет",
  description: "AI-адміністратор для запису клієнтів у Telegram",
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
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" suppressHydrationWarning className={cn("font-sans", inter.variable)}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-white text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100 overflow-x-hidden`}
      >
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        <ThemeProvider>
          <TelegramProvider>
              {children}
          </TelegramProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
