export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/assessment/:path*",
    "/skill-gap/:path*",
    "/universities/:path*",
    "/market-intel/:path*",
    "/roadmap/:path*",
    "/progress/:path*",
    "/profile/:path*",
    "/resources/:path*",
  ],
};
