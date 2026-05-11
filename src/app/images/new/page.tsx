import { requireAdmin } from '@/lib/auth-utils'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { addNewImage } from '@/lib/actions/images'
import NewImageForm from '@/components/NewImageForm'

export default async function NewImage({ 
  searchParams 
}: { 
  searchParams: Promise<{ type?: string }> 
}) {
  await requireAdmin()
  const { type = 'ISO' } = await searchParams

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-4">
            <Link href={`/images?type=${type}`} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <h1 className="text-xl font-bold text-slate-900">Add Base {type === 'ISO' ? 'ISO' : 'Cloud Image'}</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-6">
        <NewImageForm type={type} addNewImage={addNewImage} />
      </main>
    </div>
  )
}
