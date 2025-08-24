import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

function convertToCSV(data: any): string {
  if (!data.categorizedFiles) return ''
  
  const rows = ['File Name,Path,Hash,Category,Size (MB)']
  
  for (const [category, files] of Object.entries(data.categorizedFiles)) {
    for (const file of files as any[]) {
      const sizeInMB = (file.size / 1024 / 1024).toFixed(2)
      const row = [
        `"${file.name}"`,
        `"${file.path}"`,
        file.hash,
        category,
        sizeInMB
      ].join(',')
      rows.push(row)
    }
  }
  
  return rows.join('\n')
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'
    
    const dataDir = path.join(process.cwd(), 'data')
    const scanResultPath = path.join(dataDir, 'last-scan.json')
    
    let scanResult
    try {
      const scanData = await fs.readFile(scanResultPath, 'utf-8')
      scanResult = JSON.parse(scanData)
    } catch (error) {
      return NextResponse.json(
        { error: 'No scan results found. Please run a scan first.' },
        { status: 400 }
      )
    }
    
    // Add metadata to the report
    const report = {
      ...scanResult,
      generatedAt: new Date().toISOString(),
      summary: {
        totalFiles: scanResult.totalFiles,
        duplicateGroups: scanResult.duplicateGroups.length,
        categories: Object.keys(scanResult.categorizedFiles).length,
        scanTime: scanResult.scanTime
      }
    }
    
    if (format === 'csv') {
      const csvContent = convertToCSV(report)
      
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="scan-report.csv"'
        }
      })
    } else {
      // JSON format
      return new NextResponse(JSON.stringify(report, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="scan-report.json"'
        }
      })
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
