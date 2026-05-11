'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { testLDAP } from '@/lib/ldap'

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
  
  const companyName = formData.get('companyName') as string
  const companyLogo = formData.get('companyLogo') as string
  const authType = formData.get('authType') as string
  
  const ldapUrl = formData.get('ldapUrl') as string
  const ldapBaseDn = formData.get('ldapBaseDn') as string
  const ldapBindDn = formData.get('ldapBindDn') as string
  const ldapBindPw = formData.get('ldapBindPw') as string
  const ldapFilter = formData.get('ldapFilter') as string
  const ldapAdminGroup = formData.get('ldapAdminGroup') as string
  const ldapUserGroup = formData.get('ldapUserGroup') as string
  
  const jobRetentionDays = parseInt(formData.get('jobRetentionDays') as string) || 30
  const buildRetentionCount = parseInt(formData.get('buildRetentionCount') as string) || 10
  const autoCleanupEnabled = formData.get('autoCleanupEnabled') === 'on'

  await prisma.globalSettings.update({
    where: { id: 'default' },
    data: {
      companyName,
      companyLogo: companyLogo || null,
      authType,
      ldapUrl: ldapUrl || null,
      ldapBaseDn: ldapBaseDn || null,
      ldapBindDn: ldapBindDn || null,
      ldapBindPw: ldapBindPw || null,
      ldapFilter: ldapFilter || "(uid={{username}})",
      ldapAdminGroup: ldapAdminGroup || null,
      ldapUserGroup: ldapUserGroup || null,
      jobRetentionDays,
      buildRetentionCount,
      autoCleanupEnabled
    }
  })

  revalidatePath('/')
  revalidatePath('/settings')
  redirect('/')
}
