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
        <div className="flex items-center justify-between mb-2">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-xl gradient-accent animate-float">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 bg-clip-text text-transparent">
                  待更新详情
                </h1>
                <p className="text-muted-foreground text-lg">
                  查看并选择性更新各机构的待处理案例详情链接
                </p>
              </div>
            </div>
          </div>
          <Button
            onClick={refreshPendingDetails}
            disabled={!selectedOrg}
            className="flex items-center gap-2 gradient-success text-white border-0 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className="h-4 w-4" />
            刷新列表
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 机构选择 */}
          <Card className="glass-card border-0 shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
            <CardHeader className="relative z-10">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg gradient-primary">
                  <Building2 className="h-4 w-4 text-white" />
                </div>
                选择机构
              </CardTitle>
              <CardDescription>
                选择要查看待更新详情的机构
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {cityList.map((org) => {
                  const isSelected = selectedOrg === org;
                  return (
                    <div 
                      key={org} 
                      className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-all duration-200 ${
                        isSelected 
                          ? 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-400/30' 
                          : 'hover:bg-gradient-to-r hover:from-white/50 hover:to-white/30 dark:hover:from-white/5 dark:hover:to-white/10'
                      }`}
                      onClick={() => handleOrgChange(org)}
                    >
                      <div className={`relative w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                        isSelected 
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 border-blue-500 shadow-lg shadow-blue-500/30' 
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                      }`}>
                        {isSelected && (
                          <div className="absolute top-1 left-1 w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>
                      <Label 
                        htmlFor={org} 
                        className={`text-sm font-medium cursor-pointer transition-colors duration-200 ${
                          isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-foreground'
                        }`}
                      >
                        {org}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* 待更新统计 */}
          <Card className="glass-card border-0 shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-blue-500/5" />
            <CardHeader className="relative z-10">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg gradient-info">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                待更新统计
              </CardTitle>
              <CardDescription>
                当前机构的待更新详情统计
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
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
          <Card className="glass-card border-0 shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5" />
            <CardHeader className="relative z-10">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg gradient-accent">
                  <Play className="h-4 w-4 text-white" />
                </div>
                操作
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 relative z-10">
              <Button
                onClick={toggleSelectAll}
                disabled={!pendingDetails || pendingDetails.count === 0}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500"
              >
                {selectedLinks.length === pendingDetails?.pendingLinks.length ? '取消全选' : '全选'}
              </Button>
              <Button
                onClick={updateSelectedDetails}
                disabled={progressState.isActive || selectedLinks.length === 0}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500"
              >
                <Play className="h-4 w-4 mr-2" />
                更新选中详情
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 待更新链接列表 */}
        {pendingDetails && pendingDetails.count > 0 && (
          <Card className="glass-card border-0 shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5" />
            <CardHeader className="relative z-10">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg gradient-primary">
                  <ExternalLink className="h-4 w-4 text-white" />
                </div>
                待更新链接列表
              </CardTitle>
              <CardDescription>
                {pendingDetails.orgName} - 共 {pendingDetails.count} 个待更新链接
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="mb-4 p-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg border">
                <div className="grid grid-cols-12 gap-3 font-semibold text-sm">
                  <div className="col-span-1 text-center text-blue-600 dark:text-blue-400">选择</div>
                  <div className="col-span-8 text-gray-700 dark:text-gray-300">案例信息</div>
                  <div className="col-span-2 text-gray-700 dark:text-gray-300">日期</div>
                  <div className="col-span-1 text-center text-gray-700 dark:text-gray-300">操作</div>
                </div>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {pendingDetails.pendingLinks.map((linkDetail, index) => {
                  const isSelected = selectedLinks.includes(linkDetail.link);
                  return (
                    <div 
                      key={`pending-link-${index}`} 
                      className={`grid grid-cols-12 gap-3 items-center p-4 rounded-xl transition-all duration-200 cursor-pointer group ${
                        isSelected 
                          ? 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-2 border-blue-400/30 shadow-md' 
                          : 'bg-gradient-to-r from-white/50 to-white/30 dark:from-white/5 dark:to-white/10 hover:from-white/70 hover:to-white/50 dark:hover:from-white/10 dark:hover:to-white/15 border border-white/20 hover:border-blue-300/50'
                      }`}
                      onClick={() => handleLinkSelection(linkDetail.link, !isSelected)}
                    >
                      <div className="col-span-1 flex justify-center">
                        <div className={`relative w-5 h-5 rounded border-2 transition-all duration-200 ${
                          isSelected 
                            ? 'bg-gradient-to-r from-blue-500 to-purple-600 border-blue-500 shadow-lg shadow-blue-500/30' 
                            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 group-hover:border-blue-400 group-hover:shadow-md'
                        }`}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white absolute top-0.5 left-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div className="col-span-8 min-w-0 space-y-1">
                        {linkDetail.name && (
                          <div className={`font-medium text-sm truncate transition-colors duration-200 ${
                            isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-foreground'
                          }`} title={linkDetail.name}>
                            {linkDetail.name}
                          </div>
                        )}
                        <div 
                          className={`text-xs font-mono truncate block transition-colors duration-200 ${
                            isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'
                          }`}
                          title={linkDetail.link}
                        >
                          {linkDetail.link}
                        </div>
                      </div>
                      <div className={`col-span-2 text-xs transition-colors duration-200 ${
                        isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'
                      }`}>
                        {linkDetail.date || '-'}
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(linkDetail.link, '_blank');
                          }}
                          className={`h-8 w-8 p-0 transition-all duration-200 ${
                            isSelected 
                              ? 'hover:bg-blue-500/20 text-blue-600 dark:text-blue-400' 
                              : 'hover:bg-gray-500/20 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
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