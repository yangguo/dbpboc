'use client'

import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle, Loader2, X, Download, Clock } from 'lucide-react'
import { formatBytes } from '@/lib/utils'

interface DownloadProgress {
  attachment_id: string;
  filename: string;
  status: string;
  progress: number;
  downloaded_bytes: number;
  total_bytes: number;
  speed: string;
  error_message: string;
  retry_count: number;
}

interface DownloadStatus {
  session_id: string;
  total_files: number;
  completed: number;
  failed: number;
  skipped: number;
  current_file?: string;
  overall_progress: number;
  files: DownloadProgress[];
}

interface DownloadProgressTrackerProps {
  status: DownloadStatus
  onCancel?: () => void
  showDetails?: boolean
}

export function DownloadProgressTracker({ 
  status, 
  onCancel,
  showDetails = true 
}: DownloadProgressTrackerProps) {
  // Compute overall progress from counts to avoid relying on backend field
  const doneCount = status.completed + status.failed + status.skipped
  const computedOverall = Math.min(
    100,
    Math.round(((doneCount) / Math.max(1, status.total_files)) * 100)
  )
  const getStatusIcon = (fileStatus: string) => {
    switch (fileStatus) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'downloading':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'skipped':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (fileStatus: string) => {
    const statusConfig = {
      pending: { label: '等待中', className: 'bg-gray-100 text-gray-800' },
      downloading: { label: '下载中', className: 'bg-blue-100 text-blue-800 animate-pulse' },
      completed: { label: '已完成', className: 'bg-green-100 text-green-800' },
      failed: { label: '失败', className: 'bg-red-100 text-red-800' },
      skipped: { label: '已跳过', className: 'bg-yellow-100 text-yellow-800' }
    };
    
    const config = statusConfig[fileStatus as keyof typeof statusConfig];
    return (
      <Badge className={config?.className || 'bg-gray-100 text-gray-800'}>
        {config?.label || fileStatus}
      </Badge>
    );
  }

  const getOverallStatusIcon = () => {
    if (status.failed > 0 && doneCount === status.total_files) {
      return <AlertCircle className="h-5 w-5 text-orange-500" />
    }
    if (computedOverall === 100) {
      return <CheckCircle className="h-5 w-5 text-green-500" />
    }
    return <Download className="h-5 w-5 text-blue-500" />
  }

  const getOverallStatusBadge = () => {
    if (status.failed > 0 && doneCount === status.total_files) {
      return <Badge className="bg-orange-100 text-orange-800">部分完成</Badge>
    }
    if (computedOverall === 100) {
      return <Badge className="bg-green-100 text-green-800">全部完成</Badge>
    }
    return <Badge className="bg-blue-100 text-blue-800 animate-pulse">下载中</Badge>
  }

  const isActive = computedOverall < 100

  return (
    <Card className="border-0 shadow-xl relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
      <CardHeader className="relative z-10">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className={`p-2 rounded-lg ${
              status.failed > 0 && status.completed + status.skipped + status.failed === status.total_files
                ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
              status.overall_progress === 100 
                ? 'bg-gradient-to-r from-green-500 to-green-600' 
                : 'bg-gradient-to-r from-blue-500 to-blue-600'
            }`}>
              {getOverallStatusIcon()}
            </div>
            <div>
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-bold">
                下载进度
              </div>
              {status.current_file && (
                <div className="text-sm font-normal text-muted-foreground">
                  当前: {status.current_file}
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                会话: {status.session_id}
              </div>
            </div>
          </CardTitle>
          <div className="flex items-center gap-2">
            {getOverallStatusBadge()}
            {isActive && onCancel && (
              <Button
                size="sm"
                onClick={onCancel}
                className="h-8 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
              >
                <X className="h-4 w-4 mr-1" />
                取消
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 relative z-10">
        {/* Overall Progress Bar */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">总体进度</span>
            <div className="flex items-center gap-3">
              <span className="text-sm px-2 py-1 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-md text-blue-700 dark:text-blue-300 font-medium">
                {status.completed + status.failed + status.skipped}/{status.total_files}
              </span>
              <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {computedOverall}%
              </span>
            </div>
          </div>
          <div className="relative">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden shadow-inner">
              <div 
                className={`h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden ${
                  status.failed > 0 && doneCount === status.total_files
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
                  computedOverall === 100 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                    : 'bg-gradient-to-r from-blue-500 to-purple-600'
                } shadow-lg`}
                style={{ width: `${computedOverall}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent animate-pulse" />
              </div>
            </div>
            {isActive && (
              <div className="absolute top-0 left-0 w-full h-full">
                <div className="h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse rounded-full" 
                     style={{ width: '30%', marginLeft: `${Math.max(0, computedOverall - 15)}%` }} />
              </div>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div className="text-center p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl border border-green-300/30 dark:border-green-600/30 shadow-lg hover:shadow-xl transition-all duration-200">
            <div className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              {status.completed}
            </div>
            <div className="text-green-700 dark:text-green-400 font-medium">已完成</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 rounded-xl border border-yellow-300/30 dark:border-yellow-600/30 shadow-lg hover:shadow-xl transition-all duration-200">
            <div className="text-2xl font-bold bg-gradient-to-r from-yellow-600 to-yellow-700 bg-clip-text text-transparent">
              {status.skipped}
            </div>
            <div className="text-yellow-700 dark:text-yellow-400 font-medium">已跳过</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-red-500/10 to-red-600/10 rounded-xl border border-red-300/30 dark:border-red-600/30 shadow-lg hover:shadow-xl transition-all duration-200">
            <div className="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent">
              {status.failed}
            </div>
            <div className="text-red-700 dark:text-red-400 font-medium">失败</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-xl border border-blue-300/30 dark:border-blue-600/30 shadow-lg hover:shadow-xl transition-all duration-200">
            <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
              {status.total_files - status.completed - status.failed - status.skipped}
            </div>
            <div className="text-blue-700 dark:text-blue-400 font-medium">待处理</div>
          </div>
        </div>

        {/* Individual File Progress */}
        {showDetails && status.files.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">文件详情</div>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {status.files.map((file, index) => (
                <div
                  key={file.attachment_id || file.filename || `file-${index}`}
                  className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {getStatusIcon(file.status)}
                      <span className="font-medium truncate">{file.filename}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(file.status)}
                      {file.retry_count > 0 && (
                        <Badge variant="outline" className="text-xs">
                          重试 {file.retry_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {file.status === 'downloading' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{file.progress}%</span>
                        <span>
                          {formatBytes(file.downloaded_bytes)} / {formatBytes(file.total_bytes)}
                        </span>
                      </div>
                      <Progress value={file.progress} className="h-2" />
                      {file.speed && (
                        <div className="text-xs text-muted-foreground text-right">
                          {file.speed}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {file.status === 'completed' && file.total_bytes > 0 && (
                    <div className="text-xs text-green-600 dark:text-green-400">
                      {formatBytes(file.total_bytes)}
                    </div>
                  )}
                  
                  {file.status === 'failed' && file.error_message && (
                    <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {file.error_message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
