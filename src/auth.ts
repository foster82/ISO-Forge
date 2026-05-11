import NextAuth, { type DefaultSession } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { getSettings } from "@/lib/settings"
import { authenticateLDAP } from "@/lib/ldap"
import { authConfig } from "./auth.config"

declare module "next-auth" {
  interface User {
    role?: string
    username?: string
    authSource?: string
    groups?: string[]
  }
  interface Session {
    user: {
      role?: string
      username?: string
      authSource?: string
      groups?: string[]
    } & DefaultSession["user"]
  }
}

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
        console.log(`[AUTH DEBUG] Attempting login for: ${username}, authType: ${settings.authType}`)

        // --- 1. Try Local Authentication ---
        if (settings.authType === "LOCAL" || settings.authType === "BOTH") {
          const user = await prisma.user.findUnique({
            where: { username }
          })
          
          if (!user) {
            console.log(`[AUTH DEBUG] User not found: ${username}`)
          } else {
            const isMatch = await bcrypt.compare(password, user.password || "")
            console.log(`[AUTH DEBUG] User found. Password match: ${isMatch}`)
            if (isMatch) {
              return {
                id: user.id,
                name: user.name,
                username: user.username,
                role: user.role,
                authSource: 'LOCAL',
                groups: JSON.parse(user.groups || '[]')
              }
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
          })

          if (ldapUser) {
            console.log(`[AUTH DEBUG] LDAP login successful for ${username}. Groups: ${ldapUser.groups.join(', ')}`)
            
            // Determine role based on groups
            let role = 'USER'
            if (settings.ldapAdminGroup && ldapUser.groups.includes(settings.ldapAdminGroup)) {
              role = 'ADMIN'
            } else if (settings.ldapUserGroup && !ldapUser.groups.includes(settings.ldapUserGroup)) {
              // If a user group is specified and they AREN'T in it, deny login
              console.log(`[AUTH DEBUG] User ${username} denied: Not in required user group ${settings.ldapUserGroup}`)
              return null
            }

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
                  email: ldapUser.email,
                  authSource: 'LDAP',
                  role: role,
                  groups: JSON.stringify(ldapUser.groups)
                }
              })
            } else {
              // Update existing user with latest LDAP info (role/name/email/groups)
              localUser = await prisma.user.update({
                where: { username },
                data: {
                  name: ldapUser.name,
                  email: ldapUser.email,
                  role: role,
                  groups: JSON.stringify(ldapUser.groups)
                }
              })
            }

            return {
              id: localUser.id,
              name: localUser.name,
              username: localUser.username,
              email: localUser.email,
              role: localUser.role,
              authSource: 'LDAP',
              groups: ldapUser.groups
            }
          }
        }

        return null
      },
    }),
  ],
})
