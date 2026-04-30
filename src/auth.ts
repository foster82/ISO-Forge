import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { getSettings } from "@/lib/settings"
import { authenticateLDAP } from "@/lib/ldap"
import { authConfig } from "./auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null

        const username = credentials.username as string
        const password = credentials.password as string

        const settings = await getSettings()

        // --- 1. Try Local Authentication ---
        if (settings.authType === "LOCAL" || settings.authType === "BOTH") {
          const user = await prisma.user.findUnique({
            where: { username }
          })

          if (user && user.password && await bcrypt.compare(password, user.password)) {
            return {
              id: user.id,
              name: user.name,
              username: user.username,
              role: user.role,
              authSource: 'LOCAL'
            }
          }
        }

        // --- 2. Try LDAP Authentication ---
        if ((settings.authType === "LDAP" || settings.authType === "BOTH") && settings.ldapUrl && settings.ldapBaseDn) {
          const ldapUser = await authenticateLDAP(username, password, {
            url: settings.ldapUrl,
            baseDn: settings.ldapBaseDn,
            bindDn: settings.ldapBindDn || undefined,
            bindPw: settings.ldapBindPw || undefined,
            filter: settings.ldapFilter || "(uid={{username}})"
          }) as any

          if (ldapUser) {
            // Check if user exists in local DB to get roles/metadata
            let localUser = await prisma.user.findUnique({
              where: { username }
            })

            if (!localUser) {
              // Auto-provision user record on first LDAP login
              localUser = await prisma.user.create({
                data: {
                  username,
                  name: ldapUser.name,
                  authSource: 'LDAP',
                  role: 'USER' // Default role
                }
              })
            }

            return {
              id: localUser.id,
              name: localUser.name,
              username: localUser.username,
              role: localUser.role,
              authSource: 'LDAP'
            }
          }
        }

        return null
      },
    }),
  ],
})
