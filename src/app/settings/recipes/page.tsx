import { getRecipes } from '@/lib/actions/recipes'
import { requireAdmin } from '@/lib/auth-utils'
import { ArrowLeft, Plus, Wrench, Package, Terminal, Info } from 'lucide-react'
import Link from 'next/link'
import { createRecipe, deleteRecipe } from '@/lib/actions/recipes'
import DeleteButton from '@/components/DeleteButton'

export default async function RecipesPage() {
  await requireAdmin()
  const recipes = await getRecipes()

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-5xl mx-auto w-full">
          <div className="flex items-center gap-4">
            <Link href="/settings" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-indigo-600" />
              Configuration Recipes
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-6 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Recipe Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden sticky top-6">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-indigo-600" />
                  Create New Recipe
                </h2>
              </div>
              <form action={createRecipe} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recipe Name</label>
                  <input
                    name="name"
                    type="text"
                    required
                    placeholder="e.g. Docker Node"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
                  <textarea
                    name="description"
                    rows={2}
                    placeholder="Brief description of what this recipe does..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    Packages
                    <div className="group relative">
                      <Info className="w-3 h-3 text-slate-400 cursor-help" />
                      <div className="absolute bottom-full mb-2 left-0 w-48 p-2 bg-slate-800 text-white text-[10px] rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 font-normal">
                        Comma-separated list of APT packages.
                      </div>
                    </div>
                  </label>
                  <input
                    name="packages"
                    type="text"
                    placeholder="curl, git, docker.io"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    Run Commands
                    <div className="group relative">
                      <Info className="w-3 h-3 text-slate-400 cursor-help" />
                      <div className="absolute bottom-full mb-2 left-0 w-48 p-2 bg-slate-800 text-white text-[10px] rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 font-normal">
                        One command per line. Executed on first boot.
                      </div>
                    </div>
                  </label>
                  <textarea
                    name="runcmd"
                    rows={4}
                    placeholder="systemctl enable docker"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-mono"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-all shadow-sm flex items-center justify-center gap-2 mt-2"
                >
                  <Plus className="w-4 h-4" />
                  Save Recipe
                </button>
              </form>
            </div>
          </div>

          {/* Recipes List */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider px-2">Existing Recipes ({recipes.length})</h2>
            
            {recipes.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
                <Wrench className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">No recipes created yet.</p>
                <p className="text-xs text-slate-400 mt-1">Create a recipe to reuse package lists and scripts across profiles.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {recipes.map((recipe) => (
                  <div key={recipe.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group hover:border-indigo-300 transition-all">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{recipe.name}</h3>
                          {recipe.description && (
                            <p className="text-sm text-slate-500 mt-1">{recipe.description}</p>
                          )}
                        </div>
                        <DeleteButton 
                          action={deleteRecipe.bind(null, recipe.id)}
                          confirmMessage={`Are you sure you want to delete the "${recipe.name}" recipe?`}
                          iconSize={4}
                        />
                      </div>

                      <div className="space-y-3">
                        {recipe.packages && JSON.parse(recipe.packages).length > 0 && (
                          <div className="flex items-start gap-3">
                            <Package className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                            <div className="flex flex-wrap gap-1.5">
                              {JSON.parse(recipe.packages).map((pkg: string) => (
                                <span key={pkg} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold font-mono border border-slate-200">
                                  {pkg}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {recipe.runcmd && JSON.parse(recipe.runcmd).length > 0 && (
                          <div className="flex items-start gap-3">
                            <Terminal className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                            <div className="bg-slate-900 rounded-lg p-3 w-full font-mono text-[10px] text-emerald-400 overflow-x-auto">
                              {JSON.parse(recipe.runcmd).map((cmd: string, i: number) => (
                                <div key={i} className="whitespace-nowrap">
                                  <span className="text-slate-600 mr-2">$</span>{cmd}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
