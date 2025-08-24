import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as any
  } catch (error) {
    return null
  }
}

async function generateAnalytics(userId?: string) {
  try {
    // Load scan results
    const dataDir = path.join(process.cwd(), 'data')
    const scanResultPath = path.join(dataDir, 'last-scan.json')
    
    let scanResult
    try {
      const scanData = await fs.readFile(scanResultPath, 'utf-8')
      scanResult = JSON.parse(scanData)
    } catch (error) {
      return {
        categoryDistribution: [],
        storageByFolder: [],
        duplicateHeatmap: [],
        scanTrends: []
      }
    }
    
    // Category distribution (pie chart data)
    const categoryDistribution = Object.entries(scanResult.categorizedFiles || {}).map(([category, files]: [string, any]) => ({
      name: category,
      value: files.length,
      size: files.reduce((acc: number, file: any) => acc + file.size, 0)
    }))
    
    // Storage by folder (bar chart data)
    const folderMap = new Map<string, { count: number, size: number }>()
    
    Object.values(scanResult.categorizedFiles || {}).flat().forEach((file: any) => {
      const folder = path.dirname(file.path)
      const existing = folderMap.get(folder) || { count: 0, size: 0 }
      folderMap.set(folder, {
        count: existing.count + 1,
        size: existing.size + file.size
      })
    })
    
    const storageByFolder = Array.from(folderMap.entries())
      .map(([folder, data]) => ({
        folder: path.basename(folder) || folder,
        count: data.count,
        size: Math.round(data.size / (1024 * 1024)) // MB
      }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 10) // Top 10 folders
    
    // Duplicate heatmap
    const extensionMap = new Map<string, number>()
    scanResult.duplicateGroups?.forEach((group: any) => {
      group.files.forEach((file: any) => {
        const ext = path.extname(file.name).toLowerCase() || 'no-extension'
        extensionMap.set(ext, (extensionMap.get(ext) || 0) + 1)
      })
    })
    
    const duplicateHeatmap = Array.from(extensionMap.entries())
      .map(([extension, count]) => ({
        extension,
        count,
        intensity: count / Math.max(...extensionMap.values())
      }))
      .sort((a, b) => b.count - a.count)
    
    // Scan trends (mock data for now - in real implementation, track over time)
    const scanTrends = [
      { date: '2024-01-01', scans: 5, files: 120, duplicates: 15 },
      { date: '2024-01-02', scans: 3, files: 95, duplicates: 8 },
      { date: '2024-01-03', scans: 7, files: 180, duplicates: 22 },
      { date: '2024-01-04', scans: 4, files: 110, duplicates: 12 },
      { date: '2024-01-05', scans: 6, files: 150, duplicates: 18 }
    ]
    
    return {
      categoryDistribution,
      storageByFolder,
      duplicateHeatmap,
      scanTrends,
      summary: {
        totalFiles: scanResult.totalFiles || 0,
        totalCategories: categoryDistribution.length,
        totalDuplicates: scanResult.duplicateGroups?.length || 0,
        totalSize: categoryDistribution.reduce((acc, cat) => acc + cat.size, 0)
      }
    }
  } catch (error) {
    console.error('Analytics generation error:', error)
    return {
      categoryDistribution: [],
      storageByFolder: [],
      duplicateHeatmap: [],
      scanTrends: [],
      summary: { totalFiles: 0, totalCategories: 0, totalDuplicates: 0, totalSize: 0 }
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    let userId = undefined
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const decoded = verifyToken(token)
      if (decoded) {
        userId = decoded.userId
      }
    }
    
    const analytics = await generateAnalytics(userId)
    return NextResponse.json(analytics)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate analytics' },
      { status: 500 }
    )
  }
}
