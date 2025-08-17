"use client";

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { config } from "@/lib/config";
import { toast } from "sonner";
import { 
  Download, 
  FileText, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  FileDown,
  List,
  Settings
} from "lucide-react";

interface AttachmentItem {
  id: string;
  link: string;
  downloadUrl: string;
  fileName: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'skipped';
  fileSize?: string;
  downloadProgress?: number;
  errorMessage?: string;
  selected?: boolean;
  downloadSpeed?: string;
  retryCount?: number;
}

interface DownloadStats {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  skipped?: number;
}

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

export default function AttachmentsPage() {
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [downloadStats, setDownloadStats] = useState<DownloadStats>({
    total: 0,
    completed: 0,
    failed: 0,
    pending: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [startIndex, setStartIndex] = useState(0);
  const [endIndex, setEndIndex] = useState(10);
  const [organizations, setOrganizations] = useState<string[]>([]);
  const [selectedAttachments, setSelectedAttachments] = useState<Set<string>>(new Set());
  const [downloadResult, setDownloadResult] = useState<any>(null);
  const [forceOverwrite, setForceOverwrite] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus | null>(null);

  // API functions
  const fetchOrganizations = async (): Promise<string[]> => {
    const response = await fetch(`${config.backendUrl}/api/v1/attachments/organizations`);
    if (!response.ok) {
      throw new Error('Failed to fetch organizations');
    }
    return response.json();
  };

  const fetchAttachmentList = async (orgName: string): Promise<AttachmentItem[]> => {
    const response = await fetch(`${config.backendUrl}/api/v1/attachments/download-list/${encodeURIComponent(orgName)}`);
    if (!response.ok) {
      throw new Error('Failed to fetch attachment list');
    }
    return response.json();
  };

  const downloadSelectedAttachments = async (attachmentIds: string[], forceOverwrite: boolean = false) => {
    const response = await fetch(`${config.backendUrl}/api/v1/attachments/download/${encodeURIComponent(selectedOrg)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        attachment_ids: attachmentIds,
        force_overwrite: forceOverwrite
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to download attachments');
    }
    return response.json();
  };

  const getDownloadProgress = async (sessionId: string) => {
    const response = await fetch(`${config.backendUrl}/api/v1/attachments/download-progress/${sessionId}`);
    if (!response.ok) {
      throw new Error('Failed to get download progress');
    }
    return response.json();
  };

  const cleanupDownloadSession = async (sessionId: string) => {
    try {
      await fetch(`${config.backendUrl}/api/v1/attachments/download-session/${sessionId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Failed to cleanup download session:', error);
    }
  };

  useEffect(() => {
    // Load organizations on component mount
    const loadOrganizations = async () => {
      try {
        const orgs = await fetchOrganizations();
        setOrganizations(orgs);
      } catch (error) {
        console.error("Failed to load organizations:", error);
        toast.error("加载机构列表失败");
      }
    };
    loadOrganizations();
  }, []);

  useEffect(() => {
    if (selectedOrg) {
      loadAttachmentList();
    }
  }, [selectedOrg]);

  useEffect(() => {
    updateDownloadStats();
  }, [attachments]);

  const loadAttachmentList = async () => {
    if (!selectedOrg) return;
    
    setIsLoading(true);
    try {
      const data = await fetchAttachmentList(selectedOrg);
      setAttachments(data);
      setSelectedAttachments(new Set()); // Clear selection when loading new data
    } catch (error) {
      console.error("Failed to load attachments:", error);
      toast.error("加载附件列表失败");
      setAttachments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const updateDownloadStats = () => {
    const stats = attachments.reduce((acc, item) => {
      acc.total++;
      switch (item.status) {
        case 'completed':
          acc.completed++;
          break;
        case 'failed':
          acc.failed++;
          break;
        case 'skipped':
          acc.skipped = (acc.skipped || 0) + 1;
          break;
        case 'pending':
          acc.pending++;
          break;
      }
      return acc;
    }, { total: 0, completed: 0, failed: 0, pending: 0, skipped: 0 });
    
    setDownloadStats(stats);
  };

  const handleDownloadAttachments = async () => {
    if (!selectedOrg) {
      toast.error("请先选择机构");
      return;
    }
    
    if (selectedAttachments.size === 0) {
      toast.error("请选择要下载的附件");
      return;
    }
    
    setIsDownloading(true);
    const attachmentIds = Array.from(selectedAttachments);
    
    // Update status to downloading for selected attachments
    setAttachments(prev => prev.map(item => 
      selectedAttachments.has(item.id)
        ? { ...item, status: 'downloading', downloadProgress: 0 }
        : item
    ));

    try {
      // Call the download API
      const result = await downloadSelectedAttachments(attachmentIds, forceOverwrite);
      
      if (result.session_id) {
        setCurrentSessionId(result.session_id);
        
        // Start polling for progress
        const progressInterval = setInterval(async () => {
          try {
            const progress = await getDownloadProgress(result.session_id);
            setDownloadStatus(progress);
            
            // Update individual file progress
            setAttachments(prev => prev.map(item => {
              const fileProgress = progress.files.find((f: DownloadProgress) => f.attachment_id === item.id);
              if (fileProgress && selectedAttachments.has(item.id)) {
                return {
                  ...item,
                  status: fileProgress.status as any,
                  downloadProgress: fileProgress.progress,
                  downloadSpeed: fileProgress.speed,
                  retryCount: fileProgress.retry_count,
                  errorMessage: fileProgress.error_message
                };
              }
              return item;
            }));
            
            // Check if download is complete
            if (progress.overall_progress >= 100) {
              clearInterval(progressInterval);
              setIsDownloading(false);
              setCurrentSessionId(null);
              
              // Clear selection after successful download
              setSelectedAttachments(new Set());
              
              // Store download result for display
              setDownloadResult(result);
              
              // Show detailed feedback
              const messages = [];
              if (progress.completed > 0) messages.push(`成功 ${progress.completed} 个`);
              if (progress.skipped > 0) messages.push(`跳过 ${progress.skipped} 个`);
              if (progress.failed > 0) messages.push(`失败 ${progress.failed} 个`);
              
              if (progress.failed > 0) {
                toast.warning(`下载完成：${messages.join('，')}`);
              } else if (progress.skipped > 0) {
                toast.info(`下载完成：${messages.join('，')}`);
              } else {
                toast.success(`成功下载 ${progress.completed} 个附件`);
              }
              
              // Cleanup session after a delay
              setTimeout(() => {
                cleanupDownloadSession(result.session_id);
              }, 5000);
            }
          } catch (error) {
            console.error('Failed to get progress:', error);
            clearInterval(progressInterval);
            setIsDownloading(false);
            setCurrentSessionId(null);
          }
        }, 1000); // Poll every second
        
        // Set a timeout to stop polling after 5 minutes
        setTimeout(() => {
          clearInterval(progressInterval);
          if (isDownloading) {
            setIsDownloading(false);
            setCurrentSessionId(null);
            toast.error("下载超时，请重试");
          }
        }, 300000);
      }

    } catch (error) {
      console.error("Download failed:", error);
      // Mark as failed
      setAttachments(prev => prev.map(item => 
        selectedAttachments.has(item.id)
          ? { ...item, status: 'failed', errorMessage: 'Download failed' }
          : item
      ));
      
      // Show error toast
      toast.error("下载失败，请重试");
      setIsDownloading(false);
      setCurrentSessionId(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'downloading':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: '待下载', className: 'bg-gray-100 text-gray-800' },
      downloading: { label: '下载中', className: 'bg-blue-100 text-blue-800' },
      completed: { label: '已完成', className: 'bg-green-100 text-green-800' },
      failed: { label: '失败', className: 'bg-red-100 text-red-800' },
      skipped: { label: '已跳过', className: 'bg-yellow-100 text-yellow-800' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <Badge className={config?.className || 'bg-gray-100 text-gray-800'}>
        {config?.label || status}
      </Badge>
    );
  };

  const handleSelectAttachment = (attachmentId: string, checked: boolean) => {
    setSelectedAttachments(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(attachmentId);
      } else {
        newSet.delete(attachmentId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAttachments(new Set(attachments.map(a => a.id)));
    } else {
      setSelectedAttachments(new Set());
    }
  };

  const handleSelectRange = () => {
    const rangeIds = attachments.slice(startIndex, endIndex).map(a => a.id);
    setSelectedAttachments(new Set(rangeIds));
  };

  const handleSelectPending = () => {
    const pendingIds = attachments.filter(a => a.status === 'pending').map(a => a.id);
    setSelectedAttachments(new Set(pendingIds));
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">附件处理</h1>
            <p className="text-muted-foreground">管理和下载PBOC案例附件</p>
          </div>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            刷新页面
          </Button>
        </div>

        {/* Organization Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              机构选择
            </CardTitle>
            <CardDescription>
              选择要处理附件的PBOC机构
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium">机构</label>
                <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择机构" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org} value={org}>
                        {org}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={loadAttachmentList}
                disabled={!selectedOrg || isLoading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white border-blue-600 disabled:bg-gray-400 disabled:text-gray-200"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <List className="h-4 w-4" />
                )}
                加载附件列表
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Download Statistics */}
        {selectedOrg && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">总数</p>
                    <p className="text-2xl font-bold">{downloadStats.total}</p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">已完成</p>
                    <p className="text-2xl font-bold text-green-600">{downloadStats.completed}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">待下载</p>
                    <p className="text-2xl font-bold text-yellow-600">{downloadStats.pending}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">失败</p>
                    <p className="text-2xl font-bold text-red-600">{downloadStats.failed}</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Download Controls */}
        {selectedOrg && attachments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileDown className="h-5 w-5" />
                下载控制
              </CardTitle>
              <CardDescription>
                选择要下载的附件
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-center flex-wrap">
                <div className="flex items-center gap-2">
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => handleSelectAll(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                  >
                    全选
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => handleSelectAll(false)}
                    className="bg-gray-600 hover:bg-gray-700 text-white border-gray-600"
                  >
                    取消全选
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={handleSelectPending}
                    className="bg-purple-600 hover:bg-purple-700 text-white border-purple-600"
                  >
                    选择未下载
                  </Button>
                </div>
                
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="force-overwrite"
                    checked={forceOverwrite}
                    onCheckedChange={(checked) => setForceOverwrite(checked as boolean)}
                  />
                  <label htmlFor="force-overwrite" className="text-sm font-medium">
                    覆盖已存在的文件
                  </label>
                </div>
                
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={startIndex}
                    onChange={(e) => setStartIndex(Number(e.target.value))}
                    min={0}
                    max={attachments.length - 1}
                    className="w-20"
                    placeholder="开始"
                  />
                  <span className="text-sm text-muted-foreground">到</span>
                  <Input
                    type="number"
                    value={endIndex}
                    onChange={(e) => setEndIndex(Number(e.target.value))}
                    min={startIndex + 1}
                    max={attachments.length}
                    className="w-20"
                    placeholder="结束"
                  />
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={handleSelectRange}
                    disabled={startIndex >= endIndex}
                    className="bg-green-600 hover:bg-green-700 text-white border-green-600 disabled:bg-gray-400 disabled:text-gray-200"
                  >
                    选择范围
                  </Button>
                </div>
                
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">
                    已选择 {selectedAttachments.size} 个附件
                  </p>
                </div>
                
                <Button 
                  onClick={handleDownloadAttachments}
                  disabled={isDownloading || selectedAttachments.size === 0}
                  className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white border-orange-600 disabled:bg-gray-400 disabled:text-gray-200"
                  size="default"
                >
                  {isDownloading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {isDownloading ? '下载中...' : `下载选中的 ${selectedAttachments.size} 个文件`}
                </Button>
              </div>
              
              {isDownloading && downloadStatus && (
                <div className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      正在下载附件，请勿关闭页面...
                    </AlertDescription>
                  </Alert>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">下载进度</CardTitle>
                      <CardDescription>
                        {downloadStatus.current_file && `当前文件: ${downloadStatus.current_file}`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">总体进度</span>
                        <span className="text-sm text-muted-foreground">
                          {downloadStatus.completed + downloadStatus.failed + downloadStatus.skipped} / {downloadStatus.total_files}
                        </span>
                      </div>
                      <Progress value={downloadStatus.overall_progress} className="w-full" />
                      
                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                          <div className="text-lg font-bold text-green-600">{downloadStatus.completed}</div>
                          <div className="text-xs text-muted-foreground">已完成</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-yellow-600">{downloadStatus.skipped}</div>
                          <div className="text-xs text-muted-foreground">已跳过</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-red-600">{downloadStatus.failed}</div>
                          <div className="text-xs text-muted-foreground">失败</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-blue-600">
                            {downloadStatus.total_files - downloadStatus.completed - downloadStatus.failed - downloadStatus.skipped}
                          </div>
                          <div className="text-xs text-muted-foreground">待处理</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Download Results */}
        {downloadResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                下载结果
              </CardTitle>
              <CardDescription>
                最近一次下载的详细结果
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{downloadResult.successful}</div>
                  <div className="text-sm text-green-700">成功下载</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{downloadResult.skipped || 0}</div>
                  <div className="text-sm text-yellow-700">跳过文件</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{downloadResult.failed}</div>
                  <div className="text-sm text-red-700">下载失败</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{downloadResult.total_requested}</div>
                  <div className="text-sm text-blue-700">总计请求</div>
                </div>
              </div>
              
              {downloadResult.download_path && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-700 mb-2">下载路径:</div>
                  <div className="text-sm text-gray-600 font-mono break-all">
                    {downloadResult.download_path}
                  </div>
                </div>
              )}
              
              {downloadResult.skipped_files && downloadResult.skipped_files.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-yellow-700">跳过详情:</div>
                  <div className="space-y-1">
                    {downloadResult.skipped_files.map((skipped: any, index: number) => (
                      <div key={index} className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                        附件 {skipped.id} ({skipped.filename}): {skipped.reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {downloadResult.failed_downloads && downloadResult.failed_downloads.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-red-700">失败详情:</div>
                  <div className="space-y-1">
                    {downloadResult.failed_downloads.map((failure: any, index: number) => (
                      <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        附件 {failure.id}: {failure.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setDownloadResult(null)}
                >
                  关闭
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Attachments List */}
        {selectedOrg && (
          <Card>
            <CardHeader>
              <CardTitle>附件列表</CardTitle>
              <CardDescription>
                {selectedOrg} - 共 {attachments.length} 个附件
              </CardDescription>
            </CardHeader>
            <CardContent>
              {attachments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {isLoading ? "加载中..." : "暂无附件数据"}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedAttachments.size === attachments.length && attachments.length > 0}
                            onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                          />
                        </TableHead>
                        <TableHead>索引</TableHead>
                        <TableHead>文件名</TableHead>
                        <TableHead>下载链接</TableHead>
                        <TableHead>文件大小</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>进度</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attachments.map((attachment, index) => (
                        <TableRow key={attachment.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedAttachments.has(attachment.id)}
                              onCheckedChange={(checked) => handleSelectAttachment(attachment.id, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell>{index}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(attachment.status)}
                              <span className="font-medium">{attachment.fileName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs truncate text-sm text-muted-foreground">
                              {attachment.downloadUrl}
                            </div>
                          </TableCell>
                          <TableCell>{attachment.fileSize || '-'}</TableCell>
                          <TableCell>
                            {getStatusBadge(attachment.status)}
                          </TableCell>
                          <TableCell>
                            {attachment.status === 'downloading' && attachment.downloadProgress !== undefined ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Progress value={attachment.downloadProgress} className="w-16" />
                                  <span className="text-sm">{attachment.downloadProgress}%</span>
                                </div>
                                {attachment.downloadSpeed && (
                                  <div className="text-xs text-muted-foreground">{attachment.downloadSpeed}</div>
                                )}
                                {attachment.retryCount && attachment.retryCount > 0 && (
                                  <div className="text-xs text-yellow-600">重试 {attachment.retryCount}</div>
                                )}
                              </div>
                            ) : attachment.status === 'completed' ? (
                              <span className="text-sm text-green-600">100%</span>
                            ) : attachment.status === 'failed' ? (
                              <div className="space-y-1">
                                <span className="text-sm text-red-600">失败</span>
                                {attachment.errorMessage && (
                                  <div className="text-xs text-red-500 max-w-xs truncate" title={attachment.errorMessage}>
                                    {attachment.errorMessage}
                                  </div>
                                )}
                              </div>
                            ) : attachment.status === 'skipped' ? (
                              <span className="text-sm text-yellow-600">已跳过</span>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(attachment.link, '_blank')}
                            >
                              查看原页
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}