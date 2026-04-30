export { auth as middleware } from "@/auth"

// Optionally, don't protect api/auth and static files
export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|login).*)"],
}
