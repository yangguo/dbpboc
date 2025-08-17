'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { RefreshCw, Download, FileText, Building2 } from 'lucide-react'
import { toast } from 'sonner'
import { MainLayout } from '@/components/layout/main-layout'
import { useProgressStream } from '@/lib/hooks/use-progress-stream'
import { ProgressTracker } from '@/components/ui/progress-tracker'

// 城市列表 - 与后端 org2url 顺序保持一致
const cityList = [
  '天津', '重庆', '上海', '兰州', '拉萨', '西宁', '乌鲁木齐', '南宁',
  '贵阳', '福州', '成都', '呼和浩特', '郑州', '北京', '合肥', '厦门',
  '海口', '大连', '广州', '太原', '石家庄', '总部', '昆明', '青岛', '沈阳',
  '长沙', '深圳', '武汉', '银川', '西安', '哈尔滨', '长春', '宁波',
  '杭州', '南京', '济南', '南昌'
]

interface UpdateStatus {
  orgName: string
  status: 'pending' | 'updating' | 'completed' | 'error'
  progress: number
  message: string
  newCases: number
}

interface OrgStats {
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

export default function UpdatePage() {
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([])
  const [showPendingOnly, setShowPendingOnly] = useState(false)
  const [startPage, setStartPage] = useState(1)
  const [endPage, setEndPage] = useState(1)
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateStatuses, setUpdateStatuses] = useState<UpdateStatus[]>([])
  const [pendingOrgs, setPendingOrgs] = useState<string[]>([])
  const [orgStats, setOrgStats] = useState<Record<string, OrgStats>>({});
  
  // Add progress stream for details update
  const { state: detailsProgressState, startStream: startDetailsStream, stopStream: stopDetailsStream, resetState: resetDetailsState } = useProgressStream()

  // 获取待更新机构列表
  const fetchPendingOrgs = async () => {
    try {
      const response = await fetch('/api/cases/pending-orgs')
      if (response.ok) {
        const data = await response.json()
        setPendingOrgs(data.orgs || [])
      }
    } catch (error) {
      console.error('获取待更新机构失败:', error)
    }
  }

  useEffect(() => {
    fetchPendingOrgs()
  }, [])

  useEffect(() => {
    const fetchOrgStats = async (orgName: string) => {
      try {
        const response = await fetch(`/api/v1/stats/${orgName}`);
        if (response.ok) {
          const data = await response.json();
          setOrgStats(prev => ({ ...prev, [orgName]: data }));
        }
      } catch (error) {
        console.error(`获取机构 ${orgName} 统计失败:`, error);
      }
    };

    selectedOrgs.forEach(org => {
      if (!orgStats[org]) {
        fetchOrgStats(org);
      }
    });
  }, [selectedOrgs, orgStats]);

  // 处理机构选择
  const handleOrgSelection = (org: string, checked: boolean) => {
    if (checked) {
      setSelectedOrgs(prev => [...prev, org])
    } else {
      setSelectedOrgs(prev => prev.filter(o => o !== org))
    }
  }

  // 选择所有机构
  const selectAllOrgs = () => {
    const orgsToSelect = showPendingOnly ? pendingOrgs : cityList
    setSelectedOrgs(orgsToSelect)
  }

  // 清除所有选择
  const clearAllOrgs = () => {
    setSelectedOrgs([])
  }

  // 更新案例列表
  const updateCaseList = async () => {
    if (selectedOrgs.length === 0) {
      toast.error('请选择至少一个机构')
      return
    }

    setIsUpdating(true)
    setUpdateStatuses(selectedOrgs.map(org => ({
      orgName: org,
      status: 'pending',
      progress: 0,
      message: '等待开始...',
      newCases: 0
    })))

    try {
      for (let i = 0; i < selectedOrgs.length; i++) {
        const orgName = selectedOrgs[i]

        setUpdateStatuses(prev => prev.map(status => 
          status.orgName === orgName 
            ? { ...status, status: 'updating', message: '正在获取案例列表...', progress: 10 }
            : status
        ))

        let totalNew = 0
        let currentPage = startPage
        const totalPages = endPage - startPage + 1
        let processedPages = 0

        while (currentPage <= endPage) {
          try {
            const response = await fetch('/api/cases/update-list', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orgName, startPage: currentPage, endPage: currentPage })
            })

            if (!response.ok) throw new Error('更新失败')

            const data = await response.json()
            totalNew += Number(data?.newCases || 0)
            processedPages += 1

            const progress = Math.min(90, 10 + (processedPages / totalPages) * 80)
            setUpdateStatuses(prev => prev.map(status => 
              status.orgName === orgName 
                ? { 
                    ...status, 
                    status: 'updating', 
                    progress: progress,
                    message: `正在处理第 ${currentPage} 页，已获取 ${totalNew} 条新案例...`
                  }
                : status
            ))

            // 移动到下一页
            currentPage += 1
          } catch (err) {
            setUpdateStatuses(prev => prev.map(status => 
              status.orgName === orgName 
                ? { ...status, status: 'error', progress: 0, message: '更新失败', newCases: totalNew }
                : status
            ))
            break
          }
        }

