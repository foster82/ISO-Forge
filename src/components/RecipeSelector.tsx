'use client'

import { useState } from 'react'
import { Wrench, Check } from 'lucide-react'

interface Recipe {
  id: string
  name: string
  packages: string
  runcmd: string
}

interface RecipeSelectorProps {
  recipes: Recipe[]
}

export default function RecipeSelector({ recipes }: RecipeSelectorProps) {
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('')
  const [isApplied, setIsApplied] = useState(false)

  const applyRecipe = () => {
    const recipe = recipes.find(r => r.id === selectedRecipeId)
    if (!recipe) return

    // Find the form fields
    const packagesInput = document.querySelector('input[name="packages"]') as HTMLInputElement
    const runcmdTextarea = document.querySelector('textarea[name="runcmd"]') as HTMLTextAreaElement

    if (packagesInput) {
      const existingPackages = packagesInput.value
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0)
      
      const newPackages = JSON.parse(recipe.packages)
      
      // Merge and remove duplicates
      const mergedPackages = Array.from(new Set([...existingPackages, ...newPackages]))
      packagesInput.value = mergedPackages.join(', ')
    }

    if (runcmdTextarea) {
      const existingCmds = runcmdTextarea.value
        .split('\n')
        .map(c => c.trim())
        .filter(c => c.length > 0)
      
      const newCmds = JSON.parse(recipe.runcmd)
      
      // Append new commands
      const mergedCmds = [...existingCmds, ...newCmds]
      runcmdTextarea.value = mergedCmds.join('\n')
    }

    // Reset selection and show feedback
    setSelectedRecipeId('')
    setIsApplied(true)
    setTimeout(() => setIsApplied(false), 2000)
  }

  if (recipes.length === 0) return null

  return (
    <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <Wrench className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Apply Recipe</h3>
          <p className="text-xs text-slate-500">Quickly inject pre-configured packages and scripts.</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 w-full md:w-auto">
        <select
          value={selectedRecipeId}
          onChange={(e) => setSelectedRecipeId(e.target.value)}
          className="flex-1 md:w-64 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
        >
          <option value="">Select a recipe...</option>
          {recipes.map(recipe => (
            <option key={recipe.id} value={recipe.id}>{recipe.name}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={applyRecipe}
          disabled={!selectedRecipeId || isApplied}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm shrink-0 flex items-center gap-2 ${
            isApplied 
              ? "bg-emerald-50 text-emerald-600 border border-emerald-200" 
              : "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          }`}
        >
          {isApplied ? (
            <>
              <Check className="w-4 h-4" />
              Applied!
            </>
          ) : (
            'Apply'
          )}
        </button>
      </div>
    </div>
  )
}
