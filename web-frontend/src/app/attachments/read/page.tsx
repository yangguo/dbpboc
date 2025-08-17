"use client";

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  FileText, 
  Image, 
  File, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  FileSpreadsheet,
  Settings,
  Eye,
  Download
} from "lucide-react";

// City list from the original code
const cityList = [
  "天津", "重庆", "上海", "兰州", "拉萨", "西宁", "乌鲁木齐", "南宁", "贵阳", 
  "福州", "成都", "呼和浩特", "郑州", "北京", "合肥", "厦门", "海口", "大连", 
  "广州", "太原", "石家庄", "总部", "昆明", "青岛", "沈阳", "长沙", "深圳", 
  "武汉", "银川", "西安", "哈尔滨", "长春", "宁波", "杭州", "南京", "济南", "南昌"
];

interface FileItem {
  id: string;
  fileName: string;
  fileType: string;
  link: string;
  filePath: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  extractedData?: any[];
  errorMessage?: string;
}

export default function AttachmentReadPage() {
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchMode, setBatchMode] = useState(true);
  const [pdfMode, setPdfMode] = useState(false);
  const [halfMode, setHalfMode] = useState(false);
  const [startIndex, setStartIndex] = useState(0);
  const [endIndex, setEndIndex] = useState(10);
  const [extractedResults, setExtractedResults] = useState<any[]>([]);

  // Mock data for demonstration
  const mockFiles: FileItem[] = [
    {
      id: "1",
      fileName: "penalty_list_001.xlsx",
      fileType: "excel",
      link: "http://beijing.pbc.gov.cn/case/001",
      filePath: "/temp/beijing/penalty_list_001.xlsx",
      status: 'pending'
    },
    {
      id: "2", 
      fileName: "penalty_document_002.pdf",
      fileType: "pdf",
      link: "http://beijing.pbc.gov.cn/case/002",
      filePath: "/temp/beijing/penalty_document_002.pdf",
      status: 'pending'
    },
    {
      id: "3",
      fileName: "penalty_notice_003.docx",
      fileType: "word",
      link: "http://beijing.pbc.gov.cn/case/003",
      filePath: "/temp/beijing/penalty_notice_003.docx",
      status: 'completed',
      extractedData: [
        { "序号": 1, "企业名称": "某银行", "处罚决定书文号": "京银罚字[2024]001号" },
        { "序号": 2, "企业名称": "某金融公司", "处罚决定书文号": "京银罚字[2024]002号" }
      ]
    },
    {
      id: "4",
      fileName: "penalty_image_004.jpg",
      fileType: "image",
      link: "http://beijing.pbc.gov.cn/case/004",
      filePath: "/temp/beijing/penalty_image_004.jpg",
      status: 'pending'
    }
  ];

  useEffect(() => {
    if (selectedOrg) {
      loadFileList();
    }
  }, [selectedOrg]);

  const loadFileList = async () => {
    setIsLoading(true);
    try {
      // Simulate API call to get file list
      await new Promise(resolve => setTimeout(resolve, 1000));
      setFiles(mockFiles);
      setSelectedFiles(mockFiles.map((_, index) => index));
    } catch (error) {
      console.error("Failed to load files:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case "excel":
      case "xls":
      case "xlsx":
        return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
      case "pdf":
        return <FileText className="h-4 w-4 text-red-500" />;
      case "word":
      case "docx":
      case "doc":
        return <File className="h-4 w-4 text-blue-600" />;
      case "image":
      case "jpg":
      case "png":
      case "jpeg":
        return <Image className="h-4 w-4 text-purple-500" />;
      default:
        return <File className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: '待处理', className: 'bg-gray-100 text-gray-800' },
      processing: { label: '处理中', className: 'bg-blue-100 text-blue-800' },
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

  const handleFileSelection = (index: number, checked: boolean) => {
    if (checked) {
      setSelectedFiles(prev => [...prev, index]);
    } else {
      setSelectedFiles(prev => prev.filter(i => i !== index));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFiles(files.map((_, index) => index));
    } else {
      setSelectedFiles([]);
    }
  };

  const processFiles = async (fileType: string) => {
    if (!selectedOrg || selectedFiles.length === 0) return;
    
    setIsProcessing(true);
    const filesToProcess = batchMode 
      ? files.slice(startIndex, endIndex).filter((_, index) => selectedFiles.includes(startIndex + index))
      : [files[selectedFiles[0]]];
    
    const results: any[] = [];
    
    for (const file of filesToProcess) {
      // Update status to processing
      setFiles(prev => prev.map(f => 
        f.id === file.id 
          ? { ...f, status: 'processing' }
          : f
      ));

      try {
        // Simulate file processing based on type
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        let extractedData: any[] = [];
        
        switch (fileType) {
          case 'excel':
            if (file.fileType === 'excel') {
              extractedData = [
                { "序号": 1, "企业名称": "测试银行A", "处罚决定书文号": "测试文号001" },
                { "序号": 2, "企业名称": "测试银行B", "处罚决定书文号": "测试文号002" }
              ];
            }
            break;
          case 'pdf':
            if (file.fileType === 'pdf') {
              extractedData = [
                { "内容": "PDF提取的处罚决定书内容...", "页码": 1 }
              ];
            }
            break;
          case 'word':
            if (file.fileType === 'word') {
              extractedData = [
                { "段落": "Word文档提取的处罚内容...", "序号": 1 }
              ];
            }
            break;
          case 'image':
            if (file.fileType === 'image') {
              extractedData = [
                { "OCR文本": "图片识别的处罚决定书文字...", "置信度": "95%" }
              ];
            }
            break;
        }

        // Mark as completed
        setFiles(prev => prev.map(f => 
          f.id === file.id 
            ? { ...f, status: 'completed', extractedData }
            : f
        ));

        if (extractedData.length > 0) {
          results.push(...extractedData.map(item => ({ ...item, file: file.fileName, link: file.link })));
        }

      } catch (error) {
        // Mark as failed
        setFiles(prev => prev.map(f => 
          f.id === file.id 
            ? { ...f, status: 'failed', errorMessage: 'Processing failed' }
            : f
        ));
      }
    }
    
    setExtractedResults(results);
    setIsProcessing(false);
  };

  const handleSaveResults = () => {
    if (extractedResults.length === 0) return;
    
    // Convert to CSV format
    const headers = Object.keys(extractedResults[0]);
    const csvContent = [
      headers.join(','),
      ...extractedResults.map(row => 
        headers.map(header => `"${row[header] || ''}"`).join(',')
      )
    ].join('\n');
    
    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `extracted_data_${selectedOrg}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">附件读取</h1>
            <p className="text-muted-foreground">读取和提取附件文件内容</p>
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
                    {cityList.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={loadFileList}
                disabled={!selectedOrg || isLoading}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                加载文件列表
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Processing Options */}
        {selectedOrg && files.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>处理选项</CardTitle>
              <CardDescription>
                配置文件处理参数
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-center">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="batchMode" 
                    checked={batchMode}
                    onCheckedChange={setBatchMode}
                  />
                  <label htmlFor="batchMode" className="text-sm font-medium">批量处理</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="pdfMode" 
                    checked={pdfMode}
                    onCheckedChange={setPdfMode}
                  />
                  <label htmlFor="pdfMode" className="text-sm font-medium">PDF模式</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="halfMode" 
                    checked={halfMode}
                    onCheckedChange={setHalfMode}
                  />
                  <label htmlFor="halfMode" className="text-sm font-medium">半页模式</label>
                </div>
              </div>
              
              {batchMode && (
                <div className="flex gap-4 items-end">
                  <div>
                    <label className="text-sm font-medium">开始索引</label>
                    <Input
                      type="number"
                      value={startIndex}
                      onChange={(e) => setStartIndex(Number(e.target.value))}
                      min={0}
                      max={files.length - 1}
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
                      max={files.length}
                      className="w-32"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">
                      将处理 {Math.max(0, endIndex - startIndex)} 个文件
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={() => processFiles('excel')}
                  disabled={isProcessing || selectedFiles.length === 0}
                  className="flex items-center gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  读取Excel文件
                </Button>
                <Button 
                  onClick={() => processFiles('pdf')}
                  disabled={isProcessing || selectedFiles.length === 0}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  读取PDF文件
                </Button>
                <Button 
                  onClick={() => processFiles('word')}
                  disabled={isProcessing || selectedFiles.length === 0}
                  className="flex items-center gap-2"
                >
                  <File className="h-4 w-4" />
                  读取Word文件
                </Button>
                <Button 
                  onClick={() => processFiles('image')}
                  disabled={isProcessing || selectedFiles.length === 0}
                  className="flex items-center gap-2"
                >
                  <Image className="h-4 w-4" />
                  读取图片文件
                </Button>
              </div>
              
              {isProcessing && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    正在处理文件，请勿关闭页面...
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Files List */}
        {selectedOrg && (
          <Card>
            <CardHeader>
              <CardTitle>文件列表</CardTitle>
              <CardDescription>
                {selectedOrg} - 共 {files.length} 个文件，已选择 {selectedFiles.length} 个
              </CardDescription>
            </CardHeader>
            <CardContent>
              {files.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {isLoading ? "加载中..." : "暂无文件数据"}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <Checkbox 
                            checked={selectedFiles.length === files.length}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead>索引</TableHead>
                        <TableHead>文件名</TableHead>
                        <TableHead>类型</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>提取结果</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {files.map((file, index) => (
                        <TableRow key={file.id}>
                          <TableCell>
                            <Checkbox 
                              checked={selectedFiles.includes(index)}
                              onCheckedChange={(checked) => handleFileSelection(index, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell>{index}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getFileIcon(file.fileType)}
                              <span className="font-medium">{file.fileName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{file.fileType}</Badge>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(file.status)}
                          </TableCell>
                          <TableCell>
                            {file.extractedData ? (
                              <span className="text-sm text-green-600">
                                {file.extractedData.length} 条记录
                              </span>
                            ) : file.status === 'failed' ? (
                              <span className="text-sm text-red-600">提取失败</span>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(file.link, '_blank')}
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

        {/* Extracted Results */}
        {extractedResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>提取结果</span>
                <Button onClick={handleSaveResults} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  保存结果
                </Button>
              </CardTitle>
              <CardDescription>
                共提取 {extractedResults.length} 条记录
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {extractedResults.length > 0 && Object.keys(extractedResults[0]).map((key) => (
                        <TableHead key={key}>{key}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {extractedResults.map((row, index) => (
                      <TableRow key={index}>
                        {Object.values(row).map((value, cellIndex) => (
                          <TableCell key={cellIndex}>
                            <div className="max-w-xs truncate">
                              {String(value)}
                            </div>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}