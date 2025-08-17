'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RefreshCw, FileText, Building2, ExternalLink, Play } from 'lucide-react'
import { toast } from 'sonner'
import { MainLayout } from '@/components/layout/main-layout'
import { useProgressStream } from '@/lib/hooks/use-progress-stream'
import { ProgressTracker } from '@/components/ui/progress-tracker'

// 城市列表
const cityList = [
  '天津', '重庆', '上海', '兰州', '拉萨', '西宁', '乌鲁木齐', '南宁',
  '贵阳', '福州', '成都', '呼和浩特', '郑州', '北京', '合肥', '厦门',
  '海口', '大连', '广州', '太原', '石家庄', '总部', '昆明', '青岛', '沈阳',
  '长沙', '深圳', '武汉', '银川', '西安', '哈尔滨', '长春', '宁波',
  '杭州', '南京', '济南', '南昌'
]

interface PendingLinkDetail {
  link: string
  name: string
  date: string | null
}

interface PendingDetail {
  orgName: string
  pendingLinks: PendingLinkDetail[]
  count: number
}

export default function PendingDetailsPage() {
  const [selectedOrg, setSelectedOrg] = useState<string>('')
  const [pendingDetails, setPendingDetails] = useState<PendingDetail | null>(null)
  const [selectedLinks, setSelectedLinks] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  // Use the progress stream hook
  const { state: progressState, startStream, stopStream, resetState, retryStream } = useProgressStream()

  // 获取待更新详情链接
  const fetchPendingDetails = async (orgName: string) => {
    if (!orgName) return
    
    setIsLoading(true)
    try {
      const response = await fetch(`/api/v1/cases/pending-details/${orgName}`)
      if (response.ok) {
        const data = await response.json()
        setPendingDetails(data)
        setSelectedLinks([]) // Reset selection
      } else {
        toast.error('获取待更新详情失败')
        setPendingDetails(null)
      }
    } catch (error) {
      console.error('获取待更新详情失败:', error)
      toast.error('获取待更新详情失败')
      setPendingDetails(null)
    } finally {
      setIsLoading(false)
    }
  }

  // 处理机构选择
  const handleOrgChange = (orgName: string) => {
    setSelectedOrg(orgName)
    setPendingDetails(null)
    setSelectedLinks([])
    resetState() // Reset progress state
    if (orgName) {
      fetchPendingDetails(orgName)
    }
  }

  // 处理链接选择
  const handleLinkSelection = (link: string, checked: boolean) => {
    if (checked) {
      setSelectedLinks(prev => [...prev, link])
    } else {
      setSelectedLinks(prev => prev.filter(l => l !== link))
    }
  }

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (!pendingDetails) return
    
    const allLinks = pendingDetails.pendingLinks.map(item => item.link)
    if (selectedLinks.length === pendingDetails.pendingLinks.length) {
      setSelectedLinks([])
    } else {
      setSelectedLinks(allLinks)
    }
  }

  // 更新选中的详情
  const updateSelectedDetails = async () => {
    if (!selectedOrg || selectedLinks.length === 0) {
      toast.error('请选择要更新的链接')
      return
    }

    try {
      await startStream(selectedOrg, selectedLinks)
      
      // Show success toast when completed
      if (progressState.progress === 100 && !progressState.error) {
        toast.success('案例详情更新完成')
        // Refresh pending details list
        fetchPendingDetails(selectedOrg)
      }
    } catch (error) {
      console.error('Update failed:', error)
      toast.error('案例详情更新失败')
    }
  }

  // 重试更新
  const handleRetry = async () => {
    if (!selectedOrg) return
    
    try {
      // Use the same selected links for retry
      await startStream(selectedOrg, selectedLinks)
    } catch (error) {
      console.error('Retry failed:', error)
      toast.error('重试失败')
    }
  }

  // Handle progress completion
  useEffect(() => {
    if (progressState.progress === 100 && !progressState.error && progressState.orgName) {
      toast.success('案例详情更新完成')
      // Refresh pending details list
      fetchPendingDetails(selectedOrg)
    } else if (progressState.error) {
      toast.error('案例详情更新失败')
    }
  }, [progressState.progress, progressState.error, progressState.orgName, selectedOrg])

  // 刷新当前机构的待更新列表
  const refreshPendingDetails = () => {
    if (selectedOrg) {
      fetchPendingDetails(selectedOrg)
      resetState()
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">待更新详情</h1>
            <p className="text-muted-foreground mt-2">
              查看并选择性更新各机构的待处理案例详情链接
            </p>
          </div>
          <Button
            variant="outline"
            onClick={refreshPendingDetails}
            disabled={!selectedOrg}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            刷新列表
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 机构选择 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                选择机构
              </CardTitle>
              <CardDescription>
                选择要查看待更新详情的机构
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {cityList.map((org) => (
                  <div key={org} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id={org}
                      name="org"
                      value={org}
                      checked={selectedOrg === org}
                      onChange={(e) => handleOrgChange(e.target.value)}
                      className="w-4 h-4"
                    />
                    <Label htmlFor={org} className="text-sm font-medium cursor-pointer">
                      {org}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 待更新统计 */}
          <Card>
            <CardHeader>
              <CardTitle>待更新统计</CardTitle>
              <CardDescription>
                当前机构的待更新详情统计
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">加载中...</p>
                </div>
              ) : pendingDetails ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{pendingDetails.count}</div>
                    <div className="text-sm text-muted-foreground">待更新链接</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">{selectedLinks.length}</div>
                    <div className="text-sm text-muted-foreground">已选择</div>
                  </div>
                </div>
              ) : selectedOrg ? (
                <div className="text-center py-4 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暂无待更新详情</p>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">请先选择机构</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 操作按钮 */}
          <Card>
            <CardHeader>
              <CardTitle>操作</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={toggleSelectAll}
                disabled={!pendingDetails || pendingDetails.count === 0}
                variant="outline"
                className="w-full"
              >
                {selectedLinks.length === pendingDetails?.pendingLinks.length ? '取消全选' : '全选'}
              </Button>
              <Button
                onClick={updateSelectedDetails}
                disabled={progressState.isActive || selectedLinks.length === 0}
                className="w-full"
              >
                <Play className="h-4 w-4 mr-2" />
                更新选中详情
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 待更新链接列表 */}
        {pendingDetails && pendingDetails.count > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>待更新链接列表</CardTitle>
              <CardDescription>
                {pendingDetails.orgName} - 共 {pendingDetails.count} 个待更新链接
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-3 text-sm text-muted-foreground border-b pb-2">
                <div className="grid grid-cols-12 gap-2 font-medium">
                  <div className="col-span-1">选择</div>
                  <div className="col-span-8">案例信息</div>
                  <div className="col-span-2">日期</div>
                  <div className="col-span-1">链接</div>
                </div>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {pendingDetails.pendingLinks.map((linkDetail, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center p-3 border rounded-lg hover:bg-muted/50">
                    <div className="col-span-1">
                      <Checkbox
                        id={`link-${index}`}
                        checked={selectedLinks.includes(linkDetail.link)}
                        onCheckedChange={(checked) => handleLinkSelection(linkDetail.link, checked as boolean)}
                      />
                    </div>
                    <div className="col-span-8 min-w-0 space-y-1">
                      {linkDetail.name && (
                        <div className="font-medium text-sm truncate" title={linkDetail.name}>
                          {linkDetail.name}
                        </div>
                      )}
                      <Label 
                        htmlFor={`link-${index}`} 
                        className="text-xs font-mono cursor-pointer truncate block text-muted-foreground"
                        title={linkDetail.link}
                      >
                        {linkDetail.link}
                      </Label>
                    </div>
                    <div className="col-span-2 text-xs text-muted-foreground">
                      {linkDetail.date || '-'}
                    </div>
                    <div className="col-span-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(linkDetail.link, '_blank')}
                        className="h-8 w-8 p-0"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 更新状态 */}
        {(progressState.isActive || progressState.progress > 0 || progressState.error) && (
          <ProgressTracker
            state={progressState}
            onCancel={stopStream}
            onReset={resetState}
            onRetry={handleRetry}
            showDetails={true}
          />
        )}
      </div>
    </MainLayout>
  )
}