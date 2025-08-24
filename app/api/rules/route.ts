import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

interface Rule {
  id: string
  category: string
  keywords: string[]
  pathPatterns: string[]
  enabled: boolean
}

const DEFAULT_RULES: Rule[] = [
  {
    id: '1',
    category: 'Developer Tools',
    keywords: ['code', 'studio', 'dev', 'git', 'npm', 'node', 'python', 'java', 'ide', 'editor', 'compiler'],
    pathPatterns: ['/Developer', '/Applications/Developer', 'Program Files/Microsoft Visual Studio'],
    enabled: true
  },
  {
    id: '2',
    category: 'Productivity',
    keywords: ['office', 'word', 'excel', 'powerpoint', 'notes', 'calendar', 'mail', 'outlook', 'teams'],
    pathPatterns: ['/Applications/Office', 'Program Files/Microsoft Office'],
    enabled: true
  },
  {
    id: '3',
    category: 'Entertainment',
    keywords: ['game', 'media', 'player', 'music', 'video', 'steam', 'spotify', 'netflix', 'youtube'],
    pathPatterns: ['/Games', '/Applications/Games', 'Program Files/Steam'],
    enabled: true
  },
  {
    id: '4',
    category: 'System Utilities',
    keywords: ['system', 'utility', 'cleaner', 'monitor', 'backup', 'antivirus', 'firewall'],
    pathPatterns: ['/System', '/usr/bin', 'Program Files/Windows Defender'],
    enabled: true
  },
  {
    id: '5',
    category: 'Graphics & Design',
    keywords: ['photoshop', 'illustrator', 'design', 'graphics', 'image', 'photo', 'sketch', 'figma'],
    pathPatterns: ['/Applications/Adobe', 'Program Files/Adobe'],
    enabled: true
  },
  {
    id: '6',
    category: 'Communication',
    keywords: ['chat', 'messenger', 'slack', 'discord', 'zoom', 'skype', 'telegram', 'whatsapp'],
    pathPatterns: [],
    enabled: true
  }
]

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

export async function GET() {
  try {
    const dataDir = path.join(process.cwd(), 'data')
    const rulesPath = path.join(dataDir, 'rules.json')
    
    let rules = DEFAULT_RULES
    
    try {
      const rulesData = await fs.readFile(rulesPath, 'utf-8')
      const parsedData = JSON.parse(rulesData)
      rules = parsedData.rules || DEFAULT_RULES
    } catch (error) {
      // File doesn't exist, use default rules
      await fs.mkdir(dataDir, { recursive: true })
      await fs.writeFile(rulesPath, JSON.stringify({ rules: DEFAULT_RULES }, null, 2))
    }
    
    return NextResponse.json({ rules })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    await logOperation(`Failed to load rules: ${errorMessage}`, 'ERROR')
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { rules } = await request.json()
    
    if (!rules || !Array.isArray(rules)) {
      return NextResponse.json(
        { error: 'Rules array is required' },
        { status: 400 }
      )
    }
    
    const dataDir = path.join(process.cwd(), 'data')
    await fs.mkdir(dataDir, { recursive: true })
    
    const rulesPath = path.join(dataDir, 'rules.json')
    await fs.writeFile(rulesPath, JSON.stringify({ rules }, null, 2))
    
    await logOperation(`Updated categorization rules (${rules.length} rules)`)
    
    return NextResponse.json({ success: true, message: 'Rules saved successfully' })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    await logOperation(`Failed to save rules: ${errorMessage}`, 'ERROR')
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
