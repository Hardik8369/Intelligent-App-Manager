import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'

interface FileInfo {
  path: string
  name: string
  size: number
  hash: string
  category?: string
}

interface DuplicateGroup {
  hash: string
  files: FileInfo[]
  size: number
}

interface Rule {
  id: string
  category: string
  keywords: string[]
  pathPatterns: string[]
  enabled: boolean
}

const APP_EXTENSIONS = ['.exe', '.msi', '.apk', '.sh', '.app', '.deb', '.rpm', '.dmg', '.pkg', '.appx', '.snap']

async function calculateFileHash(filePath: string): Promise<string> {
  try {
    const fileBuffer = await fs.readFile(filePath)
    const hashSum = crypto.createHash('sha256')
    hashSum.update(fileBuffer)
    return hashSum.digest('hex')
  } catch (error) {
    console.error(`Error calculating hash for ${filePath}:`, error)
    return ''
  }
}

async function scanDirectory(dirPath: string): Promise<FileInfo[]> {
  const files: FileInfo[] = []
  
  // Clean the directory path - remove extra quotes and normalize
  const cleanPath = dirPath.replace(/^["']|["']$/g, '').trim()
  
  try {
    // Check if directory exists
    const stats = await fs.stat(cleanPath)
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${cleanPath}`)
    }
    
    console.log(`Scanning directory: ${cleanPath}`)
    
    const entries = await fs.readdir(cleanPath, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = path.join(cleanPath, entry.name)
      
      if (entry.isDirectory()) {
        // Recursively scan subdirectories with error handling
        try {
          const subFiles = await scanDirectory(fullPath)
          files.push(...subFiles)
        } catch (error) {
          console.error(`Error scanning subdirectory ${fullPath}:`, error)
          // Continue with other directories instead of failing completely
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        if (APP_EXTENSIONS.includes(ext)) {
          try {
            const stats = await fs.stat(fullPath)
            const hash = await calculateFileHash(fullPath)
            
            if (hash) {
              files.push({
                path: fullPath,
                name: entry.name,
                size: stats.size,
                hash
              })
            }
          } catch (error) {
            console.error(`Error processing file ${fullPath}:`, error)
            // Continue with other files
          }
        }
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('ENOENT')) {
        throw new Error(`Directory not found: ${cleanPath}. Please check the path and try again.`)
      } else if (error.message.includes('EACCES')) {
        throw new Error(`Permission denied accessing: ${cleanPath}. Please check directory permissions.`)
      } else {
        throw new Error(`Error reading directory "${cleanPath}": ${error.message}`)
      }
    } else {
      throw new Error(`Unknown error reading directory: ${cleanPath}`)
    }
  }
  
  return files
}

function findDuplicates(files: FileInfo[]): DuplicateGroup[] {
  const hashGroups = new Map<string, FileInfo[]>()
  
  files.forEach(file => {
    if (!hashGroups.has(file.hash)) {
      hashGroups.set(file.hash, [])
    }
    hashGroups.get(file.hash)!.push(file)
  })
  
  const duplicateGroups: DuplicateGroup[] = []
  hashGroups.forEach((groupFiles, hash) => {
    if (groupFiles.length > 1) {
      duplicateGroups.push({
        hash,
        files: groupFiles,
        size: groupFiles[0].size
      })
    }
  })
  
  return duplicateGroups
}

async function loadRules(): Promise<Rule[]> {
  try {
    const rulesPath = path.join(process.cwd(), 'data', 'rules.json')
    const rulesData = await fs.readFile(rulesPath, 'utf-8')
    return JSON.parse(rulesData).rules || []
  } catch (error) {
    // Return default rules if file doesn't exist
    return [
      {
        id: '1',
        category: 'Developer Tools',
        keywords: ['code', 'studio', 'dev', 'git', 'npm', 'node', 'python', 'java', 'ide'],
        pathPatterns: ['/Developer', '/Applications/Developer'],
        enabled: true
      },
      {
        id: '2',
        category: 'Productivity',
        keywords: ['office', 'word', 'excel', 'powerpoint', 'notes', 'calendar', 'mail'],
        pathPatterns: ['/Applications/Office'],
        enabled: true
      },
      {
        id: '3',
        category: 'Entertainment',
        keywords: ['game', 'media', 'player', 'music', 'video', 'steam'],
        pathPatterns: ['/Games', '/Applications/Games'],
        enabled: true
      },
      {
        id: '4',
        category: 'System Utilities',
        keywords: ['system', 'utility', 'cleaner', 'monitor', 'backup'],
        pathPatterns: ['/System', '/usr/bin'],
        enabled: true
      }
    ]
  }
}

function categorizeFiles(files: FileInfo[], rules: Rule[]): { [category: string]: FileInfo[] } {
  const categorized: { [category: string]: FileInfo[] } = {}
  const uncategorized: FileInfo[] = []
  
  files.forEach(file => {
    let assigned = false
    
    for (const rule of rules) {
      if (!rule.enabled) continue
      
      const fileName = file.name.toLowerCase()
      const filePath = file.path.toLowerCase()
      
      // Check keywords
      const matchesKeyword = rule.keywords.some(keyword => 
        fileName.includes(keyword.toLowerCase())
      )
      
      // Check path patterns
      const matchesPath = rule.pathPatterns.some(pattern => 
        filePath.includes(pattern.toLowerCase())
      )
      
      if (matchesKeyword || matchesPath) {
        if (!categorized[rule.category]) {
          categorized[rule.category] = []
        }
        categorized[rule.category].push({ ...file, category: rule.category })
        assigned = true
        break
      }
    }
    
    if (!assigned) {
      uncategorized.push({ ...file, category: 'Uncategorized' })
    }
  })
  
  if (uncategorized.length > 0) {
    categorized['Uncategorized'] = uncategorized
  }
  
  return categorized
}

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

async function updateScanStats() {
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
    
    stats.totalScans += 1
    
    await fs.writeFile(statsPath, JSON.stringify(stats, null, 2))
  } catch (error) {
    console.error('Failed to update scan stats:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { directory } = await request.json()
    
    if (!directory || typeof directory !== 'string') {
      return NextResponse.json(
        { error: 'Valid directory path is required' },
        { status: 400 }
      )
    }
    
    // Clean and validate the directory path
    const cleanDirectory = directory.replace(/^["']|["']$/g, '').trim()
    
    if (!cleanDirectory) {
      return NextResponse.json(
        { error: 'Directory path cannot be empty' },
        { status: 400 }
      )
    }
    
    await logOperation(`Starting scan of directory: ${cleanDirectory}`)
    
    const startTime = Date.now()
    
    try {
      // Scan directory for application files
      const files = await scanDirectory(cleanDirectory)
      await logOperation(`Found ${files.length} application files`)
      
      // Find duplicates
      const duplicateGroups = findDuplicates(files)
      await logOperation(`Detected ${duplicateGroups.length} duplicate groups`)
      
      // Load rules and categorize files
      const rules = await loadRules()
      const categorizedFiles = categorizeFiles(files, rules)
      await logOperation(`Categorized files into ${Object.keys(categorizedFiles).length} categories`)
      
      const scanTime = (Date.now() - startTime) / 1000
      
      const result = {
        totalFiles: files.length,
        duplicateGroups,
        categorizedFiles,
        scanTime
      }
      
      // Save scan results
      const dataDir = path.join(process.cwd(), 'data')
      await fs.mkdir(dataDir, { recursive: true })
      await fs.writeFile(
        path.join(dataDir, 'last-scan.json'),
        JSON.stringify(result, null, 2)
      )
      
      // Update scan statistics
      await updateScanStats()
      
      await logOperation(`Scan completed in ${scanTime.toFixed(2)} seconds`)
      
      return NextResponse.json(result)
    } catch (scanError) {
      const errorMessage = scanError instanceof Error ? scanError.message : 'Scan operation failed'
      await logOperation(`Scan failed: ${errorMessage}`, 'ERROR')
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      )
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    await logOperation(`Request processing failed: ${errorMessage}`, 'ERROR')
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
