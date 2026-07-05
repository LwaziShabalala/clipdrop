import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Only /upload needs a signed-in user — everything else (the feed, watch
// pages, clip pages) stays public since links get shared on Reddit etc.
const isProtectedRoute = createRouteMatcher(["/upload(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    const { isAuthenticated } = await auth();
    if (!isAuthenticated) {
      // Built manually on purpose — Clerk's own auto-redirect has a known
      // bug on Next.js 16 where it doesn't reliably read the sign-in URL
      // from the environment inside proxy.ts, which is what was causing
      // the 404 instead of a redirect.
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};