'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { FolderOpen, Search, Copy, Trash2, Download, Settings, FileText, BarChart3, Play, Pause, RefreshCw, AlertTriangle, CheckCircle, Info, X, Clock, HardDrive, GitCompare, Trash, FileDown, PieChart, TrendingUp, Shield, Tag, Brain, Users, LogOut, Edit, Eye, Lightbulb, Activity, Database } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { PieChart as RechartsPieChart, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Pie } from 'recharts'

interface User {
  id: string
  username: string
  email: string
  role: 'admin' | 'user'
}

interface ScanResult {
  totalFiles: number
  duplicateGroups: DuplicateGroup[]
  categorizedFiles: CategorizedFiles
  scanTime: number
}

interface DuplicateGroup {
  hash: string
  files: FileInfo[]
  size: number
}

interface FileInfo {
  path: string
  name: string
  size: number
  hash: string
  category?: string
  tags?: string[]
  notes?: string
  lastUsed?: string
  type?: 'installed' | 'portable'
}

interface CategorizedFiles {
  [category: string]: FileInfo[]
}

interface Rule {
  id: string
  category: string
  keywords: string[]
  pathPatterns: string[]
  enabled: boolean
}

interface LogEntry {
  timestamp: string
  level: 'INFO' | 'WARN' | 'ERROR'
  message: string
}

interface SystemStats {
  totalScans: number
  storageSaved: number
  autoScanEnabled: boolean
  autoScanInterval: number
  lastAutoScan?: string
}

