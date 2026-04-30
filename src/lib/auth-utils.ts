import { auth } from "@/auth"
import { redirect } from "next/navigation"

export type Role = "ADMIN" | "USER"

export async function getSession() {
  return await auth()
}

export async function getCurrentUser() {
  const session = await getSession()
  return session?.user as any
}

export async function isAdmin() {
  const user = await getCurrentUser()
  return user?.role === "ADMIN"
}

export async function requireAdmin() {
  if (!(await isAdmin())) {
    throw new Error("Unauthorized: Admin role required")
  }
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/login")
  }
  return user
}
