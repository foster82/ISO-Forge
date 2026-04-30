import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const isAuth = !!req.auth
  const isSettingsPage = req.nextUrl.pathname.startsWith("/settings")
  const role = (req.auth?.user as any)?.role

  if (isSettingsPage && role !== "ADMIN") {
    // If authenticated but not admin, redirect to home
    if (isAuth) {
        return NextResponse.redirect(new URL("/", req.url))
    }
    // If not authenticated, the default authorized callback will redirect to /login
  }
  
  return NextResponse.next()
})

// Optionally, don't protect api/auth and static files
export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|login).*)"],
}
