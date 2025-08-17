'use client'

import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle, Loader2, X, RotateCcw } from 'lucide-react'
import { ProgressState } from '@/lib/hooks/use-progress-stream'

interface ProgressTrackerProps {
  state: ProgressState
  onCancel?: () => void
  onReset?: () => void
  onRetry?: () => void
  showDetails?: boolean
}

export function ProgressTracker({ 
  state, 
  onCancel, 
  onReset, 
  onRetry,
  showDetails = true 
}: ProgressTrackerProps) {
  const getStatusIcon = () => {
    if (state.error) {
      return <AlertCircle className="h-5 w-5 text-white" />
    }
    if (state.isActive) {
      return <Loader2 className="h-5 w-5 animate-spin text-white" />
    }
    if (state.progress === 100) {
      return <CheckCircle className="h-5 w-5 text-white" />
    }
    return <Loader2 className="h-5 w-5 text-white" />
  }

  const getStatusBadge = () => {
    if (state.error) {
      return <Badge className="gradient-destructive text-white border-0 shadow-lg shadow-red-500/30">失败</Badge>
    }
    if (state.isActive) {
      return <Badge className="gradient-info text-white border-0 shadow-lg shadow-blue-500/30 animate-pulse">更新中</Badge>
    }
    if (state.progress === 100) {
      return <Badge className="gradient-success text-white border-0 shadow-lg shadow-green-500/30">已完成</Badge>
    }
    return <Badge className="bg-gradient-to-r from-gray-500 to-gray-600 text-white border-0 shadow-lg shadow-gray-500/30">等待中</Badge>
  }

  const getProgressColor = () => {
    if (state.error && state.progress > 0) return 'bg-orange-500' // Partial progress with error
    if (state.error) return 'bg-destructive'
    if (state.progress === 100) return 'bg-green-500'
    return 'bg-blue-500'
  }

  return (
    <Card className="glass-card border-0 shadow-xl relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
      <CardHeader className="relative z-10">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className={`p-2 rounded-lg ${
              state.error ? 'gradient-destructive' :
              state.isActive ? 'gradient-info animate-pulse' :
              state.progress === 100 ? 'gradient-success' : 'gradient-primary'
            }`}>
              {getStatusIcon()}
            </div>
            <div>
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-bold">
                更新进度
              </div>
              {state.orgName && (
                <div className="text-sm font-normal text-muted-foreground">
                  {state.orgName}
                </div>
              )}
            </div>
          </CardTitle>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {state.isActive && onCancel && (
              <Button
                size="sm"
                onClick={onCancel}
                className="h-8 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
              >
                <X className="h-4 w-4 mr-1" />
                取消
              </Button>
            )}
            {!state.isActive && state.error && onRetry && (
              <Button
                size="sm"
                onClick={onRetry}
                className="h-8 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                重试
              </Button>
            )}
            {!state.isActive && onReset && (
              <Button
                size="sm"
                onClick={onReset}
                className="h-8 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
              >
                重置
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 relative z-10">
        {/* Progress Bar */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">进度</span>
            <div className="flex items-center gap-3">
              {state.totalLinks > 0 && (
                <span className="text-sm px-2 py-1 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-md text-blue-700 dark:text-blue-300 font-medium">
                  {state.currentLink}/{state.totalLinks}
                </span>
              )}
              <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {Math.round(state.progress)}%
              </span>
            </div>
          </div>
          <div className="relative">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden shadow-inner">
              <div 
                className={`h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden ${
                  state.error && state.progress > 0 ? 'bg-gradient-to-r from-orange-500 to-red-500' :
                  state.error ? 'bg-gradient-to-r from-red-500 to-red-600' :
                  state.progress === 100 ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
                  'bg-gradient-to-r from-blue-500 to-purple-600'
                } shadow-lg`}
                style={{ width: `${state.progress}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent animate-pulse" />
              </div>
            </div>
            {state.isActive && (
              <div className="absolute top-0 left-0 w-full h-full">
                <div className="h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse rounded-full" 
                     style={{ width: '30%', marginLeft: `${Math.max(0, state.progress - 15)}%` }} />
              </div>
            )}
          </div>
        </div>

        {/* Status Message */}
        <div className="space-y-3">
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">状态</div>
          <div className={`text-sm p-4 rounded-xl border transition-all duration-200 ${
            state.error 
              ? 'bg-gradient-to-r from-red-500/10 to-red-600/10 text-red-700 dark:text-red-400 border-red-300 dark:border-red-600 shadow-lg shadow-red-500/20' 
              : 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-600 shadow-lg shadow-blue-500/20'
          }`}>
            {state.message || '等待开始...'}
          </div>
        </div>

        {/* Details */}
        {showDetails && (state.updatedCases > 0 || state.downloads > 0 || state.tables > 0) && (
          <div className="space-y-3">
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">详细信息</div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl border border-green-300/30 dark:border-green-600/30 shadow-lg hover:shadow-xl transition-all duration-200">
                <div className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  {state.updatedCases}
                </div>
                <div className="text-green-700 dark:text-green-400 font-medium">更新案例</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-xl border border-blue-300/30 dark:border-blue-600/30 shadow-lg hover:shadow-xl transition-all duration-200">
                <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                  {state.downloads}
                </div>
                <div className="text-blue-700 dark:text-blue-400 font-medium">下载链接</div>
              </div>
              <div className="text-center p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-xl border border-purple-300/30 dark:border-purple-600/30 shadow-lg hover:shadow-xl transition-all duration-200">
                <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent">
                  {state.tables}
                </div>
                <div className="text-purple-700 dark:text-purple-400 font-medium">内容提取</div>
              </div>
            </div>
          </div>
        )}

        {/* Error Details */}
        {state.error && (
          <div className="space-y-3">
            <div className="text-sm font-semibold text-red-700 dark:text-red-400">错误详情</div>
            <div className="text-sm p-4 bg-gradient-to-r from-red-500/10 to-red-600/10 text-red-700 dark:text-red-400 rounded-xl border border-red-300 dark:border-red-600 font-mono shadow-lg shadow-red-500/20">
              {state.error}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}