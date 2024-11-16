import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define public routes (these do not require authentication)
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/site",
  "/api/uploadthing",
  "/",
]);

export default clerkMiddleware(async (auth, request) => {
  const url = new URL(request.url);
  const searchParams = url.searchParams.toString();
  const hostname = request.headers.get("host");
  const pathWithSearchParams = `${url.pathname}${
    searchParams ? `?${searchParams}` : ""
  }`;

  // If request is not to a public route, require authentication
  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  // Custom subdomain logic
  const customSubDomain = hostname
    ?.split(`${process.env.NEXT_PUBLIC_DOMAIN}`)
    .filter(Boolean)[0];

  if (customSubDomain) {
    return NextResponse.rewrite(
      new URL(`/${customSubDomain}${pathWithSearchParams}`, request.url)
    );
  }

  // Redirect /sign-in and /sign-up to /agency/sign-in
  if (url.pathname === "/sign-in" || url.pathname === "/sign-up") {
    return NextResponse.redirect(new URL(`/agency/sign-in`, request.url));
  }

  // Rewrite root or /site path to /site if on primary domain
  if (
    url.pathname === "/" ||
    (url.pathname === "/site" && hostname === process.env.NEXT_PUBLIC_DOMAIN)
  ) {
    return NextResponse.rewrite(new URL("/site", request.url));
  }

  // Rewrite /agency and /subaccount paths directly
  if (
    url.pathname.startsWith("/agency") ||
    url.pathname.startsWith("/subaccount")
  ) {
    return NextResponse.rewrite(new URL(pathWithSearchParams, request.url));
  }
});

// Middleware matcher for Clerk
export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
