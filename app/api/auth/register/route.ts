import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'

interface User {
  id: string
  username: string
  email: string
  password: string
  role: 'admin' | 'user'
  createdAt: string
}

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

async function saveUsers(users: User[]): Promise<void> {
  const dataDir = path.join(process.cwd(), 'data')
  await fs.mkdir(dataDir, { recursive: true })
  
  const usersPath = path.join(dataDir, 'users.json')
  await fs.writeFile(usersPath, JSON.stringify({ users }, null, 2))
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    const { username, email, password, role = 'user' } = await request.json()
    
    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'Username, email, and password are required' },
        { status: 400 }
      )
    }
    
    const users = await loadUsers()
    
    // Check if user already exists
    if (users.find(u => u.username === username || u.email === email)) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      )
    }
    
    const newUser: User = {
      id: crypto.randomUUID(),
      username,
      email,
      password: hashPassword(password),
      role: role as 'admin' | 'user',
      createdAt: new Date().toISOString()
    }
    
    users.push(newUser)
    await saveUsers(users)
    
    return NextResponse.json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      }
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    )
  }
}
