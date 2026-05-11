import { BackupEngine } from '@/lib/backup-engine'
import { requireAdmin } from '@/lib/auth-utils'
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    await requireAdmin()
    const { filename } = await params
    const filePath = BackupEngine.getBackupPath(filename)

    if (!fs.existsSync(filePath)) {
      return new NextResponse('Backup file not found', { status: 404 })
    }

    const fileBuffer = fs.readFileSync(filePath)
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/x-sqlite3',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Download backup failed:', error)
    return new NextResponse('Unauthorized', { status: 401 })
  }
}
