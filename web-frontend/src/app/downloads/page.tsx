'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Download, FileText, Calendar, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { MainLayout } from '@/components/layout/main-layout'
import { config } from '@/lib/config'
import { useApiCallDeduplication } from '@/hooks/useDebounce'

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
  dataCount?: number
  uniqueLinks?: number
  uniqueUid?: string
}

type OrgStats = {
  organization: string;
  summary_stats: {
    total_cases: number;
    link_count: number;
    min_date: string | null;
    max_date: string | null;
  };
  detail_stats: {
    total_cases: number;
    link_count: number;
    min_date: string | null;
    max_date: string | null;
  };
}

export default function DownloadsPage() {
  const [downloads, setDownloads] = useState<DownloadItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({})
  const [orgs, setOrgs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<OrgStats[]>([])
  const [uplinkInfo, setUplinkInfo] = useState<any>(null)

  // Load organizations
  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch(`${config.backendUrl}/api/v1/attachments/organizations`)
        if (resp.ok) {
          const data: string[] = await resp.json()
          setOrgs(data || [])
        }
      } catch {
        /* noop */
      }
    })()
  }, [])

  const loadUplinkInfoInternal = async () => {
    try {
      const resp = await fetch(`${config.backendUrl}/api/v1/uplink/info`)
      if (resp.ok) {
        const data = await resp.json()
        setUplinkInfo(data)
      }
    } catch {
      // ignore
    }
  }

  // Load per-organization stats
  const reloadStatsInternal = async () => {
    if (!orgs.length) return
    setLoading(true)
    try {
      const results: OrgStats[] = []
      for (const org of orgs) {
        try {
          const resp = await fetch(`${config.backendUrl}/api/v1/stats/${encodeURIComponent(org)}`)
          if (resp.ok) {
            const data = await resp.json()
            results.push(data as OrgStats)
          }
        } catch {
          // ignore a single org failure
        }
      }
      setStats(results)
    } finally {
      setLoading(false)
    }
  }

  // 使用防重复调用的hook
  const loadUplinkInfo = useApiCallDeduplication(loadUplinkInfoInternal, 'loadUplinkInfo', 2000)
  const reloadStats = useApiCallDeduplication(reloadStatsInternal, 'reloadStats', 2000)

  useEffect(() => {
    // initial load when orgs list arrives
    if (orgs.length) reloadStats()
    loadUplinkInfo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgs.length]) // 只依赖orgs的长度，避免数组引用变化导致的重复调用

  // Calculate aggregated statistics from real data
  const agg = useMemo(() => {
    // Use uplink info data as primary source, fallback to org stats aggregation
    if (uplinkInfo) {
      return {
        sumCount: uplinkInfo.sum?.total_cases || 0,
        dtlCount: uplinkInfo.dtl?.total_cases || 0,
        sumUnique: uplinkInfo.sum?.link_count || 0,
        dtlUnique: uplinkInfo.dtl?.link_count || 0,
        sumMin: uplinkInfo.sum?.min_date || null,
        sumMax: uplinkInfo.sum?.max_date || null,
        dtlMin: uplinkInfo.dtl?.min_date || null,
        dtlMax: uplinkInfo.dtl?.max_date || null,
      }
    }

    // Fallback: Aggregate counts and date ranges across orgs
    const sumCount = stats.reduce((acc, s) => acc + (s.summary_stats?.total_cases || 0), 0)
    const dtlCount = stats.reduce((acc, s) => acc + (s.detail_stats?.total_cases || 0), 0)
    const sumUnique = stats.reduce((acc, s) => acc + (s.summary_stats?.link_count || 0), 0)
    const dtlUnique = stats.reduce((acc, s) => acc + (s.detail_stats?.link_count || 0), 0)

    const sumDates = stats
      .map(s => ({ min: s.summary_stats?.min_date, max: s.summary_stats?.max_date }))
      .filter(x => x.min && x.max) as { min: string; max: string }[]
    const dtlDates = stats
      .map(s => ({ min: s.detail_stats?.min_date, max: s.detail_stats?.max_date }))
      .filter(x => x.min && x.max) as { min: string; max: string }[]

    const min = (dates: { min: string; max: string }[]) =>
      dates.length ? dates.map(d => d.min).sort()[0] : null
    const max = (dates: { min: string; max: string }[]) =>
      dates.length ? dates.map(d => d.max).sort().slice(-1)[0] : null

    return {
      sumCount,
      dtlCount,
      sumUnique,
      dtlUnique,
      sumMin: min(sumDates),
      sumMax: max(sumDates),
      dtlMin: min(dtlDates),
      dtlMax: max(dtlDates),
    }
  }, [uplinkInfo, stats])

  // Generate download items based on real data
  const pbocDownloads: DownloadItem[] = useMemo(() => [
    {
      id: '1',
      filename: 'PBOC完整数据集',
      orgName: '全国',
      caseTitle: 'PBOC详细数据、汇总数据、分类数据',
      datasets: ['pbocdtl', 'pbocsum', 'pboccat'],
      fileSize: '预估 50-100 MB',
      uploadDate: new Date().toISOString().slice(0, 10),
      status: 'available',
      dataCount: agg.dtlCount + agg.sumCount + (uplinkInfo?.cat?.total_cases || 0),
      uniqueLinks: agg.dtlUnique + agg.sumUnique + (uplinkInfo?.cat?.link_count || 0),
      uniqueUid: `FULL-${uplinkInfo?.dtl?.uid_count || 0}-${uplinkInfo?.cat?.uid_count || 0}`
    },
    {
      id: '2',
      filename: 'PBOC详细数据',
      orgName: '全国',
      caseTitle: 'PBOC详细案例数据',
      datasets: ['pbocdtl'],
      fileSize: '预估 30-60 MB',
      uploadDate: new Date().toISOString().slice(0, 10),
      status: 'available',
      dataCount: agg.dtlCount,
      uniqueLinks: agg.dtlUnique,
      uniqueUid: `DTL-${uplinkInfo?.dtl?.uid_count || 0}`
    },
    {
      id: '3',
      filename: 'PBOC汇总数据',
      orgName: '全国',
      caseTitle: 'PBOC汇总统计数据',
      datasets: ['pbocsum'],
      fileSize: '预估 10-20 MB',
      uploadDate: new Date().toISOString().slice(0, 10),
      status: 'available',
      dataCount: agg.sumCount,
      uniqueLinks: agg.sumUnique,
      uniqueUid: `SUM-${agg.sumCount}`
    },
    {
      id: '4',
      filename: 'PBOC分类数据',
      orgName: '全国',
      caseTitle: 'PBOC分类与金额数据',
      datasets: ['pboccat'],
      fileSize: '预估 5-15 MB',
      uploadDate: new Date().toISOString().slice(0, 10),
      status: 'available',
      dataCount: uplinkInfo?.cat?.total_cases || 0,
      uniqueLinks: uplinkInfo?.cat?.link_count || 0,
      uniqueUid: `CAT-${uplinkInfo?.cat?.uid_count || 0}`
    }
  ], [agg, uplinkInfo])

  useEffect(() => {
    // Initialize with real PBOC download options
    setDownloads(pbocDownloads)
  }, [pbocDownloads])

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

  // No need for complex calculations since we display data by type

  // No need for org filtering since all data is national scope

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">案例下载</h1>
            <p className="text-muted-foreground mt-2">
              下载和管理案例相关文档和附件（数据与案例上线保持同步）
            </p>
          </div>
          <Button variant="outline" onClick={reloadStats} className="flex items-center gap-2">
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} 刷新
          </Button>
        </div>



        {/* Downloads List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              可下载文件 ({downloads.length})
            </CardTitle>
            <CardDescription>
              点击下载按钮开始下载文件
            </CardDescription>
          </CardHeader>
          <CardContent>
            {downloads.length === 0 ? (
              <Alert>
                <AlertDescription>
                  没有找到匹配的下载文件。请尝试调整搜索条件。
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {downloads.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{item.filename}</h3>
                          {getStatusBadge(item.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{item.caseTitle}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {item.uploadDate}
                          </span>
                          <span>{item.fileSize}</span>
                          <span className="text-blue-600">数据集: {item.datasets.join(', ')}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="text-purple-600">数据量: {item.dataCount?.toLocaleString() || 'N/A'}</span>
                          <span className="text-orange-600">唯一链接: {item.uniqueLinks?.toLocaleString() || 'N/A'}</span>
                          <span className="text-green-600">UID: {item.uniqueUid || 'N/A'}</span>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleDownload(item)}
                        disabled={item.status === 'downloading'}
                        size="sm"
                        className="ml-4 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600 dark:text-white border-0 shadow-md"
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

        {/* Compact Data Statistics and Download Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>数据统计与下载</span>
              <Button
                onClick={() => {
                  // Download all available files
                  downloads.forEach(item => {
                    if (item.status === 'available') {
                      handleDownload(item)
                    }
                  })
                }}
                disabled={downloads.filter(d => d.status === 'available').length === 0}
                className="ml-4 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600 dark:text-white border-0 shadow-md"
              >
                <Download className="h-4 w-4 mr-2" />
                批量下载
              </Button>
            </CardTitle>
            <CardDescription>数据统计信息和下载操作</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
              {/* Summary Data */}
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-lg font-bold text-blue-600">
                  {agg.sumCount.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">列表数据</p>
              </div>
              
              {/* Detail Data */}
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-lg font-bold text-purple-600">
                  {agg.dtlCount.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">详情数据</p>
              </div>
              
              {/* Category Data */}
              <div className="text-center p-3 bg-emerald-50 rounded-lg">
                <div className="text-lg font-bold text-emerald-600">
                  {(uplinkInfo?.cat?.total_cases || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">分类数据</p>
              </div>
              
              {/* Total Files */}
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-bold text-gray-600">
                  {downloads.length}
                </div>
                <p className="text-xs text-muted-foreground">总文件数</p>
              </div>
              
              {/* Downloaded */}
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-lg font-bold text-green-600">
                  {downloads.filter(d => d.status === 'completed').length}
                </div>
                <p className="text-xs text-muted-foreground">已下载</p>
              </div>
              
              {/* Downloading */}
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-lg font-bold text-orange-600">
                  {downloads.filter(d => d.status === 'downloading').length}
                </div>
                <p className="text-xs text-muted-foreground">下载中</p>
              </div>
            </div>
            
            {/* Date Range Summary by Data Type */}
            <div className="grid grid-cols-2 gap-4">
              {/* PBOCSUM Date Range */}
              <div className="text-center p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                <div className="text-xs font-medium text-gray-600 mb-1">PBOCSUM 日期范围</div>
                <div className="text-sm font-bold text-gray-800">
                  {(() => {
                    const sumDates = []
                    if (agg.sumMin) sumDates.push(agg.sumMin)
                    if (agg.sumMax) sumDates.push(agg.sumMax)
                    if (uplinkInfo?.sum?.min_date) sumDates.push(uplinkInfo.sum.min_date)
                    if (uplinkInfo?.sum?.max_date) sumDates.push(uplinkInfo.sum.max_date)
                    
                    if (sumDates.length === 0) return '待更新'
                    
                    const sortedDates = sumDates.sort()
                    const minDate = sortedDates[0]
                    const maxDate = sortedDates[sortedDates.length - 1]
                    
                    return minDate === maxDate ? minDate : `${minDate} 至 ${maxDate}`
                  })()
                  }
                </div>
              </div>
              
              {/* PBOCDTL Date Range - Based on linked PBOCSUM dates */}
              <div className="text-center p-3 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg">
                <div className="text-xs font-medium text-gray-600 mb-1">PBOCDTL 日期范围</div>
                <div className="text-sm font-bold text-gray-800">
                  {(() => {
                    // PBOCDTL dates should come from linked PBOCSUM data, not direct dtl dates
                    // Use the same PBOCSUM dates since dtl data is linked to sum data by link field
                    const dtlLinkedDates = []
                    if (agg.sumMin) dtlLinkedDates.push(agg.sumMin)
                    if (agg.sumMax) dtlLinkedDates.push(agg.sumMax)
                    if (uplinkInfo?.sum?.min_date) dtlLinkedDates.push(uplinkInfo.sum.min_date)
                    if (uplinkInfo?.sum?.max_date) dtlLinkedDates.push(uplinkInfo.sum.max_date)
                    
                    if (dtlLinkedDates.length === 0) return '待更新'
                    
                    const sortedDates = dtlLinkedDates.sort()
                    const minDate = sortedDates[0]
                    const maxDate = sortedDates[sortedDates.length - 1]
                    
                    return minDate === maxDate ? minDate : `${minDate} 至 ${maxDate}`
                  })()
                  }
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}