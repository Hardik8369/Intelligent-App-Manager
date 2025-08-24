import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function GET() {
  try {
    const dataDir = path.join(process.cwd(), 'data')
    const logPath = path.join(dataDir, 'logs.json')
    
    let logs = []
    
    try {
      const logData = await fs.readFile(logPath, 'utf-8')
      const parsedData = JSON.parse(logData)
      logs = parsedData.logs || []
    } catch (error) {
      // File doesn't exist, return empty logs
      logs = []
    }
    
    // Return logs in reverse chronological order (newest first)
    logs.reverse()
    
    return NextResponse.json({ logs })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
