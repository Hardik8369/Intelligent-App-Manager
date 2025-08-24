import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

interface SmartSuggestion {
  id: string
  type: 'duplicate_removal' | 'version_consolidation' | 'unused_cleanup' | 'category_optimization'
  title: string
  description: string
  files: Array<{
    path: string
    name: string
    size: number
    action: 'keep' | 'remove' | 'update'
    reason: string
  }>
  potentialSavings: number
  confidence: 'high' | 'medium' | 'low'
  priority: number
}

function detectSimilarApps(files: any[]): SmartSuggestion[] {
  const suggestions: SmartSuggestion[] = []
  const appGroups = new Map<string, any[]>()
  
  // Group similar applications
  files.forEach(file => {
    const baseName = file.name.toLowerCase()
      .replace(/\d+/g, '') // Remove version numbers
      .replace(/[._-]/g, ' ') // Normalize separators
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim()
    
    if (!appGroups.has(baseName)) {
      appGroups.set(baseName, [])
    }
    appGroups.get(baseName)!.push(file)
  })
  
  // Find groups with multiple versions
  appGroups.forEach((groupFiles, baseName) => {
    if (groupFiles.length > 1) {
      // Sort by file size (assuming larger = newer/more complete)
      groupFiles.sort((a, b) => b.size - a.size)
      
      const keepFile = groupFiles[0]
      const removeFiles = groupFiles.slice(1)
      
      const suggestion: SmartSuggestion = {
        id: `version_consolidation_${Date.now()}_${Math.random()}`,
        type: 'version_consolidation',
        title: `Multiple versions of ${baseName} detected`,
        description: `Found ${groupFiles.length} versions of similar applications. Recommend keeping the largest/newest version.`,
        files: [
          {
            path: keepFile.path,
            name: keepFile.name,
            size: keepFile.size,
            action: 'keep',
            reason: 'Largest file size (likely newest version)'
          },
          ...removeFiles.map(file => ({
            path: file.path,
            name: file.name,
            size: file.size,
            action: 'remove' as const,
            reason: 'Older/smaller version'
          }))
        ],
        potentialSavings: removeFiles.reduce((acc, file) => acc + file.size, 0),
        confidence: 'medium',
        priority: removeFiles.length * 10
      }
      
      suggestions.push(suggestion)
    }
  })
  
  return suggestions
}

function detectUnusedApps(files: any[]): SmartSuggestion[] {
  const suggestions: SmartSuggestion[] = []
  
  // In a real implementation, this would check actual usage data
  // For now, we'll simulate based on file access times and common patterns
  const potentiallyUnused = files.filter(file => {
    const fileName = file.name.toLowerCase()
    
    // Common patterns for potentially unused software
    const unusedPatterns = [
      'trial', 'demo', 'temp', 'old', 'backup', 'copy',
      'installer', 'setup', 'uninstall'
    ]
    
    return unusedPatterns.some(pattern => fileName.includes(pattern))
  })
  
  if (potentiallyUnused.length > 0) {
    const suggestion: SmartSuggestion = {
      id: `unused_cleanup_${Date.now()}`,
      type: 'unused_cleanup',
      title: 'Potentially unused applications detected',
      description: `Found ${potentiallyUnused.length} applications that appear to be trials, demos, or temporary installations.`,
      files: potentiallyUnused.map(file => ({
        path: file.path,
        name: file.name,
        size: file.size,
        action: 'remove' as const,
        reason: 'Appears to be trial/demo/temporary software'
      })),
      potentialSavings: potentiallyUnused.reduce((acc, file) => acc + file.size, 0),
      confidence: 'low',
      priority: 5
    }
    
    suggestions.push(suggestion)
  }
  
  return suggestions
}

