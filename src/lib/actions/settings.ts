'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { testLDAP } from '@/lib/ldap'
import { auditLog } from '@/lib/audit'

export async function testLdapConnection(formData: FormData) {
  await requireAdmin()
  
  const config = {
    url: formData.get('ldapUrl') as string,
    baseDn: formData.get('ldapBaseDn') as string,
    bindDn: formData.get('ldapBindDn') as string || undefined,
    bindPw: formData.get('ldapBindPw') as string || undefined,
    filter: formData.get('ldapFilter') as string || "(uid={{username}})"
  }

  if (!config.url || !config.baseDn) {
    return { success: false, message: "URL and Base DN are required to test connection." }
  }

  return await testLDAP(config)
}

export async function updateSettings(formData: FormData) {
  await requireAdmin()
  
  const data: any = {}
  
  if (formData.has('companyName')) data.companyName = formData.get('companyName') as string
  if (formData.has('companyLogo')) data.companyLogo = formData.get('companyLogo') as string || null
  if (formData.has('authType')) data.authType = formData.get('authType') as string
  if (formData.has('defaultTimezone')) data.defaultTimezone = formData.get('defaultTimezone') as string
  if (formData.has('defaultLocale')) data.defaultLocale = formData.get('defaultLocale') as string
  if (formData.has('defaultStorageQuotaMB')) data.defaultStorageQuotaMB = parseInt(formData.get('defaultStorageQuotaMB') as string) || 0
  
  if (formData.has('ldapUrl')) data.ldapUrl = formData.get('ldapUrl') as string || null
  if (formData.has('ldapBaseDn')) data.ldapBaseDn = formData.get('ldapBaseDn') as string || null
  if (formData.has('ldapBindDn')) data.ldapBindDn = formData.get('ldapBindDn') as string || null
  if (formData.has('ldapBindPw')) data.ldapBindPw = formData.get('ldapBindPw') as string || null
  if (formData.has('ldapFilter')) data.ldapFilter = formData.get('ldapFilter') as string || "(uid={{username}})"
  if (formData.has('ldapAdminGroup')) data.ldapAdminGroup = formData.get('ldapAdminGroup') as string || null
  if (formData.has('ldapUserGroup')) data.ldapUserGroup = formData.get('ldapUserGroup') as string || null
  
  if (formData.has('jobRetentionDays')) data.jobRetentionDays = parseInt(formData.get('jobRetentionDays') as string) || 30
  if (formData.has('buildRetentionCount')) data.buildRetentionCount = parseInt(formData.get('buildRetentionCount') as string) || 10
  if (formData.has('autoCleanupEnabled')) data.autoCleanupEnabled = formData.get('autoCleanupEnabled') === 'on'

  await prisma.globalSettings.update({
    where: { id: 'default' },
    data
  })

  await auditLog('SETTINGS_UPDATE', { details: Object.keys(data) })

  revalidatePath('/')
  revalidatePath('/settings')
  // We should not redirect if we are updating from a specific subpage?
  // But redirect('/') was there. Let's keep it or remove it if we want to stay on the page.
  // redirect('/')
}
