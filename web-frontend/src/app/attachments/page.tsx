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
import { config } from "@/lib/config";
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
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  fileSize?: string;
  downloadProgress?: number;
  errorMessage?: string;
}

interface DownloadStats {
  total: number;
  completed: number;
  failed: number;
  pending: number;
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

  useEffect(() => {
    // Load organizations on component mount
    const loadOrganizations = async () => {
      try {
        const orgs = await fetchOrganizations();
        setOrganizations(orgs);
      } catch (error) {
        console.error("Failed to load organizations:", error);
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
    } catch (error) {
      console.error("Failed to load attachments:", error);
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
        case 'pending':
          acc.pending++;
          break;
      }
      return acc;
    }, { total: 0, completed: 0, failed: 0, pending: 0 });
    
    setDownloadStats(stats);
  };

  const handleDownloadAttachments = async () => {
    if (!selectedOrg) return;
    
    setIsDownloading(true);
    const selectedAttachments = attachments.slice(startIndex, endIndex);
    
    for (let i = 0; i < selectedAttachments.length; i++) {
      const attachment = selectedAttachments[i];
      
      // Update status to downloading
      setAttachments(prev => prev.map(item => 
        item.id === attachment.id 
          ? { ...item, status: 'downloading', downloadProgress: 0 }
          : item
      ));

      try {
        // Simulate download progress
        for (let progress = 0; progress <= 100; progress += 20) {
          await new Promise(resolve => setTimeout(resolve, 200));
          setAttachments(prev => prev.map(item => 
            item.id === attachment.id 
              ? { ...item, downloadProgress: progress }
              : item
          ));
        }

        // Mark as completed
        setAttachments(prev => prev.map(item => 
          item.id === attachment.id 
            ? { ...item, status: 'completed', downloadProgress: 100 }
            : item
        ));

      } catch (error) {
        // Mark as failed
        setAttachments(prev => prev.map(item => 
          item.id === attachment.id 
            ? { ...item, status: 'failed', errorMessage: 'Download failed' }
            : item
        ));
      }
    }
    
    setIsDownloading(false);
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
      failed: { label: '失败', className: 'bg-red-100 text-red-800' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
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
                className="flex items-center gap-2"
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
                配置下载范围和开始下载
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-end">
                <div>
                  <label className="text-sm font-medium">开始索引</label>
                  <Input
                    type="number"
                    value={startIndex}
                    onChange={(e) => setStartIndex(Number(e.target.value))}
                    min={0}
                    max={attachments.length - 1}
                    className="w-32"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">结束索引</label>
                  <Input
                    type="number"
                    value={endIndex}
                    onChange={(e) => setEndIndex(Number(e.target.value))}
                    min={startIndex + 1}
                    max={attachments.length}
                    className="w-32"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">
                    将下载 {Math.max(0, endIndex - startIndex)} 个附件
                  </p>
                </div>
                <Button 
                  onClick={handleDownloadAttachments}
                  disabled={isDownloading || startIndex >= endIndex}
                  className="flex items-center gap-2"
                >
                  {isDownloading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {isDownloading ? '下载中...' : '开始下载'}
                </Button>
              </div>
              
              {isDownloading && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    正在下载附件，请勿关闭页面...
                  </AlertDescription>
                </Alert>
              )}
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
                              <div className="flex items-center gap-2">
                                <Progress value={attachment.downloadProgress} className="w-16" />
                                <span className="text-sm">{attachment.downloadProgress}%</span>
                              </div>
                            ) : attachment.status === 'completed' ? (
                              <span className="text-sm text-green-600">100%</span>
                            ) : attachment.status === 'failed' ? (
                              <span className="text-sm text-red-600">失败</span>
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