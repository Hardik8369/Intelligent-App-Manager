import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

interface AppInfo {
  path: string
  name: string
  type: 'installed' | 'portable'
  installDate?: string
  version?: string
  publisher?: string
  installLocation?: string
  registryEntry?: boolean
  size: number
}

async function detectAppType(filePath: string): Promise<'installed' | 'portable'> {
  try {
    const normalizedPath = path.normalize(filePath).toLowerCase()
    
    // Common installed app locations
    const installedPaths = [
      'program files',
      'program files (x86)',
      'programdata',
      'windows\\system32',
      'windows\\syswow64',
      '/applications',
      '/usr/bin',
      '/usr/local/bin',
      '/opt'
    ]
    
    // Common portable app locations
    const portablePaths = [
      'downloads',
      'desktop',
      'documents',
      'temp',
      'portable',
      'portableapps'
    ]
    
    // Check if in typical installed location
    if (installedPaths.some(installPath => normalizedPath.includes(installPath))) {
      return 'installed'
    }
    
    // Check if in typical portable location
    if (portablePaths.some(portablePath => normalizedPath.includes(portablePath))) {
      return 'portable'
    }
    
    // Additional checks for Windows
    if (process.platform === 'win32') {
      // Check if there are associated files that suggest installation
      const dir = path.dirname(filePath)
      try {
        const files = await fs.readdir(dir)
        const hasUninstaller = files.some(file => 
          file.toLowerCase().includes('uninstall') || 
          file.toLowerCase().includes('uninst')
        )
        const hasInstallFiles = files.some(file =>
          file.toLowerCase().includes('install') ||
          file.toLowerCase().includes('setup')
        )
        
        if (hasUninstaller || hasInstallFiles) {
          return 'installed'
        }
      } catch (error) {
        // Can't read directory, assume portable
      }
    }
    
    // Default to portable if uncertain
    return 'portable'
  } catch (error) {
    return 'portable'
  }
}

async function getAppDetails(filePath: string): Promise<AppInfo> {
  try {
    const stats = await fs.stat(filePath)
    const appType = await detectAppType(filePath)
    const fileName = path.basename(filePath)
    
    const appInfo: AppInfo = {
      path: filePath,
      name: fileName,
      type: appType,
      size: stats.size
    }
    
    // Try to get additional metadata for installed apps
    if (appType === 'installed') {
      // In a real implementation, you'd query the Windows registry
      // or use system APIs to get installation details
      appInfo.installDate = stats.birthtime?.toISOString()
      appInfo.installLocation = path.dirname(filePath)
      appInfo.registryEntry = true
    }
    
    return appInfo
  } catch (error) {
    throw new Error(`Failed to analyze app: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function GET() {
  try {
    // Load last scan results
    const dataDir = path.join(process.cwd(), 'data')
    const scanResultPath = path.join(dataDir, 'last-scan.json')
    
    let scanResult
    try {
      const scanData = await fs.readFile(scanResultPath, 'utf-8')
      scanResult = JSON.parse(scanData)
    } catch (error) {
      return NextResponse.json({ apps: [], summary: { installed: 0, portable: 0 } })
    }
    
    const allFiles = Object.values(scanResult.categorizedFiles || {}).flat() as any[]
    const apps: AppInfo[] = []
    
    for (const file of allFiles) {
      try {
        const appInfo = await getAppDetails(file.path)
        apps.push(appInfo)
      } catch (error) {
        // Skip files that can't be analyzed
        continue
      }
    }
    
    const summary = {
      installed: apps.filter(app => app.type === 'installed').length,
      portable: apps.filter(app => app.type === 'portable').length,
      totalSize: apps.reduce((acc, app) => acc + app.size, 0)
    }
    
    return NextResponse.json({
      apps: apps.slice(0, 100), // Limit for performance
      summary
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to detect app types' },
      { status: 500 }
    )
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
    
    const appInfo = await getAppDetails(filePath)
    return NextResponse.json(appInfo)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    )
  }
}
