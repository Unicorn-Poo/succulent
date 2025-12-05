"use client";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Theme } from "@radix-ui/themes";
import { Navigation } from "@/components/molecules/navigation";
import { JazzAndAuth } from "@/components/jazz-provider";
import { useEffect, useState } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check initial preference
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(mediaQuery.matches);

    // Listen for changes
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return (
    <html lang="en" className={isDark ? "dark" : ""}>
      <head>
        {/* PWA Meta Tags */}
        <meta name="application-name" content="Succulent" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="Succulent" />
        <meta
          name="description"
          content="Your social media management platform"
        />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta
          name="theme-color"
          content="#6BC9A3"
          media="(prefers-color-scheme: light)"
        />
        <meta
          name="theme-color"
          content="#1a1a1a"
          media="(prefers-color-scheme: dark)"
        />

        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-192x192.png" />

        {/* Favicon */}
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/icon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/icon-16x16.png"
        />
        <link rel="shortcut icon" href="/icon-48x48.png" />

        {/* Splash Screens for iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Theme appearance={isDark ? "dark" : "light"}>
          <JazzAndAuth>
            <div className="min-h-screen bg-background">
              <Navigation />
              <main>{children}</main>
            </div>
          </JazzAndAuth>
        </Theme>
      </body>
    </html>
  );
}
