'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Download, FileText, Search, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { MainLayout } from '@/components/layout/main-layout'
import { config } from '@/lib/config'

interface DownloadItem {
  id: string
  filename: string
  orgName: string
  caseTitle: string
  datasets: string[]
  fileSize: string
  uploadDate: string
  status: 'available' | 'downloading' | 'completed' | 'failed'
  progress?: number
}

export default function DownloadsPage() {
  const [downloads, setDownloads] = useState<DownloadItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOrg, setSelectedOrg] = useState('')
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({})

  // Real PBOC data download options
  const pbocDownloads: DownloadItem[] = [
    {
      id: '1',
      filename: 'PBOC完整数据集',
      orgName: '全国',
      caseTitle: 'PBOC详细数据、汇总数据、分类数据',
      datasets: ['pbocdtl', 'pbocsum', 'pboccat'],
      fileSize: '预估 50-100 MB',
      uploadDate: new Date().toISOString().slice(0, 10),
      status: 'available'
    },
    {
      id: '2',
      filename: 'PBOC详细数据',
      orgName: '全国',
      caseTitle: 'PBOC详细案例数据',
      datasets: ['pbocdtl'],
      fileSize: '预估 30-60 MB',
      uploadDate: new Date().toISOString().slice(0, 10),
      status: 'available'
    },
    {
      id: '3',
      filename: 'PBOC汇总数据',
      orgName: '全国',
      caseTitle: 'PBOC汇总统计数据',
      datasets: ['pbocsum'],
      fileSize: '预估 10-20 MB',
      uploadDate: new Date().toISOString().slice(0, 10),
      status: 'available'
    },
    {
      id: '4',
      filename: 'PBOC分类数据',
      orgName: '全国',
      caseTitle: 'PBOC案例分类数据',
      datasets: ['pboccat'],
      fileSize: '预估 5-10 MB',
      uploadDate: new Date().toISOString().slice(0, 10),
      status: 'available'
    }
  ]

  useEffect(() => {
    // Initialize with real PBOC download options
    setDownloads(pbocDownloads)
  }, [])

  const handleDownload = async (item: DownloadItem) => {
    if (!item.datasets.length) return
    
    try {
      setDownloads(prev => prev.map(d => 
        d.id === item.id ? { ...d, status: 'downloading', progress: 0 } : d
      ))
      
      toast.info(`开始下载 ${item.filename}...`)
      
      // Call real PBOC export API
      const params = new URLSearchParams()
      params.set('datasets', item.datasets.join(','))
      const url = `${config.backendUrl}/api/v1/downloads/pboc-export?${params.toString()}`
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`下载失败: ${response.status} ${response.statusText}`)
      }
      
      // Update progress to show download in progress
      setDownloads(prev => prev.map(d => 
        d.id === item.id ? { ...d, progress: 50 } : d
      ))
      
      const blob = await response.blob()
      
      // Create download link
      const downloadUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `pboc_export_${item.datasets.join('_')}_${new Date().toISOString().slice(0, 10)}.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(downloadUrl)
      
      // Update status to completed
      setDownloads(prev => prev.map(d => 
        d.id === item.id ? { ...d, status: 'completed', progress: 100 } : d
      ))
      
      toast.success(`${item.filename} 下载完成`)
      
    } catch (error) {
      console.error('Download failed:', error)
      setDownloads(prev => prev.map(d => 
        d.id === item.id ? { ...d, status: 'failed', progress: 0 } : d
      ))
      toast.error(`${item.filename} 下载失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  const filteredDownloads = downloads.filter(item => {
    const matchesSearch = item.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const getStatusBadge = (status: DownloadItem['status']) => {
    switch (status) {
      case 'available':
        return <Badge variant="secondary">可下载</Badge>
      case 'downloading':
        return <Badge variant="default">下载中</Badge>
      case 'completed':
        return <Badge variant="default" className="bg-green-500">已完成</Badge>
      case 'failed':
        return <Badge variant="destructive">失败</Badge>
      default:
        return <Badge variant="secondary">未知</Badge>
    }
  }

  // No need for org filtering since all data is national scope

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">案例下载</h1>
            <p className="text-muted-foreground mt-2">
              下载和管理案例相关文档和附件
            </p>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              搜索和筛选
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search">搜索数据集</Label>
              <Input
                id="search"
                placeholder="输入关键词搜索数据集..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Downloads List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              可下载文件 ({filteredDownloads.length})
            </CardTitle>
            <CardDescription>
              点击下载按钮开始下载文件
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredDownloads.length === 0 ? (
              <Alert>
                <AlertDescription>
                  没有找到匹配的下载文件。请尝试调整搜索条件。
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {filteredDownloads.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{item.filename}</h3>
                          {getStatusBadge(item.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {item.uploadDate}
                          </span>
                          <span>{item.fileSize}</span>
                          <span className="text-blue-600">数据集: {item.datasets.join(', ')}</span>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleDownload(item)}
                        disabled={item.status === 'downloading'}
                        size="sm"
                        className="ml-4"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {item.status === 'downloading' ? '下载中...' : 
                         item.status === 'completed' ? '重新下载' : '下载'}
                      </Button>
                    </div>
                    
                    {item.status === 'downloading' && item.progress !== undefined && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>下载进度</span>
                          <span>{Math.round(item.progress)}%</span>
                        </div>
                        <Progress value={item.progress} className="h-2" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Download Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{downloads.length}</div>
              <p className="text-xs text-muted-foreground">总文件数</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {downloads.filter(d => d.status === 'completed').length}
              </div>
              <p className="text-xs text-muted-foreground">已下载</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {downloads.filter(d => d.status === 'downloading').length}
              </div>
              <p className="text-xs text-muted-foreground">下载中</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">
                {downloads.filter(d => d.status === 'failed').length}
              </div>
              <p className="text-xs text-muted-foreground">下载失败</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}