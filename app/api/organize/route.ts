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

export async function POST(request: NextRequest) {
  try {
    const { directory } = await request.json()
    
    if (!directory) {
      return NextResponse.json(
        { error: 'Directory path is required' },
        { status: 400 }
      )
    }
    
    // Load last scan results
    const dataDir = path.join(process.cwd(), 'data')
    const scanResultPath = path.join(dataDir, 'last-scan.json')
    
    let scanResult
    try {
      const scanData = await fs.readFile(scanResultPath, 'utf-8')
      scanResult = JSON.parse(scanData)
    } catch (error) {
      return NextResponse.json(
        { error: 'No scan results found. Please run a scan first.' },
        { status: 400 }
      )
    }
    
    await logOperation('Starting file organization')
    
    // Create output directory structure
    const outputDir = path.join(process.cwd(), 'output')
    await fs.mkdir(outputDir, { recursive: true })
    
    let organizedCount = 0
    const errors: string[] = []
    
    // Organize files by category
    for (const [category, files] of Object.entries(scanResult.categorizedFiles)) {
      const categoryDir = path.join(outputDir, category.replace(/[^a-zA-Z0-9]/g, '_'))
      await fs.mkdir(categoryDir, { recursive: true })
      
      for (const file of files as any[]) {
        try {
          const fileName = path.basename(file.path)
          const destinationPath = path.join(categoryDir, fileName)
          
          // Check if source file exists
          await fs.access(file.path)
          
          // Copy file to organized location (preserve original)
          await fs.copyFile(file.path, destinationPath)
          organizedCount++
          
          await logOperation(`Organized file: ${file.path} -> ${destinationPath}`)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          errors.push(`Failed to organize ${file.path}: ${errorMessage}`)
          await logOperation(`Failed to organize ${file.path}: ${errorMessage}`, 'ERROR')
        }
      }
    }
    
    await logOperation(`Organization completed. ${organizedCount} files organized, ${errors.length} errors`)
    
    return NextResponse.json({
      organizedCount,
      errors,
      outputDirectory: outputDir,
      success: organizedCount > 0
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    await logOperation(`Organization failed: ${errorMessage}`, 'ERROR')
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
