import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { GoogleAnalytics } from "@next/third-parties/google";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClipDrop",
  description: "Trim, watermark, and share clips as GIFs",
  verification: {
    other: {
      "6a97888e-site-verification": "144dc3a84e8a005cece6f3e6877a1396",
    },
  },
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
        {/* ExoClick loader, loads once site-wide */}
        <Script src="https://a.magsrv.com/ad-provider.js" strategy="afterInteractive" async />
        {/* MyBid loader — covers Popunder, Web-push, and In-page together
            for ad code #447595 */}
        <Script
          async
          src="https://js.mbidadm.com/static/scripts.js"
          data-admpid="447595"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}