import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

interface SystemStats {
  totalScans: number
  storageSaved: number
  autoScanEnabled: boolean
  autoScanInterval: number
  lastAutoScan?: string
}

const DEFAULT_STATS: SystemStats = {
  totalScans: 0,
  storageSaved: 0,
  autoScanEnabled: false,
  autoScanInterval: 24
}

async function loadStats(): Promise<SystemStats> {
  try {
    const dataDir = path.join(process.cwd(), 'data')
    const statsPath = path.join(dataDir, 'system-stats.json')
    
    const statsData = await fs.readFile(statsPath, 'utf-8')
    return { ...DEFAULT_STATS, ...JSON.parse(statsData) }
  } catch (error) {
    return DEFAULT_STATS
  }
}

async function saveStats(stats: SystemStats): Promise<void> {
  try {
    const dataDir = path.join(process.cwd(), 'data')
    await fs.mkdir(dataDir, { recursive: true })
    
    const statsPath = path.join(dataDir, 'system-stats.json')
    await fs.writeFile(statsPath, JSON.stringify(stats, null, 2))
  } catch (error) {
    console.error('Failed to save stats:', error)
  }
}

export async function GET() {
  try {
    const stats = await loadStats()
    return NextResponse.json(stats)
  } catch (error) {
    return NextResponse.json(DEFAULT_STATS)
  }
}

export async function POST(request: NextRequest) {
  try {
    const updates = await request.json()
    const currentStats = await loadStats()
    const newStats = { ...currentStats, ...updates }
    
    await saveStats(newStats)
    
    return NextResponse.json(newStats)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update stats'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
