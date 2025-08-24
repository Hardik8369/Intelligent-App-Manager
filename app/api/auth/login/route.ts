import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'

interface User {
  id: string
  username: string
  email: string
  password: string
  role: 'admin' | 'user'
  createdAt: string
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

async function loadUsers(): Promise<User[]> {
  try {
    const dataDir = path.join(process.cwd(), 'data')
    const usersPath = path.join(dataDir, 'users.json')
    
    const usersData = await fs.readFile(usersPath, 'utf-8')
    return JSON.parse(usersData).users || []
  } catch (error) {
    return []
  }
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()
    
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }
    
    const users = await loadUsers()
    const hashedPassword = hashPassword(password)
    
    const user = users.find(u => 
      u.username === username && u.password === hashedPassword
    )
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    )
    
    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}
