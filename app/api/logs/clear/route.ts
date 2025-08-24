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
    
    // Start with just the clear log entry
    const logs = [logEntry]
    
    await fs.writeFile(logPath, JSON.stringify({ logs }, null, 2))
  } catch (error) {
    console.error('Failed to write log:', error)
  }
}

export async function POST() {
  try {
    const dataDir = path.join(process.cwd(), 'data')
    const logPath = path.join(dataDir, 'logs.json')
    
    // Clear logs and add a "logs cleared" entry
    await logOperation(`Logs cleared by user on ${new Date().toISOString()}`)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Logs cleared successfully' 
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
