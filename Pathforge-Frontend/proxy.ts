import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth;

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
