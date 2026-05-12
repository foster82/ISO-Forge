import { getPublicRecipes, cloneRecipe } from '@/lib/actions/recipes'
import { getSettings } from '@/lib/settings'
import { Rocket, Package, Terminal, Copy, ArrowLeft, Search } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { signOut } from '@/auth'
import { LogOut } from 'lucide-react'

export default async function RecipeMarketplace() {
  const settings = await getSettings()
  const recipes = await getPublicRecipes()

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50">
        <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              {settings.companyLogo ? (
                <div className="relative w-8 h-8">
                  <Image src={settings.companyLogo} alt="Logo" fill className="object-contain" />
                </div>
              ) : (
                <Rocket className="w-6 h-6 text-indigo-600" />
              )}
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{settings.companyName}</h1>
            </Link>
            <div className="h-6 w-px bg-slate-200 mx-2" />
            <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Recipe Marketplace</span>
          </div>
          <div className="flex items-center gap-4">
             <Link href="/" className="text-xs font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-3 h-3" />
              Back to Dashboard
            </Link>
            <form action={async () => { 'use server'; await signOut() }}>
              <button type="submit" className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-8 space-y-12">
        <div className="max-w-2xl">
          <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4">
            Build Faster with <span className="text-indigo-600">Recipes</span>
          </h2>
          <p className="text-lg text-slate-500">
            Community-contributed configuration bundles. Clone them to your account to easily apply common packages and scripts to your OS profiles.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
              <Package className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">No public recipes available yet.</p>
            </div>
          ) : (
            recipes.map((recipe) => (
              <div key={recipe.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col group hover:shadow-xl hover:border-indigo-200 transition-all">
                <div className="p-6 flex-1 space-y-6">
                  <div>
                    <div className="flex items-start justify-between">
                      <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{recipe.name}</h3>
                    </div>
                    <p className="text-sm text-slate-500 mt-2 line-clamp-2">{recipe.description || 'No description provided.'}</p>
                  </div>

                  <div className="space-y-4">
                    {recipe.packages && JSON.parse(recipe.packages).length > 0 && (
                      <div className="flex items-start gap-3">
                        <Package className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div className="flex flex-wrap gap-1.5">
                          {JSON.parse(recipe.packages).slice(0, 5).map((pkg: string) => (
                            <span key={pkg} className="px-2 py-0.5 bg-slate-50 text-slate-600 rounded text-[10px] font-bold border border-slate-100">
                              {pkg}
                            </span>
                          ))}
                          {JSON.parse(recipe.packages).length > 5 && (
                            <span className="text-[10px] font-bold text-slate-400">+{JSON.parse(recipe.packages).length - 5} more</span>
                          )}
                        </div>
                      </div>
                    )}

                    {recipe.runcmd && JSON.parse(recipe.runcmd).length > 0 && (
                      <div className="flex items-start gap-3">
                        <Terminal className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                        <div className="bg-slate-900 rounded-lg p-3 w-full font-mono text-[10px] text-emerald-400 overflow-hidden">
                          <div className="truncate">
                            <span className="text-slate-600 mr-2">$</span>{JSON.parse(recipe.runcmd)[0]}
                          </div>
                          {JSON.parse(recipe.runcmd).length > 1 && (
                            <div className="text-slate-500 mt-1 italic">... {JSON.parse(recipe.runcmd).length - 1} more commands</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600 uppercase">
                      {recipe.user?.username?.substring(0, 2) || '??'}
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      By {recipe.user?.username || 'System'}
                    </span>
                  </div>
                  
                  <form action={async () => { 'use server'; await cloneRecipe(recipe.id); }}>
                    <button 
                      type="submit"
                      className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Clone
                    </button>
                  </form>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
