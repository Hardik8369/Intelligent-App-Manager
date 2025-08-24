import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

interface PolicyRule {
  name: string
  allowed: boolean
  reason: string
  category: string
  patterns: string[]
}

interface PolicyViolation {
  filePath: string
  fileName: string
  violation: string
  reason: string
  severity: 'low' | 'medium' | 'high'
  action: 'warn' | 'block' | 'remove'
}

async function loadPolicyRules(): Promise<PolicyRule[]> {
  try {
    const dataDir = path.join(process.cwd(), 'data')
    const policyPath = path.join(dataDir, 'enterprise-policy.json')
    
    const policyData = await fs.readFile(policyPath, 'utf-8')
    return JSON.parse(policyData).rules || []
  } catch (error) {
    // Return default policy rules
    return [
      {
        name: 'Approved Development Tools',
        allowed: true,
        reason: 'Required for development work',
        category: 'development',
        patterns: ['visual studio', 'vscode', 'intellij', 'eclipse', 'git']
      },
      {
        name: 'Prohibited Entertainment Software',
        allowed: false,
        reason: 'Not allowed on corporate devices',
        category: 'entertainment',
        patterns: ['spotify', 'steam', 'discord', 'twitch', 'netflix']
      },
      {
        name: 'Prohibited P2P Software',
        allowed: false,
        reason: 'Security risk and bandwidth usage',
        category: 'p2p',
        patterns: ['bittorrent', 'utorrent', 'limewire', 'kazaa', 'emule']
      },
      {
        name: 'Approved Productivity Tools',
        allowed: true,
        reason: 'Essential for business operations',
        category: 'productivity',
        patterns: ['microsoft office', 'adobe', 'slack', 'zoom', 'teams']
      }
    ]
  }
}

async function checkPolicyViolations(): Promise<PolicyViolation[]> {
  try {
    // Load last scan results
    const dataDir = path.join(process.cwd(), 'data')
    const scanResultPath = path.join(dataDir, 'last-scan.json')
    
    let scanResult
    try {
      const scanData = await fs.readFile(scanResultPath, 'utf-8')
      scanResult = JSON.parse(scanData)
    } catch (error) {
      return []
    }
    
    const policyRules = await loadPolicyRules()
    const violations: PolicyViolation[] = []
    
    // Check all scanned files against policy
    const allFiles = Object.values(scanResult.categorizedFiles || {}).flat()
    
    for (const file of allFiles as any[]) {
      const fileName = file.name.toLowerCase()
      const filePath = file.path.toLowerCase()
      
      for (const rule of policyRules) {
        if (!rule.allowed) {
          const matches = rule.patterns.some(pattern => 
            fileName.includes(pattern.toLowerCase()) || 
            filePath.includes(pattern.toLowerCase())
          )
          
          if (matches) {
            violations.push({
              filePath: file.path,
              fileName: file.name,
              violation: rule.name,
              reason: rule.reason,
              severity: rule.category === 'p2p' ? 'high' : 
                       rule.category === 'entertainment' ? 'medium' : 'low',
              action: rule.category === 'p2p' ? 'remove' : 'warn'
            })
          }
        }
      }
    }
    
    return violations
  } catch (error) {
    console.error('Policy check error:', error)
    return []
  }
}

export async function GET() {
  try {
    const violations = await checkPolicyViolations()
    const policyRules = await loadPolicyRules()
    
    return NextResponse.json({
      violations,
      totalViolations: violations.length,
      highSeverity: violations.filter(v => v.severity === 'high').length,
      mediumSeverity: violations.filter(v => v.severity === 'medium').length,
      lowSeverity: violations.filter(v => v.severity === 'low').length,
      policyRules
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check policy violations' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { rules } = await request.json()
    
    const dataDir = path.join(process.cwd(), 'data')
    await fs.mkdir(dataDir, { recursive: true })
    
    const policyPath = path.join(dataDir, 'enterprise-policy.json')
    await fs.writeFile(policyPath, JSON.stringify({ rules }, null, 2))
    
    return NextResponse.json({ success: true, message: 'Policy rules updated' })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update policy rules' },
      { status: 500 }
    )
  }
}
