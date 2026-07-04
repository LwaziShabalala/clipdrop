import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Only /upload needs a signed-in user — everything else (the feed, watch
// pages, clip pages) stays public since links get shared on Reddit etc.
const isProtectedRoute = createRouteMatcher(["/upload(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};