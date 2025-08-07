"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText, Image, File, Download, Eye, Trash2, RefreshCw, Search } from "lucide-react";

// Mock data for documents
const mockDocuments = [
  {
    id: "DOC-001",
    filename: "案例报告_2024_001.pdf",
    fileType: "PDF",
    size: "2.5 MB",
    caseId: "CASE-2024-001",
    uploadDate: "2024-01-15",
    status: "已处理",
    ocrConfidence: 95,
    extractedText: "这是一份关于银行违规放贷的案例报告...",
    uploader: "张三"
  },
  {
    id: "DOC-002",
    filename: "证据材料_照片.jpg",
    fileType: "图片",
    size: "1.8 MB",
    caseId: "CASE-2024-001",
    uploadDate: "2024-01-16",
    status: "处理中",
    ocrConfidence: 88,
    extractedText: "银行内部文件截图，显示违规放贷记录...",
    uploader: "李四"
  },
  {
    id: "DOC-003",
    filename: "调查笔录.docx",
    fileType: "Word",
    size: "856 KB",
    caseId: "CASE-2024-002",
    uploadDate: "2024-01-18",
    status: "已处理",
    ocrConfidence: 98,
    extractedText: "调查人员对相关当事人的询问记录...",
    uploader: "王五"
  }
];

const statusColors = {
  "已处理": "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
  "处理中": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
  "处理失败": "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
  "等待处理": "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
};

const getFileIcon = (fileType: string) => {
  switch (fileType.toLowerCase()) {
    case "pdf":
      return <FileText className="h-4 w-4 text-red-500" />;
    case "图片":
    case "jpg":
    case "png":
    case "jpeg":
      return <Image className="h-4 w-4 text-blue-500" />;
    case "word":
    case "docx":
    case "doc":
      return <File className="h-4 w-4 text-blue-600" />;
    default:
      return <File className="h-4 w-4 text-gray-500" />;
  }
};

export default function DocumentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [documents, setDocuments] = useState(mockDocuments);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploadCaseId, setUploadCaseId] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.caseId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.extractedText.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
    const matchesType = typeFilter === "all" || doc.fileType === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(event.target.files);
  };

  const handleUploadSubmit = () => {
    if (selectedFiles && uploadCaseId) {
      // Mock upload functionality
      console.log("Uploading files:", selectedFiles, "to case:", uploadCaseId);
      setIsUploadDialogOpen(false);
      setSelectedFiles(null);
      setUploadCaseId("");
      setUploadDescription("");
    }
  };

  const handleDownload = (docId: string) => {
    console.log("Downloading document:", docId);
  };

  const handleView = (docId: string) => {
    console.log("Viewing document:", docId);
  };

  const handleDelete = (docId: string) => {
    console.log("Deleting document:", docId);
  };

  const handleReprocess = (docId: string) => {
    console.log("Reprocessing document:", docId);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">文档管理</h1>
            <p className="text-muted-foreground">管理案例相关文档和附件</p>
          </div>
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                上传文档
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>上传文档</DialogTitle>
                <DialogDescription>
                  选择要上传的文档文件
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">关联案例</label>
                  <Select value={uploadCaseId} onValueChange={setUploadCaseId}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择案例" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASE-2024-001">CASE-2024-001 - 某银行违规放贷案</SelectItem>
                      <SelectItem value="CASE-2024-002">CASE-2024-002 - 金融机构反洗钱违规案</SelectItem>
                      <SelectItem value="CASE-2024-003">CASE-2024-003 - 支付机构违规案</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">选择文件</label>
                  <Input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                    onChange={handleFileUpload}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">描述（可选）</label>
                  <Textarea
                    placeholder="输入文档描述..."
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={handleUploadSubmit} disabled={!selectedFiles || !uploadCaseId}>
                    上传
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Filter Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              搜索与筛选
            </CardTitle>
            <CardDescription>
              搜索文档名称、案例编号或提取的文本内容
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索文档名称、案例编号或内容..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有状态</SelectItem>
                    <SelectItem value="已处理">已处理</SelectItem>
                    <SelectItem value="处理中">处理中</SelectItem>
                    <SelectItem value="处理失败">处理失败</SelectItem>
                    <SelectItem value="等待处理">等待处理</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有类型</SelectItem>
                    <SelectItem value="PDF">PDF</SelectItem>
                    <SelectItem value="Word">Word</SelectItem>
                    <SelectItem value="图片">图片</SelectItem>
                    <SelectItem value="其他">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents Table */}
        <Card>
          <CardHeader>
            <CardTitle>文档列表</CardTitle>
            <CardDescription>
              找到 {filteredDocuments.length} 个文档
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>文件名</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>大小</TableHead>
                    <TableHead>关联案例</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>OCR置信度</TableHead>
                    <TableHead>上传日期</TableHead>
                    <TableHead>上传者</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getFileIcon(doc.fileType)}
                          <div>
                            <div className="font-medium">{doc.filename}</div>
                            <div className="text-sm text-muted-foreground truncate max-w-xs">
                              {doc.extractedText}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{doc.fileType}</TableCell>
                      <TableCell>{doc.size}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{doc.caseId}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[doc.status as keyof typeof statusColors]}>
                          {doc.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {doc.ocrConfidence ? (
                          <div className="flex items-center gap-1">
                            <div className="w-12 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${doc.ocrConfidence}%` }}
                              ></div>
                            </div>
                            <span className="text-sm">{doc.ocrConfidence}%</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{doc.uploadDate}</TableCell>
                      <TableCell>{doc.uploader}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(doc.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(doc.id)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReprocess(doc.id)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(doc.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}