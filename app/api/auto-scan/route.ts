import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

interface AutoScanConfig {
  enabled: boolean
  interval: number
  directory: string
  lastRun?: string
}

let scanInterval: NodeJS.Timeout | null = null

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
    
    if (logs.length > 1000) {
      logs = logs.slice(-1000)
    }
    
    await fs.writeFile(logPath, JSON.stringify({ logs }, null, 2))
  } catch (error) {
    console.error('Failed to write log:', error)
  }
}

async function performAutoScan(directory: string) {
  try {
    await logOperation(`Auto-scan started for directory: ${directory}`)
    
    // Call the scan API internally
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ directory })
    })
    
    if (response.ok) {
      const result = await response.json()
      await logOperation(`Auto-scan completed: ${result.totalFiles} files, ${result.duplicateGroups.length} duplicate groups`)
      
      // Update last auto-scan time
      const dataDir = path.join(process.cwd(), 'data')
      const statsPath = path.join(dataDir, 'system-stats.json')
      
      try {
        const existingStats = await fs.readFile(statsPath, 'utf-8')
        const stats = JSON.parse(existingStats)
        stats.lastAutoScan = new Date().toISOString()
        await fs.writeFile(statsPath, JSON.stringify(stats, null, 2))
      } catch (error) {
        console.error('Failed to update last auto-scan time:', error)
      }
    } else {
      await logOperation('Auto-scan failed', 'ERROR')
    }
  } catch (error) {
    await logOperation(`Auto-scan error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'ERROR')
  }
}

function startAutoScan(config: AutoScanConfig) {
  if (scanInterval) {
    clearInterval(scanInterval)
  }
  
  const intervalMs = config.interval * 60 * 60 * 1000 // Convert hours to milliseconds
  
  scanInterval = setInterval(() => {
    performAutoScan(config.directory)
  }, intervalMs)
  
  logOperation(`Auto-scan scheduled every ${config.interval} hours for ${config.directory}`)
}

function stopAutoScan() {
  if (scanInterval) {
    clearInterval(scanInterval)
    scanInterval = null
    logOperation('Auto-scan disabled')
  }
}

export async function POST(request: NextRequest) {
  try {
    const { enabled, interval, directory } = await request.json()
    
    if (!directory && enabled) {
      return NextResponse.json(
        { error: 'Directory is required when enabling auto-scan' },
        { status: 400 }
      )
    }
    
    // Update system stats
    const dataDir = path.join(process.cwd(), 'data')
    await fs.mkdir(dataDir, { recursive: true })
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
    
    stats.autoScanEnabled = enabled
    stats.autoScanInterval = interval || stats.autoScanInterval
    
    await fs.writeFile(statsPath, JSON.stringify(stats, null, 2))
    
    // Start or stop auto-scan
    if (enabled) {
      startAutoScan({ enabled, interval: interval || 24, directory })
    } else {
      stopAutoScan()
    }
    
    return NextResponse.json({ success: true, message: enabled ? 'Auto-scan enabled' : 'Auto-scan disabled' })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    await logOperation(`Auto-scan configuration failed: ${errorMessage}`, 'ERROR')
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
