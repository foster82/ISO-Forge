import { signIn } from "@/auth"
import { Rocket, Lock, User, AlertCircle } from "lucide-react"
import { getSettings } from "@/lib/settings"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const settings = await getSettings()

  async function handleLogin(formData: FormData) {
    "use server"
    try {
      await signIn("credentials", formData)
    } catch (error) {
      // In NextAuth v5, redirected errors are expected
      if ((error as any).type === "CredentialsSignin") {
        return // handled by searchParams error
      }
      throw error
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            {settings.companyLogo ? (
              <img src={settings.companyLogo} alt="Logo" className="w-16 h-16 object-contain" />
            ) : (
              <Rocket className="w-12 h-12 text-indigo-600" />
            )}
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {settings.companyName}
          </h1>
          <p className="text-slate-500">Sign in to manage your ISO builds</p>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xl">
          <form action={handleLogin} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Invalid username or password
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  Username
                </label>
                <input
                  name="username"
                  type="text"
                  required
                  placeholder="Enter your username"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none text-slate-900"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-400" />
                  Password
                </label>
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none text-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 group"
            >
              Sign In
              <Rocket className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </button>
          </form>

          {settings.authType === "BOTH" && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <p className="text-xs text-center text-slate-400">
                LDAP and Local accounts are supported
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
