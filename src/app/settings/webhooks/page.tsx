import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'
import { ArrowLeft, Plus, Trash2, Bell, Shield, Check } from 'lucide-react'
import Link from 'next/link'
import { createWebhook, deleteWebhook, toggleWebhook } from '@/lib/actions/webhooks'
import DeleteButton from '@/components/DeleteButton'

export default async function WebhooksPage() {
  await requireAdmin()
  const webhooks = await prisma.webhook.findMany({
    orderBy: { createdAt: 'desc' }
  })

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-5xl mx-auto w-full">
          <div className="flex items-center gap-4">
            <Link href="/settings" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <h1 className="text-xl font-bold text-slate-900">Outgoing Webhooks</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add Webhook Form */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6 sticky top-6">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                Add Webhook
              </h2>
              
              <form action={createWebhook} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Name</label>
                  <input name="name" type="text" required placeholder="Slack Alerts" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Target URL</label>
                  <input name="url" type="url" required placeholder="https://hooks.slack.com/..." className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Secret (HMAC-SHA256)</label>
                  <input name="secret" type="text" placeholder="Optional" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono" />
                </div>

                <div className="space-y-3 pt-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Trigger Events</label>
                  <div className="space-y-2">
                    {[
                      { id: 'BUILD_COMPLETED', label: 'Build Completed' },
                      { id: 'BUILD_FAILED', label: 'Build Failed' },
                      { id: 'BOOT_TEST_PASSED', label: 'Boot Test Passed' },
                      { id: 'BOOT_TEST_FAILED', label: 'Boot Test Failed' },
                      { id: 'IMAGE_READY', label: 'New Base Image' },
                    ].map(event => (
                      <label key={event.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer border border-transparent transition-colors">
                        <input type="checkbox" name={event.id} className="w-4 h-4 text-indigo-600 rounded" />
                        <span className="text-sm text-slate-700">{event.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button type="submit" className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
                  Create Webhook
                </button>
              </form>
            </div>
          </div>

          {/* Webhooks List */}
          <div className="lg:col-span-2 space-y-4">
            {webhooks.length === 0 ? (
              <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
                <Bell className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900">No Webhooks Registered</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
                  Automate notifications to Slack, Discord, or your own systems when builds finish.
                </p>
              </div>
            ) : (
              webhooks.map(webhook => (
                <div key={webhook.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${webhook.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                        <Bell className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">{webhook.name}</h3>
                        <p className="text-xs text-slate-400 font-mono truncate max-w-md">{webhook.url}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <form action={async () => { 'use server'; await toggleWebhook(webhook.id, !webhook.active); }}>
                        <button type="submit" className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${
                          webhook.active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}>
                          {webhook.active ? 'Active' : 'Disabled'}
                        </button>
                      </form>
                      <DeleteButton
                        action={deleteWebhook.bind(null, webhook.id)}
                        confirmMessage={`Delete webhook '${webhook.name}'?`}
                        iconSize={4}
                      />
                    </div>
                  </div>
                  
                  <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-2">
                    {JSON.parse(webhook.eventTypes).map((event: string) => (
                      <span key={event} className="px-2 py-0.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-medium rounded flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-500" />
                        {event.replace(/_/g, ' ')}
                      </span>
                    ))}
                    {webhook.secret && (
                      <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-medium rounded flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        HMAC Secured
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