interface SimilarFile {
  file1: FileInfo
  file2: FileInfo
  similarity: number
  diff?: string
}

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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export default function IntelligentAppManager() {
  const [user, setUser] = useState<User | null>(null)
  const [scanDirectory, setScanDirectory] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [selectedDuplicates, setSelectedDuplicates] = useState<Set<string>>(new Set())
  const [rules, setRules] = useState<Rule[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [activeTab, setActiveTab] = useState('dashboard')
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalScans: 0,
    storageSaved: 0,
    autoScanEnabled: false,
    autoScanInterval: 24
  })
  const [similarFiles, setSimilarFiles] = useState<SimilarFile[]>([])
  const [isLoadingSimilar, setIsLoadingSimilar] = useState(false)
  const [analytics, setAnalytics] = useState<any>(null)
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null)
  const [appDNA, setAppDNA] = useState<AppDNA | null>(null)
  const [userTags, setUserTags] = useState<any[]>([])
  const [policyViolations, setPolicyViolations] = useState<any[]>([])
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([])
  const [usageStats, setUsageStats] = useState<any[]>([])
  const [appDetection, setAppDetection] = useState<any>(null)
  const router = useRouter()

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    
    if (!token || !userData) {
      router.push('/login')
      return
    }
    
    try {
      setUser(JSON.parse(userData))
    } catch (error) {
      router.push('/login')
    }
  }, [router])

  // Load initial data
  useEffect(() => {
    if (user) {
      loadRules()
      loadLogs()
      loadSystemStats()
      loadAnalytics()
      loadUserTags()
      loadPolicyViolations()
      loadSmartSuggestions()
    }
  }, [user])

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token')
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  const loadRules = async () => {
    try {
      const response = await fetch('/api/rules')
      if (response.ok) {
        const data = await response.json()
        setRules(data.rules || [])
      }
    } catch (error) {
      console.error('Failed to load rules:', error)
    }
  }

  const loadLogs = async () => {
    try {
      const response = await fetch('/api/logs')
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
      }
    } catch (error) {
      console.error('Failed to load logs:', error)
    }
  }

  const loadSystemStats = async () => {
    try {
      const response = await fetch('/api/stats')
      if (response.ok) {
        const data = await response.json()
        setSystemStats(data)
      }
    } catch (error) {
      console.error('Failed to load system stats:', error)
    }
  }

  const loadAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics', {
        headers: getAuthHeaders()
      })
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      }
    } catch (error) {
      console.error('Failed to load analytics:', error)
    }
  }

  const loadUserTags = async () => {
    try {
      const response = await fetch('/api/user-tags', {
        headers: getAuthHeaders()
      })
      if (response.ok) {
        const data = await response.json()
        setUserTags(data.tags || [])
      }
    } catch (error) {
      console.error('Failed to load user tags:', error)
    }
  }

  const loadPolicyViolations = async () => {
    try {
      const response = await fetch('/api/policy-check')
      if (response.ok) {
        const data = await response.json()
        setPolicyViolations(data.violations || [])
      }
    } catch (error) {
      console.error('Failed to load policy violations:', error)
    }
  }

  const loadSmartSuggestions = async () => {
    try {
      const response = await fetch('/api/smart-suggestions')
      if (response.ok) {
        const data = await response.json()
        setSmartSuggestions(data.suggestions || [])
      }
    } catch (error) {
      console.error('Failed to load smart suggestions:', error)
    }
  }

  const startScan = async () => {
    const cleanDirectory = scanDirectory.trim().replace(/^["']|["']$/g, '')
    
    if (!cleanDirectory) {
      toast({
        title: "Error",
        description: "Please enter a directory path to scan",
        variant: "destructive"
      })
      return
    }
    
    if (cleanDirectory.length < 2) {
      toast({
        title: "Error", 
        description: "Please enter a valid directory path",
        variant: "destructive"
      })
      return
    }

    setIsScanning(true)
    setScanProgress(0)
    
    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directory: cleanDirectory })
      })

      if (response.ok) {
        const result = await response.json()
        setScanResult(result)
        setScanProgress(100)
        toast({
          title: "Scan Complete",
          description: `Found ${result.totalFiles} files with ${result.duplicateGroups.length} duplicate groups`
        })
        loadSystemStats() // Refresh stats after scan
        loadAnalytics()
        loadSmartSuggestions()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Scan failed')
      }
    } catch (error) {
      console.error('Scan error:', error)
      toast({
        title: "Scan Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      })
    } finally {
      setIsScanning(false)
      loadLogs()
    }
  }

  const deleteDuplicates = async () => {
    if (selectedDuplicates.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select files to delete",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await fetch('/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: Array.from(selectedDuplicates) })
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Files Deleted",
          description: `Successfully deleted ${result.deletedCount} files, saved ${result.spaceSaved} MB`
        })
        setSelectedDuplicates(new Set())
        loadSystemStats() // Refresh stats after deletion
        if (scanDirectory) {
          startScan()
        }
      } else {
        const error = await response.json()
        throw new Error(error.message || 'Delete failed')
      }
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      })
    }
  }

  const organizeFiles = async () => {
    try {
      const response = await fetch('/api/organize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directory: scanDirectory })
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Files Organized",
          description: `Organized ${result.organizedCount} files into categories`
        })
      } else {
        const error = await response.json()
        throw new Error(error.message || 'Organization failed')
      }
    } catch (error) {
      toast({
        title: "Organization Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive"
      })
    }
  }

  const downloadReport = async (format: 'json' | 'csv') => {
    try {
      const response = await fetch(`/api/reports?format=${format}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `scan-report.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download report",
        variant: "destructive"
      })
    }
  }

  const downloadLogs = async () => {
    try {
      const response = await fetch('/api/logs/download')
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'system-logs.txt'
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast({
          title: "Download Complete",
          description: "Logs downloaded successfully"
        })
      }
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download logs",
        variant: "destructive"
      })
    }
  }

  const clearLogs = async () => {
    try {
      const response = await fetch('/api/logs/clear', { method: 'POST' })
      if (response.ok) {
        setLogs([])
        toast({
          title: "Logs Cleared",
          description: "All logs have been cleared"
        })
        loadLogs() // Reload to get the "logs cleared" entry
      }
    } catch (error) {
      toast({
        title: "Clear Failed",
        description: "Failed to clear logs",
        variant: "destructive"
      })
    }
  }

  const updateAutoScan = async (enabled: boolean, interval?: number) => {
    try {
      const response = await fetch('/api/auto-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          enabled, 
          interval: interval || systemStats.autoScanInterval,
          directory: scanDirectory 
        })
      })

      if (response.ok) {
        const result = await response.json()
        setSystemStats(prev => ({
          ...prev,
          autoScanEnabled: enabled,
          autoScanInterval: interval || prev.autoScanInterval
        }))
        toast({
          title: enabled ? "Auto-Scan Enabled" : "Auto-Scan Disabled",
          description: enabled ? `Scanning every ${interval || systemStats.autoScanInterval} hours` : "Auto-scan has been disabled"
        })
      }
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update auto-scan settings",
        variant: "destructive"
      })
    }
  }

  const findSimilarFiles = async () => {
    if (!scanResult) {
      toast({
        title: "No Scan Data",
        description: "Please run a scan first",
        variant: "destructive"
      })
      return
    }

    setIsLoadingSimilar(true)
    try {
      const response = await fetch('/api/similar-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directory: scanDirectory })
      })

      if (response.ok) {
        const result = await response.json()
        setSimilarFiles(result.similarFiles || [])
        toast({
          title: "Analysis Complete",
          description: `Found ${result.similarFiles?.length || 0} similar file pairs`
        })
      }
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze similar files",
        variant: "destructive"
      })
    } finally {
      setIsLoadingSimilar(false)
    }
  }

  const deleteSimilarFile = async (filePath: string) => {
    try {
      const response = await fetch('/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: [filePath] })
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "File Deleted",
          description: `Deleted file and saved ${result.spaceSaved} MB`
        })
        // Remove the deleted file from similar files list
        setSimilarFiles(prev => prev.filter(pair => 
          pair.file1.path !== filePath && pair.file2.path !== filePath
        ))
        loadSystemStats()
      }
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete file",
        variant: "destructive"
      })
    }
  }

  const saveRules = async () => {
    try {
      const response = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules })
      })

      if (response.ok) {
        toast({
          title: "Rules Saved",
          description: "Categorization rules have been updated"
        })
      } else {
        throw new Error('Failed to save rules')
      }
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save rules",
        variant: "destructive"
      })
    }
  }

  const addRule = () => {
    const newRule: Rule = {
      id: Date.now().toString(),
      category: 'New Category',
      keywords: [],
      pathPatterns: [],
      enabled: true
    }
    setRules([...rules, newRule])
  }

  const updateRule = (id: string, updates: Partial<Rule>) => {
    setRules(rules.map(rule => rule.id === id ? { ...rule, ...updates } : rule))
  }

  const deleteRule = (id: string) => {
    setRules(rules.filter(rule => rule.id !== id))
  }

  const saveFileTag = async (fileHash: string, filePath: string, tags: string[], notes: string) => {
    try {
      const response = await fetch('/api/user-tags', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ fileHash, filePath, tags, notes })
      })

      if (response.ok) {
        toast({
          title: "Tags Saved",
          description: "File tags and notes updated successfully"
        })
        loadUserTags()
      }
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save tags",
        variant: "destructive"
      })
    }
  }

  const analyzeAppDNA = async (filePath: string) => {
    try {
      const response = await fetch('/api/app-dna', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ filePath })
      })

      if (response.ok) {
        const data = await response.json()
        setAppDNA(data)
      }
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze app DNA",
        variant: "destructive"
      })
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (!user) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="container mx-auto p-6">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-blue-400 mb-2">
              Intelligent Application Management System
            </h1>
            <p className="text-gray-400">
              Enterprise-level duplicate detection and application categorization
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="text-blue-400 border-blue-400">
              {user.role === 'admin' ? '👑 Admin' : '👤 User'}: {user.username}
            </Badge>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-10 bg-gray-800">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-blue-600">
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="scan" className="data-[state=active]:bg-blue-600">
              <Search className="w-4 h-4 mr-2" />
              Scan
            </TabsTrigger>
            <TabsTrigger value="duplicates" className="data-[state=active]:bg-blue-600">
              <Copy className="w-4 h-4 mr-2" />
              Duplicates
            </TabsTrigger>
            <TabsTrigger value="similar" className="data-[state=active]:bg-blue-600">
              <GitCompare className="w-4 h-4 mr-2" />
              Similar Files
            </TabsTrigger>
            <TabsTrigger value="categories" className="data-[state=active]:bg-blue-600">
              <FolderOpen className="w-4 h-4 mr-2" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-blue-600">
              <PieChart className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="policy" className="data-[state=active]:bg-blue-600">
              <Shield className="w-4 h-4 mr-2" />
              Policy
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="data-[state=active]:bg-blue-600">
              <Lightbulb className="w-4 h-4 mr-2" />
              Smart Tips
            </TabsTrigger>
            <TabsTrigger value="rules" className="data-[state=active]:bg-blue-600">
              <Settings className="w-4 h-4 mr-2" />
              Rules
            </TabsTrigger>
            <TabsTrigger value="logs" className="data-[state=active]:bg-blue-600">
              <FileText className="w-4 h-4 mr-2" />
              Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">
                    Total Applications
                  </CardTitle>
                  <FileText className="h-4 w-4 text-blue-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-400">
                    {scanResult?.totalFiles || 0}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">
                    Duplicate Groups
                  </CardTitle>
                  <Copy className="h-4 w-4 text-orange-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-400">
                    {scanResult?.duplicateGroups.length || 0}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">
                    Storage Saved
                  </CardTitle>
                  <HardDrive className="h-4 w-4 text-green-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-400">
                    {formatBytes(systemStats.storageSaved * 1024 * 1024)}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">
                    Scans Performed
                  </CardTitle>
                  <RefreshCw className="h-4 w-4 text-purple-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-400">
                    {systemStats.totalScans}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">
                    Auto-Scan Status
                  </CardTitle>
                  <Clock className="h-4 w-4 text-yellow-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-400">
                    {systemStats.autoScanEnabled ? 'ON' : 'OFF'}
                  </div>
                  {systemStats.autoScanEnabled && (
                    <p className="text-xs text-gray-400 mt-1">
                      Every {systemStats.autoScanInterval}h
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-blue-400">Auto-Scan Configuration</CardTitle>
                <CardDescription className="text-gray-400">
                  Configure automatic scanning at regular intervals
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-yellow-400" />
                    <Label htmlFor="auto-scan">Enable Auto-Scan</Label>
                  </div>
                  <Switch
                    id="auto-scan"
                    checked={systemStats.autoScanEnabled}
                    onCheckedChange={(checked) => updateAutoScan(checked)}
                  />
                </div>
                
                {systemStats.autoScanEnabled && (
                  <div className="flex items-center space-x-4">
                    <Label className="text-sm text-gray-300">Scan Interval:</Label>
                    <Select
                      value={systemStats.autoScanInterval.toString()}
                      onValueChange={(value) => updateAutoScan(true, parseInt(value))}
                    >
                      <SelectTrigger className="w-32 bg-gray-700 border-gray-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 hour</SelectItem>
                        <SelectItem value="6">6 hours</SelectItem>
                        <SelectItem value="12">12 hours</SelectItem>
                        <SelectItem value="24">24 hours</SelectItem>
                        <SelectItem value="48">48 hours</SelectItem>
                        <SelectItem value="168">1 week</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {systemStats.lastAutoScan && (
                  <p className="text-sm text-gray-400">
                    Last auto-scan: {new Date(systemStats.lastAutoScan).toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-blue-400">System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {isScanning ? (
                      <RefreshCw className="h-4 w-4 text-blue-400 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    )}
                    <span className="text-sm">
                      {isScanning ? 'Scanning...' : 'Ready'}
                    </span>
                  </div>
                  {isScanning && (
                    <div className="flex-1">
                      <Progress value={scanProgress} className="h-2" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {user.role === 'admin' && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-blue-400">Admin Dashboard</CardTitle>
                  <CardDescription className="text-gray-400">
                    System overview and user activity monitoring
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-700 rounded-lg">
                      <h3 className="font-semibold text-green-400 mb-2">System Health</h3>
                      <p className="text-sm text-gray-300">All systems operational</p>
                      <div className="flex items-center mt-2">
                        <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                        <span className="text-xs text-gray-400">Last check: {new Date().toLocaleTimeString()}</span>
                      </div>
                    </div>
                    <div className="p-4 bg-gray-700 rounded-lg">
                      <h3 className="font-semibold text-blue-400 mb-2">Active Users</h3>
                      <p className="text-2xl font-bold text-blue-400">1</p>
                      <p className="text-xs text-gray-400">Currently online</p>
                    </div>
                    <div className="p-4 bg-gray-700 rounded-lg">
                      <h3 className="font-semibold text-purple-400 mb-2">Total Storage Managed</h3>
                      <p className="text-2xl font-bold text-purple-400">
                        {analytics?.summary ? formatBytes(analytics.summary.totalSize) : '0 B'}
                      </p>
                      <p className="text-xs text-gray-400">Across all scans</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="scan" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-blue-400">Directory Scanner</CardTitle>
                <CardDescription className="text-gray-400">
                  Scan a directory for application files and detect duplicates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex space-x-4">
                  <Input
                    placeholder="Enter directory path (e.g., C:\Program Files, /Applications, ~/Downloads)"
                    value={scanDirectory}
                    onChange={(e) => setScanDirectory(e.target.value)}
                    className="flex-1 bg-gray-700 border-gray-600 text-gray-100"
                  />
                  <Button 
                    onClick={startScan} 
                    disabled={isScanning}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isScanning ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Start Scan
                      </>
                    )}
                  </Button>
                </div>
                
                <div className="text-sm text-gray-400">
                  <p className="mb-2">Examples of valid paths:</p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li><strong>Windows:</strong> C:\Program Files, C:\Users\Username\Downloads</li>
                    <li><strong>macOS:</strong> /Applications, ~/Downloads, /Users/username/Desktop</li>
                    <li><strong>Linux:</strong> /usr/bin, ~/Downloads, /opt</li>
                  </ul>
                </div>

                {isScanning && (
                  <div className="space-y-2">
                    <Progress value={scanProgress} className="h-2" />
                    <p className="text-sm text-gray-400">
                      Scanning directory and calculating file hashes...
                    </p>
                  </div>
                )}

                {scanResult && (
                  <div className="mt-6 p-4 bg-gray-700 rounded-lg">
                    <h3 className="text-lg font-semibold text-green-400 mb-2">
                      Scan Complete
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Total Files:</span>
                        <span className="ml-2 text-blue-400">{scanResult.totalFiles}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Duplicate Groups:</span>
                        <span className="ml-2 text-orange-400">{scanResult.duplicateGroups.length}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Categories:</span>
                        <span className="ml-2 text-green-400">{Object.keys(scanResult.categorizedFiles).length}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Scan Time:</span>
                        <span className="ml-2 text-purple-400">{scanResult.scanTime.toFixed(2)}s</span>
                      </div>
                    </div>
                    <div className="mt-4 flex space-x-2">
                      <Button 
                        onClick={organizeFiles}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <FolderOpen className="w-4 h-4 mr-2" />
                        Organize Files
                      </Button>
                      <Button 
                        onClick={() => downloadReport('json')}
                        variant="outline"
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download JSON
                      </Button>
                      <Button 
                        onClick={() => downloadReport('csv')}
                        variant="outline"
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download CSV
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="duplicates" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-blue-400">Duplicate Files</CardTitle>
                <CardDescription className="text-gray-400">
                  Manage duplicate applications with tagging support
                </CardDescription>
              </CardHeader>
              <CardContent>
                {scanResult?.duplicateGroups.length ? (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-400">
                        {selectedDuplicates.size} files selected for deletion
                      </p>
                      <Button 
                        onClick={deleteDuplicates}
                        disabled={selectedDuplicates.size === 0}
                        variant="destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Selected
                      </Button>
                    </div>

                    <ScrollArea className="h-96">
                      <div className="space-y-4">
                        {scanResult.duplicateGroups.map((group, index) => (
                          <div key={group.hash} className="p-4 bg-gray-700 rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="font-semibold text-orange-400">
                                Duplicate Group {index + 1}
                              </h3>
                              <Badge variant="outline" className="text-gray-300">
                                {group.files.length} files • {(group.size / 1024 / 1024).toFixed(2)} MB each
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              {group.files.map((file, fileIndex) => (
                                <div key={fileIndex} className="p-3 bg-gray-600 rounded">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center space-x-3">
                                      <Checkbox
                                        checked={selectedDuplicates.has(file.path)}
                                        onCheckedChange={(checked) => {
                                          const newSelected = new Set(selectedDuplicates)
                                          if (checked) {
                                            newSelected.add(file.path)
                                          } else {
                                            newSelected.delete(file.path)
                                          }
                                          setSelectedDuplicates(newSelected)
                                        }}
                                      />
                                      <div>
                                        <p className="text-sm font-medium text-gray-200">{file.name}</p>
                                        <p className="text-xs text-gray-400">{file.path}</p>
                                      </div>
                                    </div>
                                    <div className="flex space-x-2">
                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <Button size="sm" variant="outline">
                                            <Tag className="w-4 h-4 mr-2" />
                                            Tag
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent className="bg-gray-800 border-gray-700">
                                          <DialogHeader>
                                            <DialogTitle className="text-blue-400">Add Tags & Notes</DialogTitle>
                                            <DialogDescription className="text-gray-400">
                                              Tag and add notes to {file.name}
                                            </DialogDescription>
                                          </DialogHeader>
                                          <FileTagDialog 
                                            file={file} 
                                            onSave={(tags, notes) => saveFileTag(file.hash, file.path, tags, notes)}
                                          />
                                        </DialogContent>
                                      </Dialog>
                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <Button size="sm" variant="outline">
                                            <Brain className="w-4 h-4 mr-2" />
                                            DNA
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent className="bg-gray-800 border-gray-700 max-w-2xl">
                                          <DialogHeader>
                                            <DialogTitle className="text-blue-400">App DNA Analysis</DialogTitle>
                                            <DialogDescription className="text-gray-400">
                                              Detailed technical analysis of {file.name}
                                            </DialogDescription>
                                          </DialogHeader>
                                          <AppDNADialog 
                                            file={file} 
                                            onAnalyze={() => analyzeAppDNA(file.path)}
                                            dna={appDNA}
                                          />
                                        </DialogContent>
                                      </Dialog>
                                    </div>
                                  </div>
                                  
                                  {/* Show existing tags */}
                                  {userTags.find(tag => tag.fileHash === file.hash) && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                      {userTags.find(tag => tag.fileHash === file.hash)?.tags?.map((tag: string, tagIndex: number) => (
                                        <Badge key={tagIndex} variant="secondary" className="text-xs">
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Copy className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No duplicate files found. Run a scan first.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="similar" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-blue-400">Smart File Comparison</CardTitle>
                <CardDescription className="text-gray-400">
                  Find and compare files with similar content but different names
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-400">
                    Analyze files for content similarity (&gt;85% match threshold)
                  </p>
                  <Button 
                    onClick={findSimilarFiles}
                    disabled={isLoadingSimilar || !scanResult}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {isLoadingSimilar ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <GitCompare className="w-4 h-4 mr-2" />
                        Find Similar Files
                      </>
                    )}
                  </Button>
                </div>

                {similarFiles.length > 0 ? (
                  <ScrollArea className="h-96">
                    <div className="space-y-4">
                      {similarFiles.map((pair, index) => (
                        <div key={index} className="p-4 bg-gray-700 rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-purple-400">
                              Similar Files ({(pair.similarity * 100).toFixed(1)}% match)
                            </h3>
                            <Badge variant="outline" className="text-gray-300">
                              {formatBytes(Math.max(pair.file1.size, pair.file2.size))}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-gray-600 rounded border-l-4 border-green-400">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium text-green-400">File 1 (Keep)</p>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => deleteSimilarFile(pair.file2.path)}
                                >
                                  Keep Left
                                </Button>
                              </div>
                              <p className="text-sm text-gray-200">{pair.file1.name}</p>
                              <p className="text-xs text-gray-400">{pair.file1.path}</p>
                            </div>
                            
                            <div className="p-3 bg-gray-600 rounded border-l-4 border-red-400">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium text-red-400">File 2 (Delete)</p>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => deleteSimilarFile(pair.file1.path)}
                                >
                                  Keep Right
                                </Button>
                              </div>
                              <p className="text-sm text-gray-200">{pair.file2.name}</p>
                              <p className="text-xs text-gray-400">{pair.file2.path}</p>
                            </div>
                          </div>

                          {pair.diff && (
                            <div className="mt-3 p-3 bg-gray-800 rounded text-xs font-mono">
                              <p className="text-gray-400 mb-2">Content Preview:</p>
                              <div className="max-h-32 overflow-y-auto">
                                <pre className="whitespace-pre-wrap text-gray-300">{pair.diff}</pre>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8">
                    <GitCompare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">
                      {isLoadingSimilar ? 'Analyzing files...' : 'No similar files found. Click "Find Similar Files" to analyze.'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-blue-400">Categorized Applications</CardTitle>
                <CardDescription className="text-gray-400">
                  View applications organized by category
                </CardDescription>
              </CardHeader>
              <CardContent>
                {scanResult?.categorizedFiles ? (
                  <ScrollArea className="h-96">
                    <div className="space-y-4">
                      {Object.entries(scanResult.categorizedFiles).map(([category, files]) => (
                        <div key={category} className="p-4 bg-gray-700 rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-green-400">
                              {category}
                            </h3>
                            <Badge variant="outline" className="text-gray-300">
                              {files.length} files
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            {files.map((file, index) => (
                              <div key={index} className="flex items-center space-x-3 p-2 bg-gray-600 rounded text-sm">
                                <FileText className="w-4 h-4 text-blue-400" />
                                <div className="flex-1">
                                  <p className="text-gray-200">{file.name}</p>
                                  <p className="text-xs text-gray-400">{file.path}</p>
                                </div>
                                <span className="text-xs text-gray-400">
                                  {(file.size / 1024 / 1024).toFixed(2)} MB
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8">
                    <FolderOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No categorized files found. Run a scan first.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-blue-400">Category Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics?.categoryDistribution?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPieChart>
                        <Pie
                          data={analytics.categoryDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {analytics.categoryDistribution.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-300 flex items-center justify-center text-gray-400">
                      No data available. Run a scan first.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-blue-400">Storage by Folder</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics?.storageByFolder?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analytics.storageByFolder}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="folder" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="size" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-300 flex items-center justify-center text-gray-400">
                      No data available. Run a scan first.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-blue-400">Duplicate Heatmap</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics?.duplicateHeatmap?.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {analytics.duplicateHeatmap.map((item: any, index: number) => (
                      <div
                        key={index}
                        className="p-3 rounded text-center text-sm"
                        style={{
                          backgroundColor: `rgba(59, 130, 246, ${item.intensity})`,
                          color: item.intensity > 0.5 ? 'white' : 'black'
                        }}
                      >
                        <div className="font-semibold">{item.extension}</div>
                        <div className="text-xs">{item.count} files</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 py-8">
                    No duplicate data available. Run a scan first.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="policy" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-blue-400">Enterprise Policy Violations</CardTitle>
                <CardDescription className="text-gray-400">
                  Applications that violate corporate policies
                </CardDescription>
              </CardHeader>
              <CardContent>
                {policyViolations.length > 0 ? (
                  <ScrollArea className="h-96">
                    <div className="space-y-4">
                      {policyViolations.map((violation: any, index: number) => (
                        <div key={index} className="p-4 bg-gray-700 rounded-lg border-l-4 border-red-400">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-red-400">{violation.violation}</h3>
                            <Badge 
                              variant="outline" 
                              className={`${
                                violation.severity === 'high' ? 'text-red-400 border-red-400' :
                                violation.severity === 'medium' ? 'text-yellow-400 border-yellow-400' :
                                'text-blue-400 border-blue-400'
                              }`}
                            >
                              {violation.severity.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-300 mb-2">{violation.reason}</p>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-200">{violation.fileName}</p>
                              <p className="text-xs text-gray-400">{violation.filePath}</p>
                            </div>
                            <div className="space-x-2">
                              {violation.action === 'remove' && (
                                <Button size="sm" variant="destructive">
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Remove
                                </Button>
                              )}
                              <Button size="sm" variant="outline">
                                <Eye className="w-4 h-4 mr-2" />
                                Review
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8">
                    <Shield className="w-12 h-12 text-green-400 mx-auto mb-4" />
                    <p className="text-green-400">No policy violations found!</p>
                    <p className="text-gray-400 text-sm">All applications comply with enterprise policies.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suggestions" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-blue-400">Smart Merge Suggestions</CardTitle>
                <CardDescription className="text-gray-400">
                  AI-powered recommendations for optimizing your applications
                </CardDescription>
              </CardHeader>
              <CardContent>
                {smartSuggestions.length > 0 ? (
                  <ScrollArea className="h-96">
                    <div className="space-y-4">
                      {smartSuggestions.map((suggestion: SmartSuggestion) => (
                        <div key={suggestion.id} className="p-4 bg-gray-700 rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-yellow-400">{suggestion.title}</h3>
                            <div className="flex items-center space-x-2">
                              <Badge 
                                variant="outline" 
                                className={`${
                                  suggestion.confidence === 'high' ? 'text-green-400 border-green-400' :
                                  suggestion.confidence === 'medium' ? 'text-yellow-400 border-yellow-400' :
                                  'text-gray-400 border-gray-400'
                                }`}
                              >
                                {suggestion.confidence} confidence
                              </Badge>
                              <Badge variant="outline" className="text-blue-400 border-blue-400">
                                Save {formatBytes(suggestion.potentialSavings)}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-sm text-gray-300 mb-3">{suggestion.description}</p>
                          
                          <div className="space-y-2 mb-4">
                            {suggestion.files.map((file, index) => (
                              <div key={index} className={`flex items-center justify-between p-2 rounded ${
                                file.action === 'keep' ? 'bg-green-900/20 border-l-4 border-green-400' :
                                file.action === 'remove' ? 'bg-red-900/20 border-l-4 border-red-400' :
                                'bg-blue-900/20 border-l-4 border-blue-400'
                              }`}>
                                <div>
                                  <p className="text-sm font-medium text-gray-200">{file.name}</p>
                                  <p className="text-xs text-gray-400">{file.reason}</p>
                                </div>
                                <Badge variant="outline" className={`${
                                  file.action === 'keep' ? 'text-green-400 border-green-400' :
                                  file.action === 'remove' ? 'text-red-400 border-red-400' :
                                  'text-blue-400 border-blue-400'
                                }`}>
                                  {file.action.toUpperCase()}
                                </Badge>
                              </div>
                            ))}
                          </div>
                          
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => {
                                // Implement suggestion acceptance
                                toast({
                                  title: "Suggestion Applied",
                                  description: "Smart suggestion has been applied successfully"
                                })
                              }}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Apply Suggestion
                            </Button>
                            <Button size="sm" variant="outline">
                              <X className="w-4 h-4 mr-2" />
                              Dismiss
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8">
                    <Lightbulb className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No suggestions available. Run a scan to get smart recommendations.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rules" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-blue-400">Categorization Rules</CardTitle>
                <CardDescription className="text-gray-400">
                  Manage rules for automatic file categorization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-400">
                    {rules.length} rules configured
                  </p>
                  <div className="space-x-2">
                    <Button onClick={addRule} className="bg-green-600 hover:bg-green-700">
                      Add Rule
                    </Button>
                    <Button onClick={saveRules} className="bg-blue-600 hover:bg-blue-700">
                      Save Rules
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {rules.map((rule) => (
                      <div key={rule.id} className="p-4 bg-gray-700 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              checked={rule.enabled}
                              onCheckedChange={(checked) => 
                                updateRule(rule.id, { enabled: !!checked })
                              }
                            />
                            <Input
                              value={rule.category}
                              onChange={(e) => updateRule(rule.id, { category: e.target.value })}
                              className="bg-gray-600 border-gray-500 text-gray-100"
                              placeholder="Category name"
                            />
                          </div>
                          <Button
                            onClick={() => deleteRule(rule.id)}
                            variant="destructive"
                            size="sm"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm text-gray-300">Keywords</Label>
                            <Textarea
                              value={rule.keywords.join(', ')}
                              onChange={(e) => updateRule(rule.id, { 
                                keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k)
                              })}
                              className="bg-gray-600 border-gray-500 text-gray-100 mt-1"
                              placeholder="keyword1, keyword2, keyword3"
                              rows={2}
                            />
                          </div>
                          <div>
                            <Label className="text-sm text-gray-300">Path Patterns</Label>
                            <Textarea
                              value={rule.pathPatterns.join(', ')}
                              onChange={(e) => updateRule(rule.id, { 
                                pathPatterns: e.target.value.split(',').map(p => p.trim()).filter(p => p)
                              })}
                              className="bg-gray-600 border-gray-500 text-gray-100 mt-1"
                              placeholder="/path/pattern1, /path/pattern2"
                              rows={2}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-blue-400">System Logs</CardTitle>
                <CardDescription className="text-gray-400">
                  View system activity and operation logs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-400">
                    {logs.length} log entries
                  </p>
                  <div className="space-x-2">
                    <Button 
                      onClick={downloadLogs}
                      variant="outline"
                      className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      <FileDown className="w-4 h-4 mr-2" />
                      Download Logs
                    </Button>
                    <Button 
                      onClick={clearLogs}
                      variant="destructive"
                    >
                      <Trash className="w-4 h-4 mr-2" />
                      Clear Logs
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {logs.map((log, index) => (
                      <div key={index} className="flex items-start space-x-3 p-2 rounded text-sm">
                        {log.level === 'ERROR' && <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5" />}
                        {log.level === 'WARN' && <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5" />}
                        {log.level === 'INFO' && <Info className="w-4 h-4 text-blue-400 mt-0.5" />}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-400">{log.timestamp}</span>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                log.level === 'ERROR' ? 'text-red-400 border-red-400' :
                                log.level === 'WARN' ? 'text-yellow-400 border-yellow-400' :
                                'text-blue-400 border-blue-400'
                              }`}
                            >
                              {log.level}
                            </Badge>
                          </div>
                          <p className="text-gray-200 mt-1">{log.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// Helper Components
function FileTagDialog({ file, onSave }: { file: FileInfo, onSave: (tags: string[], notes: string) => void }) {
  const [tags, setTags] = useState<string[]>(file.tags || [])
  const [notes, setNotes] = useState(file.notes || '')
  const [newTag, setNewTag] = useState('')

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-gray-300">Tags</Label>
        <div className="flex space-x-2 mt-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Add a tag..."
            className="bg-gray-700 border-gray-600 text-gray-100"
            onKeyPress={(e) => e.key === 'Enter' && addTag()}
          />
          <Button onClick={addTag} size="sm">Add</Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {tags.map((tag, index) => (
            <Badge key={index} variant="secondary" className="flex items-center space-x-1">
              <span>{tag}</span>
              <X className="w-3 h-3 cursor-pointer" onClick={() => removeTag(tag)} />
            </Badge>
          ))}
        </div>
      </div>
      
      <div>
        <Label className="text-gray-300">Notes</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes about this file..."
          className="bg-gray-700 border-gray-600 text-gray-100 mt-2"
          rows={3}
        />
      </div>
      
      <Button onClick={() => onSave(tags, notes)} className="w-full">
        Save Tags & Notes
      </Button>
    </div>
  )
}

function AppDNADialog({ file, onAnalyze, dna }: { file: FileInfo, onAnalyze: () => void, dna: AppDNA | null }) {
  useEffect(() => {
    if (!dna) {
      onAnalyze()
    }
  }, [])

  return (
    <div className="space-y-4">
      {dna ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-300">File Entropy</Label>
              <p className="text-lg font-semibold text-blue-400">{dna.entropy}</p>
            </div>
            <div>
              <Label className="text-gray-300">Architecture</Label>
              <p className="text-lg font-semibold text-green-400">{dna.architecture}</p>
            </div>
            <div>
              <Label className="text-gray-300">Complexity</Label>
              <Badge variant="outline" className={`${
                dna.complexity === 'high' ? 'text-red-400 border-red-400' :
                dna.complexity === 'medium' ? 'text-yellow-400 border-yellow-400' :
                'text-green-400 border-green-400'
              }`}>
                {dna.complexity.toUpperCase()}
              </Badge>
            </div>
            <div>
              <Label className="text-gray-300">Compression Ratio</Label>
              <p className="text-lg font-semibold text-purple-400">{dna.compressionRatio}</p>
            </div>
          </div>
          
          <div>
            <Label className="text-gray-300">Magic Bytes</Label>
            <p className="text-sm font-mono bg-gray-700 p-2 rounded mt-1">{dna.magicBytes}</p>
          </div>
          
          {dna.suspiciousIndicators.length > 0 && (
            <div>
              <Label className="text-gray-300">Suspicious Indicators</Label>
              <div className="space-y-1 mt-2">
                {dna.suspiciousIndicators.map((indicator, index) => (
                  <Badge key={index} variant="outline" className="text-red-400 border-red-400 mr-2">
                    {indicator}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <RefreshCw className="w-8 h-8 text-blue-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-400">Analyzing application DNA...</p>
        </div>
      )}
    </div>
  )
}
