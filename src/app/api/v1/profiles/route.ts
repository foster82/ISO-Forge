import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { validateApiRequest } from '../images/route'

export async function GET(request: Request) {
  const user = await validateApiRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profiles = await prisma.profile.findMany({
    include: {
      baseImage: {
        select: {
          name: true,
          version: true
        }
      }
    },
    orderBy: { updatedAt: 'desc' }
  })

  // Filter based on LDAP groups
  const filteredProfiles = profiles.filter(profile => {
    if (user.role === 'ADMIN') return true
    
    const allowedGroups = JSON.parse(profile.allowedGroups || '[]') as string[]
    if (allowedGroups.length === 0) return true
    
    const userGroups = user.groups || []
    return allowedGroups.some(group => userGroups.includes(group))
  })

  return NextResponse.json(filteredProfiles)
}
