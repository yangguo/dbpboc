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
import { config } from "@/lib/config";

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
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'ready';
  content?: string;
  extractedData?: Record<string, any>[];
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
  const [sofficeMode, setSofficeMode] = useState(false);
  const [llmOcrMode, setLlmOcrMode] = useState(false);
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
      const response = await fetch(`${config.backendUrl}/api/v1/attachments/attachment-text-list/${selectedOrg}`);
      if (!response.ok) {
        throw new Error('Failed to fetch attachment list');
      }
      const attachmentList = await response.json();
      setFiles(attachmentList);
      setSelectedFiles(attachmentList.map((_: FileItem, index: number) => index));
    } catch (error) {
      console.error("Failed to load files:", error);
      // Fallback to mock data for development
      setFiles(mockFiles);
      setSelectedFiles(mockFiles.map((_, index) => index));
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
      failed: { label: '失败', className: 'bg-red-100 text-red-800' },
      ready: { label: '就绪', className: 'bg-yellow-100 text-yellow-800' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) {
      return (
        <Badge className="bg-gray-100 text-gray-800">
          未知状态
        </Badge>
      );
    }
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

  const processFiles = async () => {
    if (!selectedOrg || selectedFiles.length === 0) return;
    
    setIsProcessing(true);
    const filesToProcess = batchMode 
      ? files.filter((_, index) => selectedFiles.includes(index))
      : [files[selectedFiles[0]]];
    
    try {
      // Update status to processing for selected files
      const fileIds = filesToProcess.map(f => f.id);
      setFiles(prev => prev.map(f => 
        fileIds.includes(f.id) 
          ? { ...f, status: 'processing' }
          : f
      ));

      // Call backend API to extract text
      const response = await fetch(`${config.backendUrl}/api/v1/attachments/extract-text/${selectedOrg}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attachment_ids: fileIds,
          extract_all: false,
          use_soffice: sofficeMode,
          use_llm_ocr: llmOcrMode
        })
      });

      if (!response.ok) {
        throw new Error('Failed to extract text from files');
      }

      const result = await response.json();
      const extractedFiles = result.results || [];
      
      // Update files with extraction results
      setFiles(prev => prev.map(f => {
        const extractedFile = extractedFiles.find((ef: FileItem & { content?: string }) => ef.id === f.id);
        if (extractedFile) {
          return {
            ...f,
            status: extractedFile.status,
            content: extractedFile.content,
            errorMessage: extractedFile.errorMessage,
            extractedData: extractedFile.content ? [{
              "文件名": extractedFile.fileName,
              "文件类型": extractedFile.fileType,
              "提取内容": extractedFile.content.substring(0, 100) + (extractedFile.content.length > 100 ? '...' : ''),
              "完整内容长度": extractedFile.content.length
            }] : undefined
          };
        }
        return f;
      }));

      // Prepare results for display
      const results = extractedFiles
        .filter((ef: FileItem & { content?: string }) => ef.status === 'completed' && ef.content)
        .map((ef: FileItem & { content?: string }) => ({
           "文件名": ef.fileName,
           "文件类型": ef.fileType,
           "链接": ef.link,
           "提取内容": ef.content ? ef.content.substring(0, 200) + (ef.content.length > 200 ? '...' : '') : '',
           "完整内容长度": ef.content ? ef.content.length : 0,
           "完整内容": ef.content || ''
         }));
      
      setExtractedResults(results);

    } catch (error) {
      console.error('Error processing files:', error);
      // Mark all processing files as failed
      const fileIds = filesToProcess.map(f => f.id);
      setFiles(prev => prev.map(f => 
        fileIds.includes(f.id) 
          ? { ...f, status: 'failed', errorMessage: 'Processing failed' }
          : f
      ));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveResults = async () => {
    if (extractedResults.length === 0) {
      console.log('没有可保存的结果');
      return;
    }

    try {
      // Prepare data for saving - include content field
      const dataToSave = files
        .filter(f => f.status === 'completed' && f.content)
        .map(f => ({
          id: f.id,
          fileName: f.fileName,
          fileType: f.fileType,
          link: f.link,
          filePath: f.filePath,
          content: f.content,
          status: f.status
        }));

      // Call backend API to save as pboctotable
      const response = await fetch(`${config.backendUrl}/api/v1/attachments/save-text-results/${selectedOrg}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSave)
      });

      if (!response.ok) {
        throw new Error('Failed to save results');
      }

      const result = await response.json();
      console.log(`结果已成功保存为pboctotable文件: ${result.filename}`);

    } catch (error) {
      console.error('Error saving results:', error);
      console.error('保存结果时出错，请重试');
    }
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
                    onCheckedChange={(checked) => setBatchMode(checked === true)}
                  />
                  <label htmlFor="batchMode" className="text-sm font-medium">批量处理</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="pdfMode" 
                    checked={pdfMode}
                    onCheckedChange={(checked) => setPdfMode(checked === true)}
                  />
                  <label htmlFor="pdfMode" className="text-sm font-medium">PDF模式</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="halfMode" 
                    checked={halfMode}
                    onCheckedChange={(checked) => setHalfMode(checked === true)}
                  />
                  <label htmlFor="halfMode" className="text-sm font-medium">半页模式</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="sofficeMode" 
                    checked={sofficeMode}
                    onCheckedChange={(checked) => setSofficeMode(checked === true)}
                  />
                  <label htmlFor="sofficeMode" className="text-sm font-medium">soffice转PDF</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="llmOcrMode" 
                    checked={llmOcrMode}
                    onCheckedChange={(checked) => setLlmOcrMode(checked === true)}
                  />
                  <label htmlFor="llmOcrMode" className="text-sm font-medium">LLM OCR模式</label>
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
                  onClick={() => processFiles()}
                  disabled={isProcessing || selectedFiles.length === 0}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <FileText className="h-4 w-4" />
                  {isProcessing ? '处理中...' : '读取文件'}
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
                            className="w-5 h-5 border-2 border-blue-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                          />
                        </TableHead>
                        <TableHead>索引</TableHead>
                        <TableHead>文件名</TableHead>
                        <TableHead>类型</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>提取内容</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {files.map((file, index) => (
                        <TableRow 
                          key={file.id || `file-${index}`}
                        >
                          <TableCell>
                            <Checkbox 
                              checked={selectedFiles.includes(index)}
                              onCheckedChange={(checked) => handleFileSelection(index, checked as boolean)}
                              className="w-5 h-5 border-2 border-blue-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
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
                            {file.content ? (
                              <div className="max-w-xs">
                                <div 
                                  className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-20 cursor-help relative group"
                                  title={file.content}
                                >
                                  <div className="font-medium text-gray-700 mb-1">提取的文本内容:</div>
                                  <div className="text-gray-600">
                                    {file.content.length > 100 
                                      ? `${file.content.substring(0, 100)}...` 
                                      : file.content
                                    }
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    总长度: {file.content.length} 字符
                                  </div>
                                  
                                  {/* Custom tooltip */}
                                  <div className="absolute left-0 top-full mt-2 p-3 bg-gray-900 text-white text-xs rounded-md shadow-lg max-w-md max-h-60 overflow-auto z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-pre-wrap">
                                    <div className="font-medium mb-2">完整提取内容:</div>
                                    {file.content}
                                  </div>
                                </div>
                              </div>
                            ) : file.extractedData ? (
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
                <Button 
                  onClick={handleSaveResults} 
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white border-green-600 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
                >
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
                      {extractedResults.length > 0 && Object.keys(extractedResults[0]).filter(key => key != null).map((key, i) => (
                        <TableHead key={`${key || 'unknown'}-${i}`}>{key}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {extractedResults.map((row, index) => (
                      <TableRow key={`extracted-result-${index}`}>
                        {Object.entries(row).map(([key, value], cellIndex) => (
                          <TableCell key={`cell-${index}-${key || cellIndex}`}>
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