function detectRedundantApps(files: any[]): SmartSuggestion[] {
  const suggestions: SmartSuggestion[] = []
  
  // Define groups of applications that serve similar purposes
  const redundantGroups = [
    {
      category: 'Media Players',
      apps: ['vlc', 'kmplayer', 'windows media player', 'quicktime', 'realplayer'],
      recommend: 'vlc'
    },
    {
      category: 'Web Browsers',
      apps: ['chrome', 'firefox', 'edge', 'safari', 'opera', 'internet explorer'],
      recommend: 'chrome'
    },
    {
      category: 'Text Editors',
      apps: ['notepad++', 'sublime', 'atom', 'brackets', 'notepad'],
      recommend: 'notepad++'
    },
    {
      category: 'Archive Tools',
      apps: ['winrar', '7zip', 'winzip', 'peazip'],
      recommend: '7zip'
    }
  ]
  
  redundantGroups.forEach(group => {
    const foundApps = files.filter(file => 
      group.apps.some(app => file.name.toLowerCase().includes(app))
    )
    
    if (foundApps.length > 1) {
      const recommendedApp = foundApps.find(file => 
        file.name.toLowerCase().includes(group.recommend)
      ) || foundApps[0]
      
      const redundantApps = foundApps.filter(file => file !== recommendedApp)
      
      if (redundantApps.length > 0) {
        const suggestion: SmartSuggestion = {
          id: `redundant_${group.category.replace(/\s+/g, '_')}_${Date.now()}`,
          type: 'duplicate_removal',
          title: `Multiple ${group.category} detected`,
          description: `Found ${foundApps.length} ${group.category.toLowerCase()}. Recommend keeping ${group.recommend} and removing others.`,
          files: [
            {
              path: recommendedApp.path,
              name: recommendedApp.name,
              size: recommendedApp.size,
              action: 'keep',
              reason: `Recommended ${group.category.toLowerCase()}`
            },
            ...redundantApps.map(file => ({
              path: file.path,
              name: file.name,
              size: file.size,
              action: 'remove' as const,
              reason: 'Redundant application'
            }))
          ],
          potentialSavings: redundantApps.reduce((acc, file) => acc + file.size, 0),
          confidence: 'high',
          priority: redundantApps.length * 15
        }
        
        suggestions.push(suggestion)
      }
    }
  })
  
  return suggestions
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
      return NextResponse.json({ suggestions: [] })
    }
    
    const allFiles = Object.values(scanResult.categorizedFiles || {}).flat() as any[]
    
    if (allFiles.length === 0) {
      return NextResponse.json({ suggestions: [] })
    }
    
    // Generate different types of suggestions
    const suggestions: SmartSuggestion[] = [
      ...detectSimilarApps(allFiles),
      ...detectUnusedApps(allFiles),
      ...detectRedundantApps(allFiles)
    ]
    
    // Sort by priority (highest first)
    suggestions.sort((a, b) => b.priority - a.priority)
    
    const summary = {
      totalSuggestions: suggestions.length,
      totalPotentialSavings: suggestions.reduce((acc, s) => acc + s.potentialSavings, 0),
      highConfidence: suggestions.filter(s => s.confidence === 'high').length,
      mediumConfidence: suggestions.filter(s => s.confidence === 'medium').length,
      lowConfidence: suggestions.filter(s => s.confidence === 'low').length
    }
    
    return NextResponse.json({
      suggestions: suggestions.slice(0, 20), // Limit to top 20 suggestions
      summary
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate smart suggestions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { suggestionId, action } = await request.json()
    
    if (!suggestionId || !action) {
      return NextResponse.json(
        { error: 'Suggestion ID and action are required' },
        { status: 400 }
      )
    }
    
    // In a real implementation, you'd execute the suggested action
    // For now, just log the action
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level: 'INFO',
      message: `Smart suggestion ${suggestionId} ${action} by user`
    }
    
    // Log the action
    const dataDir = path.join(process.cwd(), 'data')
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
    
    return NextResponse.json({
      success: true,
      message: `Suggestion ${action} successfully`
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process suggestion action' },
      { status: 500 }
    )
  }
}
