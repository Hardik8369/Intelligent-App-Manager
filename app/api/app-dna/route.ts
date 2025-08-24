import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'

interface AppDNA {
  filePath: string
  entropy: number
  compressionRatio: number
  magicBytes: string
  architecture: string
  fileType: string
  complexity: 'low' | 'medium' | 'high'
  suspiciousIndicators: string[]
}

function calculateEntropy(buffer: Buffer): number {
  const frequencies = new Array(256).fill(0)
  
  for (let i = 0; i < buffer.length; i++) {
    frequencies[buffer[i]]++
  }
  
  let entropy = 0
  const length = buffer.length
  
  for (let i = 0; i < 256; i++) {
    if (frequencies[i] > 0) {
      const probability = frequencies[i] / length
      entropy -= probability * Math.log2(probability)
    }
  }
  
  return entropy
}

function detectArchitecture(buffer: Buffer): string {
  const magicBytes = buffer.slice(0, 4)
  
  // PE header detection
  if (magicBytes[0] === 0x4D && magicBytes[1] === 0x5A) { // MZ
    try {
      const peOffset = buffer.readUInt32LE(60)
      if (peOffset < buffer.length - 4) {
        const peSignature = buffer.slice(peOffset, peOffset + 4)
        if (peSignature.toString() === 'PE\0\0') {
          const machine = buffer.readUInt16LE(peOffset + 4)
          switch (machine) {
            case 0x014c: return 'x86'
            case 0x8664: return 'x64'
            case 0x01c4: return 'ARM'
            case 0xaa64: return 'ARM64'
            default: return 'Unknown PE'
          }
        }
      }
    } catch (error) {
      return 'PE (corrupted)'
    }
  }
  
  // ELF detection
  if (magicBytes[0] === 0x7F && magicBytes[1] === 0x45 && 
      magicBytes[2] === 0x4C && magicBytes[3] === 0x46) {
    const archByte = buffer[18]
    switch (archByte) {
      case 0x03: return 'x86'
      case 0x3E: return 'x64'
      case 0x28: return 'ARM'
      case 0xB7: return 'ARM64'
      default: return 'ELF Unknown'
    }
  }
  
  // Mach-O detection
  if ((magicBytes[0] === 0xFE && magicBytes[1] === 0xED && 
       magicBytes[2] === 0xFA && magicBytes[3] === 0xCE) ||
      (magicBytes[0] === 0xCE && magicBytes[1] === 0xFA && 
       magicBytes[2] === 0xED && magicBytes[3] === 0xFE)) {
    return 'Mach-O'
  }
  
  return 'Unknown'
}

function getMagicBytes(buffer: Buffer): string {
  return buffer.slice(0, 16).toString('hex').toUpperCase()
}

function detectSuspiciousIndicators(buffer: Buffer, filePath: string): string[] {
  const indicators: string[] = []
  const entropy = calculateEntropy(buffer)
  
  if (entropy > 7.5) {
    indicators.push('High entropy (possible packing/encryption)')
  }
  
  if (buffer.includes(Buffer.from('UPX'))) {
    indicators.push('UPX packer detected')
  }
  
  if (buffer.includes(Buffer.from('VMProtect'))) {
    indicators.push('VMProtect detected')
  }
  
  const fileName = path.basename(filePath).toLowerCase()
  if (fileName.includes('crack') || fileName.includes('keygen') || fileName.includes('patch')) {
    indicators.push('Suspicious filename')
  }
  
  return indicators
}

async function analyzeFile(filePath: string): Promise<AppDNA> {
  try {
    const buffer = await fs.readFile(filePath)
    const stats = await fs.stat(filePath)
    
    const entropy = calculateEntropy(buffer)
    const architecture = detectArchitecture(buffer)
    const magicBytes = getMagicBytes(buffer)
    const suspiciousIndicators = detectSuspiciousIndicators(buffer, filePath)
    
    // Simple compression ratio estimation
    const compressed = crypto.createHash('sha256').update(buffer).digest()
    const compressionRatio = compressed.length / buffer.length
    
    const complexity = entropy > 7 ? 'high' : entropy > 5 ? 'medium' : 'low'
    
    return {
      filePath,
      entropy: Math.round(entropy * 100) / 100,
      compressionRatio: Math.round(compressionRatio * 10000) / 10000,
      magicBytes,
      architecture,
      fileType: path.extname(filePath).toLowerCase(),
      complexity,
      suspiciousIndicators
    }
  } catch (error) {
    throw new Error(`Failed to analyze file: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
    
    const dna = await analyzeFile(filePath)
    return NextResponse.json(dna)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    )
  }
}
