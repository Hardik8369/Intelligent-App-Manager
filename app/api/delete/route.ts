import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

async function logOperation(message: string, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO') {
  const timestamp = new Date().toISOString()
  const logEntry = { timestamp, level, message }
  
  try {
    const dataDir = path.join(process.cwd(), 'data')
    await fs.mkdir(dataDir, { recursive: true })
    
    const logPath = path.join(dataDir, 'logs.json')
    let logs = []
    
    try {
      const existingLogs = await fs.readFile(logPath, 'utf-8')
      logs = JSON.parse(existingLogs).logs || []
    } catch (error) {
      // File doesn't exist, start with empty array
    }
    
    logs.push(logEntry)
    
    // Keep only last 1000 log entries
    if (logs.length > 1000) {
      logs = logs.slice(-1000)
    }
    
    await fs.writeFile(logPath, JSON.stringify({ logs }, null, 2))
  } catch (error) {
    console.error('Failed to write log:', error)
  }
}

async function updateStorageStats(spaceSavedMB: number) {
  try {
    const dataDir = path.join(process.cwd(), 'data')
    const statsPath = path.join(dataDir, 'system-stats.json')
    
    let stats = {
      totalScans: 0,
      storageSaved: 0,
      autoScanEnabled: false,
      autoScanInterval: 24
    }
    
    try {
      const existingStats = await fs.readFile(statsPath, 'utf-8')
      stats = { ...stats, ...JSON.parse(existingStats) }
    } catch (error) {
      // File doesn't exist, use defaults
    }
    
    stats.storageSaved += spaceSavedMB
    
    await fs.writeFile(statsPath, JSON.stringify(stats, null, 2))
  } catch (error) {
    console.error('Failed to update storage stats:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { files } = await request.json()
    
    if (!files || !Array.isArray(files)) {
      return NextResponse.json(
        { error: 'Files array is required' },
        { status: 400 }
      )
    }
    
    await logOperation(`Starting deletion of ${files.length} files`)
    
    let deletedCount = 0
    let totalSpaceSaved = 0
    const errors: string[] = []
    
    for (const filePath of files) {
      try {
        // Get file size before deletion
        const stats = await fs.stat(filePath)
        const fileSizeMB = stats.size / (1024 * 1024)
        
        // Delete the file
        await fs.unlink(filePath)
        deletedCount++
        totalSpaceSaved += fileSizeMB
        
        await logOperation(`Deleted file: ${filePath} (${fileSizeMB.toFixed(2)} MB)`)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`Failed to delete ${filePath}: ${errorMessage}`)
        await logOperation(`Failed to delete ${filePath}: ${errorMessage}`, 'ERROR')
      }
    }
    
    // Update storage statistics
    if (totalSpaceSaved > 0) {
      await updateStorageStats(totalSpaceSaved)
    }
    
    await logOperation(`Deletion completed. ${deletedCount} files deleted, ${totalSpaceSaved.toFixed(2)} MB saved, ${errors.length} errors`)
    
    return NextResponse.json({
      deletedCount,
      spaceSaved: totalSpaceSaved.toFixed(2),
      errors,
      success: deletedCount > 0
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    await logOperation(`Delete operation failed: ${errorMessage}`, 'ERROR')
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
