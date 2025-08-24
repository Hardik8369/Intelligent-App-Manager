import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

interface FileTag {
  fileHash: string
  filePath: string
  tags: string[]
  notes: string
  userId: string
  createdAt: string
  updatedAt: string
}

function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as any
  } catch (error) {
    return null
  }
}

async function loadUserTags(userId: string): Promise<FileTag[]> {
  try {
    const dataDir = path.join(process.cwd(), 'data', 'user-tags')
    await fs.mkdir(dataDir, { recursive: true })
    
    const tagsPath = path.join(dataDir, `${userId}.json`)
    const tagsData = await fs.readFile(tagsPath, 'utf-8')
    return JSON.parse(tagsData).tags || []
  } catch (error) {
    return []
  }
}

async function saveUserTags(userId: string, tags: FileTag[]): Promise<void> {
  const dataDir = path.join(process.cwd(), 'data', 'user-tags')
  await fs.mkdir(dataDir, { recursive: true })
  
  const tagsPath = path.join(dataDir, `${userId}.json`)
  await fs.writeFile(tagsPath, JSON.stringify({ tags }, null, 2))
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const tags = await loadUserTags(decoded.userId)
    return NextResponse.json({ tags })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load tags' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const token = authHeader.substring(7)
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const { fileHash, filePath, tags, notes } = await request.json()
    
    const userTags = await loadUserTags(decoded.userId)
    const existingTagIndex = userTags.findIndex(t => t.fileHash === fileHash)
    
    const fileTag: FileTag = {
      fileHash,
      filePath,
      tags: tags || [],
      notes: notes || '',
      userId: decoded.userId,
      createdAt: existingTagIndex >= 0 ? userTags[existingTagIndex].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    if (existingTagIndex >= 0) {
      userTags[existingTagIndex] = fileTag
    } else {
      userTags.push(fileTag)
    }
    
    await saveUserTags(decoded.userId, userTags)
    
    return NextResponse.json({ success: true, tag: fileTag })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save tag' }, { status: 500 })
  }
}
