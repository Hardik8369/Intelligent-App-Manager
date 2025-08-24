import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

interface FileInfo {
  path: string
  name: string
  size: number
  hash: string
}

interface SimilarFile {
  file1: FileInfo
  file2: FileInfo
  similarity: number
  diff?: string
}

// Simple text similarity calculation using Levenshtein distance
function calculateSimilarity(str1: string, str2: string): number {
  const matrix = []
  const len1 = str1.length
  const len2 = str2.length
  
  if (len1 === 0) return len2 === 0 ? 1 : 0
  if (len2 === 0) return 0
  
  // Initialize matrix
  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j
  }
  
  // Fill matrix
  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  
  const maxLen = Math.max(len1, len2)
  return (maxLen - matrix[len2][len1]) / maxLen
}

// Extract text content from files for comparison
async function extractTextContent(filePath: string): Promise<string> {
  try {
    const ext = path.extname(filePath).toLowerCase()
    
    // For now, we'll focus on comparing file names and basic metadata
    // In a real implementation, you'd add PDF, DOCX, etc. text extraction
    const fileName = path.basename(filePath, ext)
    const stats = await fs.stat(filePath)
    
    return `${fileName} ${stats.size} ${stats.mtime.toISOString()}`
  } catch (error) {
    return path.basename(filePath)
  }
}

// Generate a simple diff preview
function generateDiff(text1: string, text2: string): string {
  const words1 = text1.split(' ')
  const words2 = text2.split(' ')
  
  const maxLen = Math.max(words1.length, words2.length)
  const diff = []
  
  for (let i = 0; i < maxLen; i++) {
    const word1 = words1[i] || ''
    const word2 = words2[i] || ''
    
    if (word1 === word2) {
      diff.push(`✓ ${word1}`)
    } else {
      if (word1) diff.push(`- ${word1}`)
      if (word2) diff.push(`+ ${word2}`)
    }
  }
  
  return diff.slice(0, 10).join('\n') // Limit preview
}

async function findSimilarFiles(directory: string): Promise<SimilarFile[]> {
  try {
    // Load last scan results
    const dataDir = path.join(process.cwd(), 'data')
    const scanResultPath = path.join(dataDir, 'last-scan.json')
    
    const scanData = await fs.readFile(scanResultPath, 'utf-8')
    const scanResult = JSON.parse(scanData)
    
    const allFiles: FileInfo[] = []
    
    // Collect all files from categorized results
    for (const [category, files] of Object.entries(scanResult.categorizedFiles)) {
      allFiles.push(...(files as FileInfo[]))
    }
    
    const similarPairs: SimilarFile[] = []
    const SIMILARITY_THRESHOLD = 0.85
    
    // Compare each file with every other file
    for (let i = 0; i < allFiles.length; i++) {
      for (let j = i + 1; j < allFiles.length; j++) {
        const file1 = allFiles[i]
        const file2 = allFiles[j]
        
        // Skip if files are identical (same hash)
        if (file1.hash === file2.hash) continue
        
        // Extract content for comparison
        const content1 = await extractTextContent(file1.path)
        const content2 = await extractTextContent(file2.path)
        
        // Calculate similarity
        const similarity = calculateSimilarity(content1, content2)
        
        if (similarity >= SIMILARITY_THRESHOLD) {
          const diff = generateDiff(content1, content2)
          
          similarPairs.push({
            file1,
            file2,
            similarity,
            diff
          })
        }
      }
    }
    
    // Sort by similarity (highest first)
    return similarPairs.sort((a, b) => b.similarity - a.similarity)
  } catch (error) {
    console.error('Error finding similar files:', error)
    return []
  }
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
    
    if (logs.length > 1000) {
      logs = logs.slice(-1000)
    }
    
    await fs.writeFile(logPath, JSON.stringify({ logs }, null, 2))
  } catch (error) {
    console.error('Failed to write log:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { directory } = await request.json()
    
    if (!directory) {
      return NextResponse.json(
        { error: 'Directory is required' },
        { status: 400 }
      )
    }
    
    await logOperation(`Starting similar files analysis for: ${directory}`)
    
    const startTime = Date.now()
    const similarFiles = await findSimilarFiles(directory)
    const analysisTime = (Date.now() - startTime) / 1000
    
    await logOperation(`Similar files analysis completed in ${analysisTime.toFixed(2)}s, found ${similarFiles.length} similar pairs`)
    
    return NextResponse.json({
      similarFiles,
      analysisTime,
      totalPairs: similarFiles.length
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    await logOperation(`Similar files analysis failed: ${errorMessage}`, 'ERROR')
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
