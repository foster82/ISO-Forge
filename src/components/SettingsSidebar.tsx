'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { clsx } from 'clsx'
import { 
  Building, Globe, Shield, Wrench, Bell, 
  Database, Server, Users, HardDrive, 
  ChevronRight, ArrowLeft, Activity
} from 'lucide-react'

interface SidebarItem {
  name: string
  href: string
  icon: any
  adminOnly?: boolean
}

interface SidebarGroup {
  title: string
  items: SidebarItem[]
}

export default function SettingsSidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()

  const groups: SidebarGroup[] = [
    {
      title: 'Application',
      items: [
        { name: 'General', href: '/settings', icon: Building },
        { name: 'Recipes', href: '/settings/recipes', icon: Wrench },
        { name: 'Webhooks', href: '/settings/webhooks', icon: Bell },
      ]
    },
    {
      title: 'Infrastructure',
      items: [
        { name: 'Cloud & Metal', href: '/settings/infrastructure', icon: Server, adminOnly: true },
      ]
    },
    {
      title: 'System',
      items: [
        { name: 'Authentication', href: '/settings/auth', icon: Shield, adminOnly: true },
        { name: 'Maintenance', href: '/settings/maintenance', icon: Database, adminOnly: true },
        { name: 'Audit Logs', href: '/settings/audit', icon: Activity, adminOnly: true },
      ]
    },
    {
      title: 'Activity',
      items: [
        { name: 'Build History', href: '/settings/builds', icon: HardDrive },
        { name: 'Users & Quotas', href: '/settings/users', icon: Users, adminOnly: true },
      ]
    }
  ]

  return (
    <aside className="w-72 bg-white border-r border-slate-200 flex flex-col h-[calc(100vh-65px)] sticky top-[65px]">
      <div className="p-4 border-b border-slate-100">
        <Link 
          href="/" 
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-wider"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to Dashboard
        </Link>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-8">
        {groups.map((group) => {
          const visibleItems = group.items.filter(item => !item.adminOnly || isAdmin)
          if (visibleItems.length === 0) return null

          return (
            <div key={group.title} className="space-y-2">
              <h3 className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {group.title}
              </h3>
              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={clsx(
                        "flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all group",
                        isActive 
                          ? "bg-indigo-50 text-indigo-700" 
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className={clsx(
                          "w-4 h-4 transition-colors",
                          isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
                        )} />
                        {item.name}
                      </div>
                      {isActive && <ChevronRight className="w-3 h-3" />}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3 px-3">
          <div className={clsx(
            "w-2 h-2 rounded-full shadow-sm",
            isAdmin ? "bg-emerald-500 animate-pulse" : "bg-blue-500"
          )} />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Role: {isAdmin ? 'Administrator' : 'Standard User'}
          </span>
        </div>
      </div>
    </aside>
  )
}
