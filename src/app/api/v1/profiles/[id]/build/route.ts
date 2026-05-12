import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { validateApiRequest } from '../../../images/route'
import { buildQueue } from '@/lib/queue'
import { checkUserQuota } from '@/lib/quota-utils'
import path from 'path'
import fs from 'fs/promises'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await validateApiRequest(request)
  if (!user || !user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const quota = await checkUserQuota(user.id)
  if (!quota.allowed) {
    return NextResponse.json({ error: quota.message }, { status: 403 })
  }

  const { id } = await params

  const profile = await prisma.profile.findUnique({
    where: { id },
    include: { baseImage: true }
  })

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // LDAP Group Visibility Check
  if (user.role !== 'ADMIN') {
    const allowedGroups = JSON.parse(profile.allowedGroups || '[]') as string[]
    if (allowedGroups.length > 0) {
      const userGroups = user.groups || []
      const hasAccess = allowedGroups.some(group => userGroups.includes(group))
      if (!hasAccess) {
        return NextResponse.json({ error: 'Forbidden: You do not have access to this profile.' }, { status: 403 })
      }
    }
  }

  const job = await prisma.buildJob.create({
    data: {
      profileId: id,
      version: profile.version,
      status: 'PENDING',
      log: `Job queued via API for image type: ${profile.baseImage.imageType} (Version: ${profile.version})...\n`
    }
  })

  const jobId = job.id
  const extension = profile.baseImage.imageType === 'ISO' ? 'iso' : 
                   (profile.baseImage.filename.split('.').pop() || 'img')
  
  const outputPath = path.join(process.cwd(), 'storage', 'builds', `custom-${jobId}.${extension}`)
  
  await prisma.buildJob.update({
    where: { id: jobId },
    data: { outputPath }
  })

  await fs.mkdir(path.join(process.cwd(), 'storage', 'builds'), { recursive: true })

  await buildQueue.add('build', {
    type: 'build',
    jobId: jobId,
    payload: {
      baseIsoPath: profile.baseImage.path,
      imageType: profile.baseImage.imageType as 'ISO' | 'CLOUD_IMAGE',
      outputPath,
      hostname: profile.hostname,
      username: profile.username,
      passwordHash: profile.passwordHash,
      sshKey: profile.sshKey || undefined,
      packages: JSON.parse(profile.packages),
      timezone: profile.timezone,
      locale: profile.locale,
      runcmd: JSON.parse(profile.runcmd),
      configYaml: profile.configYaml || undefined,
      ipAddress: profile.ipAddress || undefined,
      gateway: profile.gateway || undefined,
      dnsServers: profile.dnsServers ? profile.dnsServers.split(',').map(d => d.trim()) : undefined,
      arch: profile.baseImage.arch
    }
  })

  return NextResponse.json({
    message: 'Build job started',
    jobId,
    status: 'PENDING'
  })
}
