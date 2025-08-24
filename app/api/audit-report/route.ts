import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

interface AuditReport {
  timestamp: string
  summary: {
    totalFiles: number
    duplicateGroups: number
    categoriesFound: number
    storageAnalyzed: number
    violationsFound: number
  }
  scanDetails: any
  duplicateGroups: any[]
  categories: any
  policyViolations: any[]
  userActions: any[]
  recommendations: string[]
}

async function generateAuditReport(): Promise<AuditReport> {
  const dataDir = path.join(process.cwd(), 'data')
  
  // Load scan results
  let scanResult = { totalFiles: 0, duplicateGroups: [], categorizedFiles: {} }
  try {
    const scanData = await fs.readFile(path.join(dataDir, 'last-scan.json'), 'utf-8')
    scanResult = JSON.parse(scanData)
  } catch (error) {
    // Use empty data if no scan results
  }
  
  // Load logs for user actions
  let logs = []
  try {
    const logData = await fs.readFile(path.join(dataDir, 'logs.json'), 'utf-8')
    logs = JSON.parse(logData).logs || []
  } catch (error) {
    // Use empty logs if none exist
  }
  
  // Load system stats
  let stats = { totalScans: 0, storageSaved: 0 }
  try {
    const statsData = await fs.readFile(path.join(dataDir, 'system-stats.json'), 'utf-8')
    stats = JSON.parse(statsData)
  } catch (error) {
    // Use default stats
  }
  
  // Calculate total storage analyzed
  const allFiles = Object.values(scanResult.categorizedFiles || {}).flat() as any[]
  const totalStorage = allFiles.reduce((acc, file) => acc + (file.size || 0), 0)
  
  // Generate recommendations
  const recommendations = []
  if (scanResult.duplicateGroups.length > 0) {
    recommendations.push(`Found ${scanResult.duplicateGroups.length} duplicate groups. Consider removing duplicates to save space.`)
  }
  if (allFiles.length > 100) {
    recommendations.push('Large number of applications detected. Consider regular cleanup.')
  }
  if (stats.storageSaved > 0) {
    recommendations.push(`Already saved ${(stats.storageSaved / 1024).toFixed(2)} GB through cleanup operations.`)
  }
  
  const report: AuditReport = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFiles: scanResult.totalFiles || 0,
      duplicateGroups: scanResult.duplicateGroups?.length || 0,
      categoriesFound: Object.keys(scanResult.categorizedFiles || {}).length,
      storageAnalyzed: Math.round(totalStorage / (1024 * 1024)), // MB
      violationsFound: 0 // Would be populated from policy check
    },
    scanDetails: {
      scanTime: scanResult.scanTime || 0,
      totalScans: stats.totalScans,
      lastScanDate: new Date().toISOString()
    },
    duplicateGroups: scanResult.duplicateGroups || [],
    categories: scanResult.categorizedFiles || {},
    policyViolations: [], // Would be populated from policy API
    userActions: logs.filter((log: any) => 
      log.message.includes('Deleted') || 
      log.message.includes('Organized') ||
      log.message.includes('Tagged')
    ).slice(-20), // Last 20 actions
    recommendations
  }
  
  return report
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'
    
    const report = await generateAuditReport()
    
    if (format === 'pdf') {
      // In a real implementation, you'd use a PDF library like puppeteer or pdfkit
      const pdfContent = `
INTELLIGENT APPLICATION MANAGEMENT SYSTEM
AUDIT REPORT

Generated: ${report.timestamp}

SUMMARY
=======
Total Files Scanned: ${report.summary.totalFiles}
Duplicate Groups Found: ${report.summary.duplicateGroups}
Categories Identified: ${report.summary.categoriesFound}
Storage Analyzed: ${report.summary.storageAnalyzed} MB
Policy Violations: ${report.summary.violationsFound}

SCAN DETAILS
============
Total Scans Performed: ${report.scanDetails.totalScans}
Last Scan Duration: ${report.scanDetails.scanTime}s
Last Scan Date: ${report.scanDetails.lastScanDate}

DUPLICATE GROUPS
===============
${report.duplicateGroups.map((group: any, index: number) => 
  `Group ${index + 1}: ${group.files.length} files (${(group.size / 1024 / 1024).toFixed(2)} MB each)`
).join('\n')}

CATEGORIES
==========
${Object.entries(report.categories).map(([category, files]: [string, any]) => 
  `${category}: ${files.length} files`
).join('\n')}

RECENT ACTIONS
==============
${report.userActions.map((action: any) => 
  `[${action.timestamp}] ${action.level}: ${action.message}`
).join('\n')}

RECOMMENDATIONS
===============
${report.recommendations.join('\n')}
      `
      
      return new NextResponse(pdfContent, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': 'attachment; filename="audit-report.txt"'
        }
      })
    }
    
    // JSON format
    return NextResponse.json(report)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate audit report' },
      { status: 500 }
    )
  }
}
