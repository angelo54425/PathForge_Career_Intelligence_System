import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export const { auth: proxy } = NextAuth(authConfig);

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
