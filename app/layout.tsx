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
        {/* MyBid — covers Popunder, Web-push, and In-page */}
        <Script
          async
          src="https://js.mbidadm.com/static/scripts.js"
          data-admpid="447595"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}