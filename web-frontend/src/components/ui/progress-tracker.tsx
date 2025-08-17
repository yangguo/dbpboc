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
      return <AlertCircle className="h-4 w-4 text-destructive" />
    }
    if (state.isActive) {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
    }
    if (state.progress === 100) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    }
    return null
  }

  const getStatusBadge = () => {
    if (state.error) {
      return <Badge variant="destructive">失败</Badge>
    }
    if (state.isActive) {
      return <Badge variant="secondary">更新中</Badge>
    }
    if (state.progress === 100) {
      return <Badge variant="default">已完成</Badge>
    }
    return <Badge variant="outline">等待中</Badge>
  }

  const getProgressColor = () => {
    if (state.error && state.progress > 0) return 'bg-orange-500' // Partial progress with error
    if (state.error) return 'bg-destructive'
    if (state.progress === 100) return 'bg-green-500'
    return 'bg-blue-500'
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon()}
            更新进度
            {state.orgName && (
              <span className="text-sm font-normal text-muted-foreground">
                - {state.orgName}
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {state.isActive && onCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                className="h-8"
              >
                <X className="h-4 w-4 mr-1" />
                取消
              </Button>
            )}
            {!state.isActive && state.error && onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="h-8"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                重试
              </Button>
            )}
            {!state.isActive && onReset && (
              <Button
                variant="outline"
                size="sm"
                onClick={onReset}
                className="h-8"
              >
                重置
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>进度</span>
            <div className="flex items-center gap-2">
              {state.totalLinks > 0 && (
                <span className="text-muted-foreground">
                  {state.currentLink}/{state.totalLinks}
                </span>
              )}
              <span>{Math.round(state.progress)}%</span>
            </div>
          </div>
          <Progress 
            value={state.progress} 
            className="h-3"
          />
        </div>

        {/* Status Message */}
        <div className="space-y-2">
          <div className="text-sm font-medium">状态</div>
          <div className={`text-sm p-3 rounded-md ${
            state.error 
              ? 'bg-destructive/10 text-destructive border border-destructive/20' 
              : 'bg-muted text-muted-foreground'
          }`}>
            {state.message || '等待开始...'}
          </div>
        </div>

        {/* Details */}
        {showDetails && (state.updatedCases > 0 || state.downloads > 0 || state.tables > 0) && (
          <div className="space-y-2">
            <div className="text-sm font-medium">详细信息</div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center p-2 bg-muted rounded">
                <div className="font-semibold">{state.updatedCases}</div>
                <div className="text-muted-foreground">更新案例</div>
              </div>
              <div className="text-center p-2 bg-muted rounded">
                <div className="font-semibold">{state.downloads}</div>
                <div className="text-muted-foreground">下载链接</div>
              </div>
              <div className="text-center p-2 bg-muted rounded">
                <div className="font-semibold">{state.tables}</div>
                <div className="text-muted-foreground">内容提取</div>
              </div>
            </div>
          </div>
        )}

        {/* Error Details */}
        {state.error && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-destructive">错误详情</div>
            <div className="text-sm p-3 bg-destructive/10 text-destructive rounded-md border border-destructive/20 font-mono">
              {state.error}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}