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

// 城市列表 - 从原始应用复制
const cityList = [
  '北京', '天津', '石家庄', '太原', '呼和浩特', '沈阳', '长春', '哈尔滨',
  '上海', '南京', '杭州', '合肥', '福州', '南昌', '济南', '郑州',
  '武汉', '长沙', '广州', '南宁', '海口', '重庆', '成都', '贵阳',
  '昆明', '拉萨', '西安', '兰州', '西宁', '银川', '乌鲁木齐', '大连',
  '青岛', '宁波', '厦门', '深圳'
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

  // 更新案例详情
  const updateCaseDetails = async () => {
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

  // 刷新页面
  const refreshPage = () => {
    setSelectedOrgs([])
    setUpdateStatuses([])
    setStartPage(1)
    setEndPage(1)
    setShowPendingOnly(false)
    fetchPendingOrgs()
    toast.success('页面已刷新')
  }

  const displayOrgs = showPendingOnly ? pendingOrgs : cityList

  return (
    <MainLayout>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">案例更新</h1>
          <p className="text-muted-foreground mt-2">
            更新各机构的案例列表和详细信息
          </p>
        </div>
        <Button
          variant="outline"
          onClick={refreshPage}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          刷新页面
        </Button>
      </div>

      <div className="space-y-6">
        {/* Top control panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 机构选择 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                机构选择
              </CardTitle>
              <CardDescription>
                选择需要更新的机构
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  variant="outline"
                  size="sm"
                  onClick={selectAllOrgs}
                  className="flex-1"
                >
                  全选
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllOrgs}
                  className="flex-1"
                >
                  清除
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
          <Card>
            <CardHeader>
              <CardTitle>页面范围</CardTitle>
              <CardDescription>
                设置爬取的页面范围
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
          <Card>
            <CardHeader>
              <CardTitle>操作</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={updateCaseList}
                disabled={isUpdating || selectedOrgs.length === 0}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                更新列表
              </Button>
              <Button
                onClick={updateCaseDetails}
                disabled={isUpdating || selectedOrgs.length === 0}
                className="w-full"
                variant="outline"
              >
                <FileText className="h-4 w-4 mr-2" />
                更新详情
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 更新状态 */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>更新状态</CardTitle>
              <CardDescription>
                实时显示各机构的更新进度
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                            variant={
                              status.status === 'completed' ? 'default' :
                              status.status === 'error' ? 'destructive' :
                              status.status === 'updating' ? 'secondary' : 'outline'
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
