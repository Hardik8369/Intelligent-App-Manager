import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

interface UsageInfo {
  filePath: string
  lastAccessed: string
  lastModified: string
  accessCount: number
  daysSinceLastUse: number
  usageCategory: 'active' | 'occasional' | 'dormant' | 'abandoned'
}

async function getFileUsageInfo(filePath: string): Promise<UsageInfo> {
  try {
    const stats = await fs.stat(filePath)
    const now = new Date()
    const lastAccessed = stats.atime
    const lastModified = stats.mtime
    
    const daysSinceLastUse = Math.floor((now.getTime() - lastAccessed.getTime()) / (1000 * 60 * 60 * 24))
    
    let usageCategory: UsageInfo['usageCategory']
    if (daysSinceLastUse <= 7) {
      usageCategory = 'active'
    } else if (daysSinceLastUse <= 30) {
      usageCategory = 'occasional'
    } else if (daysSinceLastUse <= 180) {
      usageCategory = 'dormant'
    } else {
      usageCategory = 'abandoned'
    }
    
    return {
      filePath,
      lastAccessed: lastAccessed.toISOString(),
      lastModified: lastModified.toISOString(),
      accessCount: 1, // In a real implementation, this would be tracked
      daysSinceLastUse,
      usageCategory
    }
  } catch (error) {
    throw new Error(`Failed to get usage info for ${filePath}`)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { filePath } = await request.json()
    
    if (!filePath) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      )
    }
    
    const usageInfo = await getFileUsageInfo(filePath)
    return NextResponse.json(usageInfo)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get usage info' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Load last scan results and add usage info
    const dataDir = path.join(process.cwd(), 'data')
    const scanResultPath = path.join(dataDir, 'last-scan.json')
    
    let scanResult
    try {
      const scanData = await fs.readFile(scanResultPath, 'utf-8')
      scanResult = JSON.parse(scanData)
    } catch (error) {
      return NextResponse.json({ usageStats: [] })
    }
    
    const allFiles = Object.values(scanResult.categorizedFiles || {}).flat()
    const usageStats = []
    
    for (const file of allFiles as any[]) {
      try {
        const usage = await getFileUsageInfo(file.path)
        usageStats.push({
          ...file,
          ...usage
        })
      } catch (error) {
        // Skip files that can't be accessed
        continue
      }
    }
    
    // Sort by days since last use (most recently used first)
    usageStats.sort((a, b) => a.daysSinceLastUse - b.daysSinceLastUse)
    
    const summary = {
      active: usageStats.filter(f => f.usageCategory === 'active').length,
      occasional: usageStats.filter(f => f.usageCategory === 'occasional').length,
      dormant: usageStats.filter(f => f.usageCategory === 'dormant').length,
      abandoned: usageStats.filter(f => f.usageCategory === 'abandoned').length
    }
    
    return NextResponse.json({
      usageStats: usageStats.slice(0, 100), // Limit to first 100 for performance
      summary
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate usage statistics' },
      { status: 500 }
    )
  }
}
