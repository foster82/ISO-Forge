'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

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
      ldapFilter: ldapFilter || "(uid={{username}})"
    }
  })

  revalidatePath('/')
  revalidatePath('/settings')
  redirect('/')
}
