import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "Stella — Swipe, Star, Build",
  description: "Swipe, Star, Build — discover your next project.",
  // iOS standalone PWA support — when the user adds the app to their home screen
  // and launches it from the icon, iOS hides Safari chrome (URL bar + toolbar)
  // and treats it like a native app. Requires apple-mobile-web-app-capable.
  appleWebApp: {
    capable: true,
    title: "Stella",
    statusBarStyle: "default",
  },
  // Web App Manifest enables the same fullscreen behaviour on Android Chrome
  // (and gives both platforms a proper home-screen icon + theme colour).
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  // Match the app's accent / surface colours so the iOS / Android status bar
  // and PWA splash blend with the UI instead of flashing white at launch.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f8fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1117" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        {/* Next.js 15's metadata.appleWebApp config emits the modern
            "mobile-web-app-capable" tag, but iOS Safari ONLY honours the legacy
            "apple-mobile-web-app-capable" name when deciding whether to launch
            in standalone mode from the home screen. Without this exact tag,
            tapping the home-screen icon opens inside Safari with the URL bar +
            toolbar visible. Forcing it here. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        {/* Some iOS Safari versions only honour the precomposed variant of
            apple-touch-icon. Adding it alongside Next.js's auto-emitted
            apple-touch-icon link as a belt-and-suspenders fix. */}
        <link rel="apple-touch-icon-precomposed" href="/apple-icon" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="bg-background text-foreground min-h-screen font-sans antialiased">
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
