'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin, isAdmin } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import { DownloadEngine } from '@/lib/download-engine'
import { SourceEngine } from '@/lib/source-engine'
import { logEvents } from '@/lib/events'
import path from 'path'
import fs from 'fs/promises'
import fsSync from 'fs'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'

export async function getSourcedImages(type: 'ISO' | 'CLOUD_IMAGE') {
  await requireAdmin()
  return await SourceEngine.getAllImages(type)
}

export async function addNewImage(formData: FormData) {
  let imageType = 'ISO'
  
  try {
    // Check admin status without throwing to avoid production masking
    const isUserAdmin = await isAdmin()
    if (!isUserAdmin) {
      console.error('addNewImage: Unauthorized attempt')
      return { error: 'Unauthorized: Admin role required. Please try logging in again.' }
    }
    
    const name = formData.get('name') as string
    const version = formData.get('version') as string
    const arch = formData.get('arch') as string || 'amd64'
    imageType = formData.get('imageType') as string || 'ISO'
    const source = formData.get('source') as string
    
    if (!name || !version) {
      return { error: 'OS Name and Version are required.' }
    }

    console.log(`Adding new image: ${name} v${version} (${imageType}) [${arch}] from ${source}`)

    let filename = ''
    let absolutePath = ''

    if (source === 'url') {
      const url = formData.get('url') as string
      if (!url) return { error: 'Download URL is required.' }

      console.log(`Source URL: ${url}`)
      const urlParts = url.split('/')
      const lastPart = urlParts[urlParts.length - 1]
      const extension = lastPart.includes('.') ? lastPart.split('.').pop() : (imageType === 'ISO' ? 'iso' : 'img')
      
      filename = (lastPart.endsWith('.iso') || lastPart.endsWith('.img') || lastPart.endsWith('.qcow2'))
        ? lastPart 
        : `${name.toLowerCase().replace(/\s+/g, '-')}-${version}.${extension}`
        
      absolutePath = path.join(process.cwd(), 'storage', 'base', filename)

      const image = await prisma.baseImage.create({
        data: {
          name,
          version,
          arch,
          filename,
          path: absolutePath,
          imageType,
          status: 'DOWNLOADING',
          downloadUrl: url,
        }
      })

      DownloadEngine.downloadIso(url, absolutePath, (progress) => {
        logEvents.emitProgress(image.id, progress)
        prisma.baseImage.update({
          where: { id: image.id },
          data: { downloadProgress: progress }
        }).catch(e => console.error('Failed to update download progress:', e))
      }).then(async (success) => {
        await prisma.baseImage.update({
          where: { id: image.id },
          data: { 
            status: success ? 'READY' : 'FAILED',
            downloadProgress: success ? 100 : 0
          }
        })
      })
    } else {
      const fileEntry = formData.get('file')
      
      if (!fileEntry || typeof fileEntry === 'string') {
        return { error: 'No file provided or incorrect encoding. Ensure the form is multipart/form-data.' }
      }

      const file = fileEntry as File
      if (file.size === 0) {
        return { error: 'The selected file is empty.' }
      }

      console.log(`Uploading file: ${file.name} (${file.size} bytes)`)
      filename = path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, '_')
      absolutePath = path.join(process.cwd(), 'storage', 'base', filename)
      
      await fs.mkdir(path.dirname(absolutePath), { recursive: true })

      const image = await prisma.baseImage.create({
        data: {
          name,
          version,
          arch,
          filename,
          path: absolutePath,
          imageType,
          status: 'DOWNLOADING',
        }
      })

      try {
        const fileStream = file.stream()
        const writeStream = fsSync.createWriteStream(absolutePath)
        // @ts-expect-error - ReadableStream from web is slightly different than node stream/web expectation in some environments
        await pipeline(Readable.fromWeb(fileStream), writeStream)
        
        const stats = await fs.stat(absolutePath)
        console.log(`Verified file size on disk: ${stats.size} bytes`)

        await prisma.baseImage.update({
          where: { id: image.id },
          data: { status: 'READY' }
        })
      } catch (error) {
        console.error('File upload pipeline failed:', error)
        await prisma.baseImage.update({
          where: { id: image.id },
          data: { status: 'FAILED' }
        })
        return { error: `Failed to write file to disk: ${error instanceof Error ? error.message : String(error)}` }
      }
    }
  } catch (error: unknown) {
    // Re-throw redirect errors so Next.js handles them
    const isRedirectError = error instanceof Error && 
      (error.message === 'NEXT_REDIRECT' || (error as { digest?: string }).digest?.includes('NEXT_REDIRECT'))

    if (isRedirectError) {
      throw error
    }
    
    console.error('addNewImage action caught critical error:', error)
    // Return a safe error message to the client
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
    return { error: `Server error: ${errorMessage}` }
  }

  redirect(`/images?type=${imageType}`)
}

export async function deleteImage(id: string, type: string) {
  await requireAdmin()
  const image = await prisma.baseImage.findUnique({ 
    where: { id },
    include: { 
      profiles: { 
        include: { 
          buildJobs: true 
        } 
      } 
    }
  })
  
  if (image) {
    for (const profile of image.profiles) {
      for (const job of profile.buildJobs) {
        if (job.outputPath && fsSync.existsSync(job.outputPath)) {
          try {
            fsSync.unlinkSync(job.outputPath)
          } catch (e) {
            console.error(`Failed to delete build file ${job.outputPath}:`, e)
          }
        }
      }
      await prisma.buildJob.deleteMany({ where: { profileId: profile.id } })
    }
    await prisma.profile.deleteMany({ where: { baseImageId: id } })
    
    if (fsSync.existsSync(image.path)) {
      try {
        fsSync.unlinkSync(image.path)
      } catch (e) {
        console.error(`Failed to delete base image file ${image.path}:`, e)
      }
    }
    
    await prisma.baseImage.delete({ where: { id } })
  }
  
  redirect(`/images?type=${type}`)
}
