const AUTH_ROUTES = ["/login", "/signup"];
const PUBLIC_ROUTES = [...AUTH_ROUTES];

export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function isPublicRoute(pathname: string): boolean {
  return (
    pathname === "/" ||
    PUBLIC_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`),
    )
  );
}
