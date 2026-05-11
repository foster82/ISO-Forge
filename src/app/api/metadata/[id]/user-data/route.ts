import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { BuildEngine } from '@/lib/build-engine'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const job = await prisma.buildJob.findUnique({
    where: { id },
    include: {
      profile: {
        include: {
          baseImage: true
        }
      }
    }
  })

  if (!job) {
    return new Response('Not Found', { status: 404 })
  }

  const profile = job.profile
  const userData = BuildEngine.generateUserData({
    baseIsoPath: profile.baseImage.path,
    imageType: profile.baseImage.imageType as 'ISO' | 'CLOUD_IMAGE',
    arch: profile.baseImage.arch,
    outputPath: job.outputPath || '',
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
    onLog: () => {}
  })

  return new Response(userData, {
    headers: {
      'Content-Type': 'text/plain',
    },
  })
}
