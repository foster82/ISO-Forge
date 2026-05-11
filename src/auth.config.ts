import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.username = user.username
        token.authSource = user.authSource
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string
        session.user.username = token.username as string
        session.user.authSource = token.authSource as string
      }
      return session
    },
    authorized({ auth, request: { nextUrl } }) {
      const isSettingsPage = nextUrl.pathname.startsWith("/settings")
      const role = auth?.user?.role

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
  trustHost: true,
} satisfies NextAuthConfig
