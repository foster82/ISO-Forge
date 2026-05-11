'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth, requireAdmin } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import { sha512 } from 'sha512-crypt-ts'
import path from 'path'
import fs from 'fs/promises'
import fsSync from 'fs'
import { buildQueue } from '@/lib/queue'

export async function createProfile(formData: FormData) {
  const user = await requireAuth()
  
  const name = formData.get('name') as string
  const version = formData.get('version') as string || '1.0.0'
  const baseImageId = formData.get('baseImageId') as string
  const hostname = formData.get('hostname') as string
  const username = formData.get('username') as string
  const sshKey = formData.get('sshKey') as string
  const packagesRaw = formData.get('packages') as string
  const configYaml = formData.get('configYaml') as string
  const allowedGroupsRaw = formData.get('allowedGroups') as string
  
  const timezone = formData.get('timezone') as string
  const locale = formData.get('locale') as string
  const runcmdRaw = formData.get('runcmd') as string

  const ipAddress = formData.get('ipAddress') as string
  const gateway = formData.get('gateway') as string
  const dnsServers = formData.get('dnsServers') as string

  const passwordMode = formData.get('passwordMode') as string // 'plain' or 'hash'
  const passwordInput = formData.get('passwordInput') as string
  
  let passwordHash = ''
  
  if (passwordMode === 'plain') {
    // Generate SHA-512 crypt hash (Ubuntu standard)
    passwordHash = sha512.crypt(passwordInput, Math.random().toString(36).substring(2, 10))
  } else {
    passwordHash = passwordInput
  }

  // Parse packages into JSON array
  const packages = packagesRaw
    .split(',')
    .map(p => p.trim())
    .filter(p => p.length > 0)

  // Parse runcmd into JSON array
  const runcmd = runcmdRaw
    ? runcmdRaw.split('\n').map(c => c.trim()).filter(c => c.length > 0)
    : []

  const allowedGroups = allowedGroupsRaw
    ? allowedGroupsRaw.split(',').map(g => g.trim()).filter(g => g.length > 0)
    : []

  await prisma.profile.create({
    data: {
      name,
      version,
      baseImageId,
      hostname,
      username,
      passwordHash,
      sshKey,
      packages: JSON.stringify(packages),
      timezone: timezone || 'Europe/London',
      locale: locale || 'en_GB.UTF-8',
      runcmd: JSON.stringify(runcmd),
      configYaml: configYaml || null,
      allowedGroups: JSON.stringify(allowedGroups),
      userId: user.id,
      ipAddress: ipAddress || null,
      gateway: gateway || null,
      dnsServers: dnsServers || null
    }
  })

  redirect('/')
}

export async function updateProfile(id: string, formData: FormData) {
  await requireAuth()
  
  const name = formData.get('name') as string
  const version = formData.get('version') as string
  const baseImageId = formData.get('baseImageId') as string
  const hostname = formData.get('hostname') as string
  const username = formData.get('username') as string
  const sshKey = formData.get('sshKey') as string
  const packagesRaw = formData.get('packages') as string
  const configYaml = formData.get('configYaml') as string
  const allowedGroupsRaw = formData.get('allowedGroups') as string

  const timezone = formData.get('timezone') as string
  const locale = formData.get('locale') as string
  const runcmdRaw = formData.get('runcmd') as string
  
  const ipAddress = formData.get('ipAddress') as string
  const gateway = formData.get('gateway') as string
  const dnsServers = formData.get('dnsServers') as string

  const passwordMode = formData.get('passwordMode') as string // 'plain' or 'hash'
  const passwordInput = formData.get('passwordInput') as string
  
  const profile = await prisma.profile.findUnique({ where: { id } })
  let passwordHash = profile?.passwordHash || ''
  
  if (passwordInput) {
    if (passwordMode === 'plain') {
      passwordHash = sha512.crypt(passwordInput, Math.random().toString(36).substring(2, 10))
    } else {
      passwordHash = passwordInput
    }
  }

  const packages = packagesRaw
    .split(',')
    .map(p => p.trim())
    .filter(p => p.length > 0)

  const runcmd = runcmdRaw
    ? runcmdRaw.split('\n').map(c => c.trim()).filter(c => c.length > 0)
    : []

  const allowedGroups = allowedGroupsRaw
    ? allowedGroupsRaw.split(',').map(g => g.trim()).filter(g => g.length > 0)
    : []

  await prisma.profile.update({
    where: { id },
    data: {
      name,
      version,
      baseImageId,
      hostname,
      username,
      passwordHash,
      sshKey,
      packages: JSON.stringify(packages),
      timezone: timezone || 'Europe/London',
      locale: locale || 'en_GB.UTF-8',
      runcmd: JSON.stringify(runcmd),
      configYaml: configYaml || null,
      allowedGroups: JSON.stringify(allowedGroups),
      ipAddress: ipAddress || null,
      gateway: gateway || null,
      dnsServers: dnsServers || null
    }
  })

  redirect(`/profiles/${id}`)
}

export async function deleteProfile(id: string, _formData?: FormData) {
  await requireAdmin()
  
  // Also delete associated build files
  const jobs = await prisma.buildJob.findMany({ where: { profileId: id } })
  for (const job of jobs) {
    if (job.outputPath && fsSync.existsSync(job.outputPath)) {
      try {
        fsSync.unlinkSync(job.outputPath)
      } catch (e) {
        console.error(`Failed to delete build file ${job.outputPath}:`, e)
      }
    }
  }
  
  await prisma.buildJob.deleteMany({ where: { profileId: id } })
  await prisma.profile.delete({ where: { id } })
  
  redirect('/')
}

export async function startBuild(id: string) {
  const user = await requireAuth()
  
  const profile = await prisma.profile.findUnique({
    where: { id },
    include: { baseImage: true }
  })

  if (!profile) return

  const job = await prisma.buildJob.create({
    data: {
      profileId: id,
      userId: user.id,
      version: profile.version,
      status: 'PENDING',
      log: `Job queued for image type: ${profile.baseImage.imageType} (Version: ${profile.version})...\n`
    }
  })

  const jobId = job.id

  const extension = profile.baseImage.imageType === 'ISO' ? 'iso' : 
                   (profile.baseImage.filename.split('.').pop() || 'img')
  
  const outputPath = path.join(process.cwd(), 'storage', 'builds', `custom-${jobId}.${extension}`)
  
  // Save outputPath to the job record
  await prisma.buildJob.update({
    where: { id: jobId },
    data: { outputPath }
  })

  await fs.mkdir(path.join(process.cwd(), 'storage', 'builds'), { recursive: true })

  // Add to BullMQ
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

  redirect(`/jobs/${jobId}`)
}
