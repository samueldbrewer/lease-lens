export { auth as middleware } from "@/lib/auth";

export const runtime = "nodejs";

export const config = {
  matcher: [
    // Protect everything except login, signup, auth API, and static files
    "/((?!login|signup|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
