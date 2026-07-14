import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { GoogleAnalytics } from "@next/third-parties/google";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClipDrop",
  description: "Trim, watermark, and share clips as GIFs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <ClerkProvider>{children}</ClerkProvider>
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID!} />
        <Script
          defer
          data-website-id="dfid_LeREt9s0vEjiJo9KTQg4a"
          data-domain="clipdrop-production-1c2e.up.railway.app"
          src="https://datafa.st/js/script.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}