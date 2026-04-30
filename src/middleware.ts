import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isAuth = !!req.auth
  const isSettingsPage = req.nextUrl.pathname.startsWith("/settings")
  const role = (req.auth?.user as any)?.role

  if (isSettingsPage && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", req.url))
  }
  
  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|login).*)"],
}
