"use client";

import { useState, useCallback } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Upload, 
  FileText, 
  Image, 
  File, 
  X, 
  CheckCircle, 
  AlertCircle,
  Cloud,
  FolderOpen
} from "lucide-react";

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

const getFileIcon = (fileType: string) => {
  const type = fileType.toLowerCase();
  if (type.includes('pdf')) {
    return <FileText className="h-8 w-8 text-red-500" />;
  } else if (type.includes('image') || ['jpg', 'jpeg', 'png', 'gif'].some(ext => type.includes(ext))) {
    return <Image className="h-8 w-8 text-blue-500" />;
  } else if (type.includes('word') || type.includes('doc')) {
    return <File className="h-8 w-8 text-blue-600" />;
  } else {
    return <File className="h-8 w-8 text-gray-500" />;
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function UploadPage() {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [caseId, setCaseId] = useState("");
  const [description, setDescription] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      addFiles(files);
    }
  };

  const addFiles = (files: File[]) => {
    const newUploadFiles: UploadFile[] = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      progress: 0,
      status: 'pending'
    }));
    
    setUploadFiles(prev => [...prev, ...newUploadFiles]);
  };

  const removeFile = (id: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== id));
  };

  const simulateUpload = async (uploadFile: UploadFile) => {
    // Simulate upload progress
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, progress, status: progress === 100 ? 'success' : 'uploading' }
          : f
      ));
    }
  };

  const handleUpload = async () => {
    if (!caseId || uploadFiles.length === 0) return;
    
    setIsUploading(true);
    
    // Start uploading all files
    const uploadPromises = uploadFiles
      .filter(f => f.status === 'pending')
      .map(uploadFile => simulateUpload(uploadFile));
    
    try {
      await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const clearCompleted = () => {
    setUploadFiles(prev => prev.filter(f => f.status !== 'success'));
  };

  const clearAll = () => {
    setUploadFiles([]);
    setCaseId("");
    setDescription("");
  };

  const pendingFiles = uploadFiles.filter(f => f.status === 'pending');
  const completedFiles = uploadFiles.filter(f => f.status === 'success');
  const failedFiles = uploadFiles.filter(f => f.status === 'error');

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">文档上传</h1>
            <p className="text-muted-foreground">上传案例相关文档和附件</p>
          </div>
          <div className="flex gap-2">
            {completedFiles.length > 0 && (
              <Button variant="outline" onClick={clearCompleted}>
                清除已完成
              </Button>
            )}
            <Button variant="outline" onClick={clearAll}>
              清除全部
            </Button>
          </div>
        </div>

        {/* Upload Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>上传配置</CardTitle>
            <CardDescription>
              设置文档上传的基本信息
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">关联案例 *</label>
                <Select value={caseId} onValueChange={setCaseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择案例" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASE-2024-001">CASE-2024-001 - 某银行违规放贷案</SelectItem>
                    <SelectItem value="CASE-2024-002">CASE-2024-002 - 金融机构反洗钱违规案</SelectItem>
                    <SelectItem value="CASE-2024-003">CASE-2024-003 - 支付机构违规案</SelectItem>
                    <SelectItem value="CASE-2024-004">CASE-2024-004 - 保险公司违规案</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">批次描述（可选）</label>
                <Textarea
                  placeholder="输入本次上传的文档描述..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* File Upload Area */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              文件上传区域
            </CardTitle>
            <CardDescription>
              支持拖拽上传或点击选择文件。支持 PDF、Word、图片等格式
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragOver 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 rounded-full bg-muted">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-lg font-medium">拖拽文件到此处或点击选择</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    支持 PDF、Word、图片等格式，单个文件最大 50MB
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" asChild>
                    <label className="cursor-pointer">
                      <FolderOpen className="h-4 w-4 mr-2" />
                      选择文件
                      <Input
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt,.xlsx,.xls"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload Queue */}
        {uploadFiles.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>上传队列 ({uploadFiles.length} 个文件)</span>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {completedFiles.length > 0 && (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                      已完成: {completedFiles.length}
                    </Badge>
                  )}
                  {failedFiles.length > 0 && (
                    <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                      失败: {failedFiles.length}
                    </Badge>
                  )}
                  {pendingFiles.length > 0 && (
                    <Badge variant="secondary">
                      等待: {pendingFiles.length}
                    </Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {uploadFiles.map((uploadFile) => (
                  <div key={uploadFile.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="flex-shrink-0">
                      {getFileIcon(uploadFile.file.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium truncate">{uploadFile.file.name}</p>
                        <div className="flex items-center gap-2">
                          {uploadFile.status === 'success' && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                          {uploadFile.status === 'error' && (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(uploadFile.id)}
                            disabled={uploadFile.status === 'uploading'}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(uploadFile.file.size)}
                        </p>
                        {uploadFile.status === 'uploading' && (
                          <div className="flex-1">
                            <Progress value={uploadFile.progress} className="h-2" />
                            <p className="text-xs text-muted-foreground mt-1">
                              {uploadFile.progress}% 已上传
                            </p>
                          </div>
                        )}
                        {uploadFile.status === 'success' && (
                          <p className="text-xs text-green-600 dark:text-green-400">上传成功</p>
                        )}
                        {uploadFile.status === 'error' && (
                          <p className="text-xs text-red-600 dark:text-red-400">
                            {uploadFile.error || '上传失败'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upload Actions */}
        {uploadFiles.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {pendingFiles.length > 0 ? (
                    `准备上传 ${pendingFiles.length} 个文件到案例 ${caseId || '(未选择)'}`
                  ) : (
                    `所有文件处理完成`
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleUpload}
                    disabled={!caseId || pendingFiles.length === 0 || isUploading}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    {isUploading ? '上传中...' : `开始上传 (${pendingFiles.length})`}
                  </Button>
                </div>
              </div>
              
              {!caseId && uploadFiles.length > 0 && (
                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    请先选择关联案例才能开始上传文件。
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}