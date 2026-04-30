import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.username = (user as any).username
        token.authSource = (user as any).authSource
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role as string
        (session.user as any).username = token.username as string
        (session.user as any).authSource = token.authSource as string
      }
      return session
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isSettingsPage = nextUrl.pathname.startsWith("/settings")
      const role = (auth?.user as any)?.role

      if (isSettingsPage && role !== "ADMIN") {
        return false // Will redirect to login by default if not authorized, but we might want a custom redirect
      }

      return true // Let the middleware handle redirections if needed, or just return true/false
    },
  },
  providers: [], // Empty array, to be filled in auth.ts
  session: {
    strategy: "jwt",
  },
} satisfies NextAuthConfig
