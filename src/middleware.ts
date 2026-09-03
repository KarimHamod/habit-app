import { NextResponse, type NextRequest } from "next/server";

import { isAuthRoute, isPublicRoute } from "@/lib/auth/routes";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (user && isAuthRoute(pathname)) {
    return NextResponse.redirect(new URL("/today", request.url));
  }

  if (!user && !isPublicRoute(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
