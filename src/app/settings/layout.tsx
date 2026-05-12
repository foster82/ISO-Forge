import { getSettings } from "@/lib/settings";
import { isAdmin, requireAuth } from "@/lib/auth-utils";
import SettingsSidebar from "@/components/SettingsSidebar";
import Image from "next/image";
import { Rocket } from "lucide-react";
import Link from "next/link";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();
  const settings = await getSettings();
  const isUserAdmin = await isAdmin();

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Settings Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-50">
        <div className="flex items-center justify-between mx-auto w-full">
          <div className="flex items-center gap-3">
            {settings.companyLogo ? (
              <div className="relative w-8 h-8">
                <Image
                  src={settings.companyLogo}
                  alt="Logo"
                  fill
                  className="object-contain"
                />
              </div>
            ) : (
              <Rocket className="w-6 h-6 text-indigo-600" />
            )}
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">
                {settings.companyName}
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                Global Settings
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <SettingsSidebar isAdmin={isUserAdmin} />
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