        // 完成当前机构
        setUpdateStatuses(prev => prev.map(status => 
          status.orgName === orgName 
            ? { 
                ...status, 
                status: 'completed', 
                progress: 100,
                message: `更新完成，共获取 ${totalNew} 条新案例`,
                newCases: totalNew
              }
            : status
        ))
      }

      toast.success('案例列表更新完成')
    } finally {
      setIsUpdating(false)
    }
  }

  // 更新案例详情 - 使用新的进度跟踪
  const updateCaseDetails = async () => {
    if (selectedOrgs.length === 0) {
      toast.error('请选择至少一个机构')
      return
    }

    if (selectedOrgs.length === 1) {
      // For single org, use the progress stream
      try {
        await startDetailsStream(selectedOrgs[0], []) // Empty array means update all pending
      } catch (error) {
        console.error('Update failed:', error)
        toast.error('案例详情更新失败')
      }
      return
    }

    // For multiple orgs, use the original batch method
    setIsUpdating(true)
    setUpdateStatuses(selectedOrgs.map(org => ({
      orgName: org,
      status: 'pending',
      progress: 0,
      message: '等待开始...',
      newCases: 0
    })))

    try {
      for (let i = 0; i < selectedOrgs.length; i++) {
        const orgName = selectedOrgs[i]
        
        setUpdateStatuses(prev => prev.map(status => 
          status.orgName === orgName 
            ? { ...status, status: 'updating', message: '正在更新案例详情...' }
            : status
        ))

        try {
          const response = await fetch('/api/cases/update-details', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ orgName })
          })

          if (response.ok) {
            const data = await response.json()
            setUpdateStatuses(prev => prev.map(status => 
              status.orgName === orgName 
                ? { 
                    ...status, 
                    status: 'completed', 
                    progress: 100,
                    message: `详情更新完成，处理 ${data.updatedCases} 条案例`,
                    newCases: data.updatedCases
                  }
                : status
            ))
          } else {
            throw new Error('更新失败')
          }
        } catch (error) {
          setUpdateStatuses(prev => prev.map(status => 
            status.orgName === orgName 
              ? { 
                  ...status, 
                  status: 'error', 
                  progress: 0,
                  message: '更新失败',
                  newCases: 0
                }
              : status
          ))
        }
      }
      
      toast.success('案例详情更新完成')
    } finally {
      setIsUpdating(false)
    }
  }

  // Handle details progress completion
  useEffect(() => {
    if (detailsProgressState.progress === 100 && !detailsProgressState.error && detailsProgressState.orgName) {
      toast.success('案例详情更新完成')
    } else if (detailsProgressState.error) {
      toast.error('案例详情更新失败')
    }
  }, [detailsProgressState.progress, detailsProgressState.error, detailsProgressState.orgName])

  // 刷新页面
  const refreshPage = () => {
    setSelectedOrgs([])
    setUpdateStatuses([])
    setStartPage(1)
    setEndPage(1)
    setShowPendingOnly(false)
    resetDetailsState() // Reset details progress state
    fetchPendingOrgs()
    toast.success('页面已刷新')
  }

  const displayOrgs = showPendingOnly ? pendingOrgs : cityList

  return (
    <MainLayout>
      <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl gradient-info animate-float">
              <RefreshCw className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                案例更新
              </h1>
              <p className="text-muted-foreground text-lg">
                更新各机构的案例列表和详细信息
              </p>
            </div>
          </div>
        </div>
        <Button
          onClick={refreshPage}
          className="flex items-center gap-2 gradient-success text-white border-0 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
        >
          <RefreshCw className="h-4 w-4" />
          刷新页面
        </Button>
      </div>

      <div className="space-y-6">
        {/* Top control panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 机构选择 */}
          <Card className="glass-card border-0 shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
            <CardHeader className="relative z-10">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg gradient-primary">
                  <Building2 className="h-4 w-4 text-white" />
                </div>
                机构选择
              </CardTitle>
              <CardDescription>
                选择需要更新的机构
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 relative z-10">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="pending-only"
                  checked={showPendingOnly}
                  onCheckedChange={(checked) => {
                    setShowPendingOnly(checked as boolean)
                    setSelectedOrgs([])
                  }}
                />
                <Label htmlFor="pending-only">仅显示待更新机构</Label>
              </div>
              
              {showPendingOnly && pendingOrgs.length > 0 && (
                <Alert>
                  <AlertDescription>
                    待更新机构: {pendingOrgs.join(', ')}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={selectAllOrgs}
                  className="flex-1 gradient-primary text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
                >
                  全选
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllOrgs}
                  className="flex-1 bg-gradient-to-r from-red-500/10 to-red-600/10 hover:from-red-500/20 hover:to-red-600/20 border-red-300 dark:border-red-600 text-red-700 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium transition-all duration-200"
                >
                  取消全选
                </Button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2">
                {displayOrgs.map((org) => (
                  <div key={org}>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={org}
                        checked={selectedOrgs.includes(org)}
                        onCheckedChange={(checked) => handleOrgSelection(org, checked as boolean)}
                      />
                      <Label htmlFor={org} className="text-sm font-medium">{org}</Label>
                    </div>
                    {selectedOrgs.includes(org) && orgStats[org] && (
                      <div className="ml-6 text-xs text-muted-foreground space-y-1 mt-1">
                        <p>列表: {orgStats[org].summary_stats.total_cases} | 链接: {orgStats[org].summary_stats.link_count}</p>
                        <p>列表日期: {orgStats[org].summary_stats.min_date} ~ {orgStats[org].summary_stats.max_date}</p>
                        <p>详情: {orgStats[org].detail_stats.total_cases} | 链接: {orgStats[org].detail_stats.link_count}</p>
                        <p>详情日期: {orgStats[org].detail_stats.min_date} ~ {orgStats[org].detail_stats.max_date}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {selectedOrgs.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">
                    已选择 {selectedOrgs.length} 个机构
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 页面范围设置 */}
          <Card className="glass-card border-0 shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-blue-500/5" />
            <CardHeader className="relative z-10">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg gradient-success">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                页面范围
              </CardTitle>
              <CardDescription>
                设置爬取的页面范围
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 relative z-10">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-page">起始页</Label>
                  <Input
                    id="start-page"
                    type="number"
                    min={1}
                    value={startPage}
                    onChange={(e) => setStartPage(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-page">结束页</Label>
                  <Input
                    id="end-page"
                    type="number"
                    min={1}
                    value={endPage}
                    onChange={(e) => setEndPage(parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 操作按钮 */}
          <Card className="glass-card border-0 shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5" />
            <CardHeader className="relative z-10">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg gradient-accent">
                  <RefreshCw className="h-4 w-4 text-white" />
                </div>
                操作
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 relative z-10">
              <Button
                onClick={updateCaseList}
                disabled={isUpdating || selectedOrgs.length === 0}
                className="w-full gradient-primary text-white border-0 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <Download className="h-4 w-4 mr-2" />
                更新案例列表
              </Button>
              <Button
                onClick={updateCaseDetails}
                disabled={isUpdating || detailsProgressState.isActive || selectedOrgs.length === 0}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:from-gray-400 disabled:to-gray-500"
              >
                <FileText className="h-4 w-4 mr-2" />
                更新案例详情
              </Button>
              <Button
                onClick={() => window.location.href = '/update/pending'}
                className="w-full gradient-accent text-white border-0 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                <FileText className="h-4 w-4 mr-2" />
                选择性更新详情
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 详情更新进度跟踪 */}
        {(detailsProgressState.isActive || detailsProgressState.progress > 0 || detailsProgressState.error) && (
          <ProgressTracker
            state={detailsProgressState}
            onCancel={stopDetailsStream}
            onReset={resetDetailsState}
            showDetails={true}
          />
        )}

        {/* 更新状态 */}
        <div>
          <Card className="glass-card border-0 shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-red-500/5" />
            <CardHeader className="relative z-10">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg gradient-warning">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                更新状态
              </CardTitle>
              <CardDescription>
                实时显示各机构的更新进度
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              {updateStatuses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>选择机构并点击更新按钮开始</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {updateStatuses.map((status) => (
                    <div key={status.orgName} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{status.orgName}</h4>
                          <Badge
                            className={
                              status.status === 'completed' ? 'gradient-success text-white border-0 shadow-md' :
                              status.status === 'error' ? 'gradient-destructive text-white border-0 shadow-md' :
                              status.status === 'updating' ? 'gradient-info text-white border-0 shadow-md animate-pulse' : 
                              'bg-gradient-to-r from-gray-500 to-gray-600 text-white border-0 shadow-md'
                            }
                          >
                            {status.status === 'pending' && '等待中'}
                            {status.status === 'updating' && '更新中'}
                            {status.status === 'completed' && '已完成'}
                            {status.status === 'error' && '失败'}
                          </Badge>
                        </div>
                        {status.newCases > 0 && (
                          <span className="text-sm text-muted-foreground">
                            {status.newCases} 条
                          </span>
                        )}
                      </div>
                      <Progress value={status.progress} className="h-2" />
                      <p className="text-sm text-muted-foreground">{status.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </MainLayout>
  )
}
