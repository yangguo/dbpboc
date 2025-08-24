"use client";

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { config } from "@/lib/config";
import { 
  RefreshCw, 
  AlertCircle, 
  Settings,
  Play,
  CheckSquare,
  Square,
  Download
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// City list for organization selection
const cityList = [
  "天津", "重庆", "上海", "兰州", "拉萨", "西宁", "乌鲁木齐", "南宁", "贵阳", 
  "福州", "成都", "呼和浩特", "郑州", "北京", "合肥", "厦门", "海口", "大连", 
  "广州", "太原", "石家庄", "总部", "昆明", "青岛", "沈阳", "长沙", "深圳", 
  "武汉", "银川", "西安", "哈尔滨", "长春", "宁波", "杭州", "南京", "济南", "南昌"
];

interface ProcessedData {
  id: string;
  [key: string]: any;
}

interface ExtractedInfo {
  id: string;
  // 后端原始字段
  行政处罚决定书文号?: string;
  // 前端规范化字段
  决定书文号?: string;
  被处罚当事人?: string;
  主要违法违规事实?: string;
  行政处罚依据?: string;
  行政处罚决定?: string;
  作出处罚决定的机关名称?: string;
  作出处罚决定的日期?: string;
  行业?: string;
  罚没总金额?: string;
  违规类型?: string;
  监管地区?: string;
  link?: string;
}

const defaultColumns = [
  "序号",
  "企业名称", 
  "处罚决定书文号",
  "违法行为类型",
  "行政处罚内容",
  "作出行政处罚决定机关名称",
  "作出行政处罚决定日期",
  "备注",
  "link",
  "content"
];

export default function AttachmentProcessPage() {
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [processedData, setProcessedData] = useState<ProcessedData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedResults, setExtractedResults] = useState<ExtractedInfo[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [isLoadingRef, setIsLoadingRef] = useState(false);

  useEffect(() => {
    if (selectedOrg && !isLoadingRef) {
      loadProcessedData();
    }
  }, [selectedOrg]);

  const loadProcessedData = async () => {
    if (isLoadingRef) {
      console.log('loadProcessedData already in progress, skipping');
      return;
    }
    console.log('loadProcessedData called for org:', selectedOrg);
    setIsLoadingRef(true);
    setIsLoading(true);
    try {
      const response = await fetch(`${config.backendUrl}/api/v1/attachments/processed-data/${encodeURIComponent(selectedOrg)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Raw API data length:', data.length);
      console.log('Raw API data sample:', data.slice(0, 3));
      
      // Transform the API response: extract data from each ProcessedDataItem
      const transformedData = data.map((item: any, index: number) => ({
        ...item.data, // Spread data first
        id: item.id ? `${selectedOrg}-${item.id}` : `${selectedOrg}-fallback-${index}`, // Then override with our composite ID
        originalId: item.id,
        backendId: item.id, // Keep the original backend ID
        dataId: item.data?.id // Keep the original data.id if it exists
      }));
      
      console.log('Transformed data length:', transformedData.length);
      console.log('Transformed data sample:', transformedData.slice(0, 3).map((item: any) => ({id: item.id, originalId: item.originalId})));
      
      // Check for duplicate IDs in transformed data
      const ids = transformedData.map((item: any) => item.id);
      const idCounts = ids.reduce((acc: any, id: any) => {
        acc[id] = (acc[id] || 0) + 1;
        return acc;
      }, {});
      const duplicateIds = Object.keys(idCounts).filter(id => idCounts[id] > 1);
      if (duplicateIds.length > 0) {
        console.error('Duplicate IDs found in transformed data:', duplicateIds);
        console.error('ID counts:', idCounts);
      }
      
      // Check for duplicate original IDs in raw data
      const originalIds = data.map((item: any) => item.id).filter(Boolean);
      const originalIdCounts = originalIds.reduce((acc: any, id: any) => {
        acc[id] = (acc[id] || 0) + 1;
        return acc;
      }, {});
      const duplicateOriginalIds = Object.keys(originalIdCounts).filter(id => originalIdCounts[id] > 1);
      if (duplicateOriginalIds.length > 0) {
        console.error('Duplicate original IDs found in raw data:', duplicateOriginalIds);
        console.error('Original ID counts:', originalIdCounts);
      }
      
      console.log('Setting processedData with', transformedData.length, 'items');
      setProcessedData(transformedData);
    } catch (error) {
      console.error("Failed to load processed data:", error);
      // Set empty data if API fails
      setProcessedData([]);
    } finally {
      setIsLoading(false);
      setIsLoadingRef(false);
    }
    // Reset selections when loading new data
    setSelectedRecords(new Set());
    setExtractedResults([]);
  };

  const toggleRecordSelection = (recordId: string) => {
    console.log('toggleRecordSelection called with recordId:', recordId);
    console.log('current selectedRecords:', Array.from(selectedRecords));
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(recordId)) {
      console.log('removing recordId:', recordId);
      newSelected.delete(recordId);
    } else {
      console.log('adding recordId:', recordId);
      newSelected.add(recordId);
    }
    console.log('new selectedRecords:', Array.from(newSelected));
    setSelectedRecords(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedRecords.size === processedData.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(processedData.map(row => row.id)));
    }
  };

  const extractPenaltyInfo = async (text: string, link?: string, runId?: string, reset?: boolean): Promise<any> => {
    try {
      const response = await fetch(`${config.backendUrl}/api/v1/cases/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: '', // 后端已有完整的提示词逻辑
          text: text,
          link: link || null,
          runId: runId || null,
          reset: !!reset
        })
      });
      
      if (!response.ok) {
        throw new Error('LLM API request failed');
      }
      
      const result = await response.json();
      return {
        success: result.success,
        data: result.data
      };
    } catch (error) {
      console.error('LLM extraction failed:', error);
      return {
        success: false,
        error: `LLM分析失败: ${error}`,
        data: {
          行政处罚决定书文号: '',
          被处罚当事人: '',
          主要违法违规事实: '',
          行政处罚依据: '',
          行政处罚决定: '',
          作出处罚决定的机关名称: '',
          作出处罚决定的日期: '',
          行业: '',
          罚没总金额: '0',
          违规类型: '',
          监管地区: ''
        }
      };
    }
  };

  const handleProcessSelected = async () => {
    if (selectedRecords.size === 0) {
      alert('请先选择要处理的记录');
      return;
    }
    
    setIsProcessing(true);
    // 生成一次运行的ID，用于后端快照分隔
    const currentRunId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const results: ExtractedInfo[] = [];
    
    try {
      const pick = (obj: any, ...keys: string[]): string => {
        for (const k of keys) {
          const v = obj?.[k];
          if (v !== undefined && v !== null) {
            const s = String(v).trim();
            if (s !== '') return s;
          }
        }
        return '';
      };

      const normalizeRow = (raw: any, id: string, originalRecord?: any): ExtractedInfo => {
         // 调试：输出原始数据的所有字段
         console.log('原始数据字段:', Object.keys(raw));
         console.log('原始数据内容:', raw);
         console.log('原始记录数据:', originalRecord);
         
         const result = {
        id,
        // 后端字段，与后端保持完全一致
        行政处罚决定书文号: pick(raw, '行政处罚决定书文号'),
        被处罚当事人: pick(raw, '被处罚当事人'),
        主要违法违规事实: pick(raw, '主要违法违规事实'),
        行政处罚依据: pick(raw, '行政处罚依据'),
        行政处罚决定: pick(raw, '行政处罚决定'),
        作出处罚决定的机关名称: pick(raw, '作出处罚决定的机关名称'),
        作出处罚决定的日期: pick(raw, '作出处罚决定的日期'),
        行业: pick(raw, '行业'),
        罚没总金额: pick(raw, '罚没总金额'),
        违规类型: pick(raw, '违规类型'),
        监管地区: pick(raw, '监管地区'),
        // 从原始pboctotable记录中获取link字段
        link: originalRecord ? pick(originalRecord, 'link') : pick(raw, 'link')
      };
      
      console.log('规范化后的行政处罚决定书文号:', result.行政处罚决定书文号);
      console.log('从pboctotable获取的link:', result.link);
      return result;
      };
      let i = 0;
      for (const recordId of selectedRecords) {
        const record = processedData.find(r => r.id === recordId);
        if (record && record.content) {
          const extractResult = await extractPenaltyInfo(record.content, record.link, currentRunId, i === 0);
          console.log('原始提取结果:', extractResult);
          i++;
          
          // 处理新的数据结构：data.items 是数组
          if (extractResult.success && extractResult.data) {
            if (Array.isArray(extractResult.data)) {
              // 如果data直接是数组
              extractResult.data.forEach((item: any, index: number) => {
                console.log('处理数组项:', item);
                results.push(normalizeRow(item, `${record.originalId || recordId}-${index}`, record));
              });
            } else if (extractResult.data.items && Array.isArray(extractResult.data.items)) {
              // 如果有items数组
              extractResult.data.items.forEach((item: any, index: number) => {
                console.log('处理items项:', item);
                results.push(normalizeRow(item, `${record.originalId || recordId}-${index}`, record));
              });
            } else {
              // 单个对象格式
              console.log('处理单个对象:', extractResult.data);
              results.push(normalizeRow(extractResult.data, record.originalId || recordId, record));
            }
          }
        }
      }
      
      setExtractedResults(results);
      console.log('最终结果:', results);
      console.log('第一条结果的所有字段:', results[0] ? Object.keys(results[0]) : '无结果');
      
      // 详细输出第一条记录的所有字段值
      if (results[0]) {
        console.log('=== 第一条记录详细信息（使用后端字段）===');
        console.log('行政处罚决定书文号:', results[0]['行政处罚决定书文号']);
        console.log('作出处罚决定的机关名称:', results[0]['作出处罚决定的机关名称']);
        console.log('行业:', results[0]['行业']);
        console.log('违规类型:', results[0]['违规类型']);
        console.log('完整对象:', JSON.stringify(results[0], null, 2));
      }
    } catch (error) {
      console.error('Processing failed:', error);
      setToast({message: '处理过程中发生错误，请重试', type: 'error'});
      setTimeout(() => setToast(null), 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveResults = async () => {
    if (extractedResults.length === 0) {
      setToast({message: '没有可保存的结果', type: 'error'});
      setTimeout(() => setToast(null), 3000);
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`${config.backendUrl}/api/v1/attachments/save-extracted-data/${encodeURIComponent(selectedOrg)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: extractedResults,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save extracted data');
      }

      const result = await response.json();
      setToast({message: `结果已成功保存: ${result.filename || '已保存'}`, type: 'success'});
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error('Error saving results:', error);
      setToast({message: '保存结果时出错，请重试', type: 'error'});
      setTimeout(() => setToast(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const exportToCSV = () => {
    if (extractedResults.length === 0) {
      alert('没有可导出的数据');
      return;
    }

    const headers = [
      '记录ID', '行政处罚决定书文号', '被处罚当事人', '主要违法违规事实', '行政处罚依据',
      '行政处罚决定', '作出处罚决定的机关名称', '作出处罚决定的日期', '行业',
      '罚没总金额', '违规类型', '监管地区', 'link'
    ];

    const csvContent = [
      headers.join(','),
      ...extractedResults.map(result => [
        result.id,
        `"${((result['行政处罚决定书文号'] || '') as string).replace(/"/g, '""')}"`,
        `"${((result.被处罚当事人 || '') as string).replace(/"/g, '""')}"`,
        `"${((result.主要违法违规事实 || '') as string).replace(/"/g, '""')}"`,
        `"${((result.行政处罚依据 || '') as string).replace(/"/g, '""')}"`,
        `"${((result.行政处罚决定 || '') as string).replace(/"/g, '""')}"`,
        `"${((result['作出处罚决定的机关名称'] || '') as string).replace(/"/g, '""')}"`,
        `"${((result.作出处罚决定的日期 || '') as string).replace(/"/g, '""')}"`,
        `"${((result['行业'] || '') as string).replace(/"/g, '""')}"`,
        (result['罚没总金额'] || '0') as string,
        `"${((result['违规类型'] || '') as string).replace(/"/g, '""')}"`,
        `"${((result['监管地区'] || '') as string).replace(/"/g, '""')}"`,
        `"${((result.link || '') as string).replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `penalty_data_${selectedOrg}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = processedData.length > 0 ? ['序号', ...Object.keys(processedData[0]).filter(key => key !== 'id' && (key === 'link' || key === 'content'))] : ['序号'];

  return (
    <MainLayout>
      <div className="space-y-6 w-full max-w-none">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">内容处理</h1>
            <p className="text-muted-foreground">
              查看处理后的数据表格
            </p>
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
              选择要查看数据的PBOC机构
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
                onClick={loadProcessedData}
                disabled={!selectedOrg || isLoading}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                重新读取表格
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Data Display */}
        {selectedOrg && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>数据表格</CardTitle>
                  <CardDescription>
                    {processedData.length > 0 ? `共 ${processedData.length} 条记录，已选择 ${selectedRecords.size} 条` : '暂无数据'}
                  </CardDescription>
                </div>
                {processedData.length > 0 && (
                  <Button 
                    onClick={handleProcessSelected}
                    disabled={selectedRecords.size === 0 || isProcessing}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    {isProcessing ? '处理中...' : '处理选中记录'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                  <span>加载中...</span>
                </div>
              ) : processedData.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    未找到处理后的数据。请确保已选择正确的机构。
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16 text-center">
                          <button
                            onClick={toggleSelectAll}
                            className="flex items-center justify-center w-full"
                          >
                            {selectedRecords.size === processedData.length ? (
                              <CheckSquare className="h-4 w-4" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </button>
                        </TableHead>
                        {columns.map((col) => (
                          <TableHead 
                            key={col} 
                            className={`
                              ${col === '序号' ? 'w-16 text-center' : ''}
                              ${col === 'link' ? 'min-w-48' : ''}
                              ${col === 'content' ? 'w-64 max-w-xs' : ''}
                              ${col !== 'link' && col !== 'content' && col !== '序号' ? 'min-w-32' : ''}
                            `}
                          >
                            {col}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {processedData.map((row, rowIndex) => (
                        <TableRow 
                          key={`${selectedOrg}-${row.id}-${rowIndex}`}
                        > 
                          <TableCell className="text-center">
                            <button
                              onClick={() => toggleRecordSelection(row.id)}
                              className="flex items-center justify-center w-full"
                            >
                              {selectedRecords.has(row.id) ? (
                                <CheckSquare className="h-4 w-4" />
                              ) : (
                                <Square className="h-4 w-4" />
                              )}
                            </button>
                          </TableCell>
                          {columns.map((col) => (
                            <TableCell key={col}>
                              <div className="cursor-default p-1 rounded min-h-8 flex items-center">
                                {col === '序号' ? (
                                  <span className="w-full text-center font-medium flex justify-center">
                                    {rowIndex + 1}
                                  </span>
                                ) : col === 'link' ? (
                                  <a 
                                    href={String(row[col] || '')} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 underline truncate max-w-xs"
                                  >
                                    {String(row[col] || '')}
                                  </a>
                                ) : col === 'content' ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="block truncate cursor-help max-w-xs text-sm leading-relaxed">
                                          {String(row[col] || '')}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-6xl max-h-screen overflow-y-auto whitespace-normal break-words leading-relaxed min-w-80">
                                        <p>{String(row[col] || '')}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : (
                                  <span className="truncate max-w-xs">
                                    {String(row[col] || '')}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Extracted Results Display */}
        {extractedResults.length > 0 && (
          <Card className="mt-6 w-full">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>提取结果</CardTitle>
                  <CardDescription>
                    共提取 {extractedResults.length} 条记录的信息
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={exportToCSV}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    导出CSV
                  </Button>
                  <Button 
                    onClick={handleSaveResults}
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-md shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    {isSaving ? '保存中...' : '保存结果'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Detailed Table */}
              <div className="overflow-x-auto w-full">
                <div className="min-w-[1800px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px] text-center">序号</TableHead>
                        <TableHead className="w-[180px]">行政处罚决定书文号</TableHead>
                        <TableHead className="w-[160px]">被处罚当事人</TableHead>
                        <TableHead className="w-[320px]">主要违法违规事实</TableHead>
                        <TableHead className="w-[220px]">行政处罚依据</TableHead>
                        <TableHead className="w-[170px]">行政处罚决定</TableHead>
                        <TableHead className="w-[200px]">作出处罚决定的机关名称</TableHead>
                        <TableHead className="w-[140px] text-center">作出处罚决定的日期</TableHead>
                        <TableHead className="w-[120px] text-center">行业</TableHead>
                        <TableHead className="w-[140px] text-right">罚没总金额</TableHead>
                        <TableHead className="w-[180px] text-center">违规类型</TableHead>
                        <TableHead className="w-[120px] text-center">监管地区</TableHead>
                        <TableHead className="w-[200px] text-center">链接</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {extractedResults.map((result, index) => (
                      <TableRow key={`result-${result.id || `idx-${index}`}`} className="hover:bg-muted/50">
                        <TableCell className="text-center font-medium whitespace-nowrap">
                          {index + 1}
                        </TableCell>
                        <TableCell className="w-[180px]">
                           <div className="break-words leading-relaxed" title={(result['决定书文号'] || result['行政处罚决定书文号']) as string}>
                             {result['决定书文号'] || result['行政处罚决定书文号'] || '-'}
                           </div>
                         </TableCell>
                        <TableCell className="w-[160px]">
                          <div className="break-words leading-relaxed font-medium" title={result['被处罚当事人']}>
                            {result['被处罚当事人'] || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="w-[320px]">
                          <div className="break-words leading-relaxed" title={result['主要违法违规事实']}>
                            {result['主要违法违规事实'] ? (
                              <ul className="list-disc pl-5">
                                {(result['主要违法违规事实'] || '').split('；').filter((fact: string) => fact.trim()).map((fact: string, factIndex: number) => (
                                  <li key={`fact-${index}-${factIndex}`}>{fact}</li>
                                ))}
                              </ul>
                            ) : (
                              '-'
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="w-[220px]">
                          <div className="break-words leading-relaxed" title={result['行政处罚依据']}>
                            {result['行政处罚依据'] || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="w-[170px]">
                          <div className="break-words leading-relaxed" title={result['行政处罚决定']}>
                            {result['行政处罚决定'] || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="w-[200px]">
                          <div className="break-words leading-relaxed" title={result['作出处罚决定的机关名称']}>
                            {result['作出处罚决定的机关名称'] || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="w-[140px] text-center">
                          <div className="font-medium whitespace-nowrap" title={result['作出处罚决定的日期']}>
                            {result['作出处罚决定的日期'] || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="w-[120px] text-center">
                          <div className="break-words leading-relaxed" title={result['行业']}>
                            {result['行业'] || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="w-[140px] text-right">
                          <div className="font-semibold text-destructive whitespace-nowrap">
                            {result['罚没总金额'] && result['罚没总金额'] !== '0' ? 
                              `¥${Number(result['罚没总金额']).toLocaleString()}` : '-'
                            }
                          </div>
                        </TableCell>
                        <TableCell className="w-[180px] text-center">
                          <div className="break-words leading-relaxed" title={result['违规类型']}>
                            {result['违规类型'] || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="w-[120px] text-center">
                          <div className="break-words leading-relaxed" title={result['监管地区']}>
                            {result['监管地区'] || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="w-[200px] text-center">
                          <div className="break-words leading-relaxed">
                            {result.link ? (
                              <a 
                                href={result.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline"
                                title={result.link}
                              >
                                查看原文
                              </a>
                            ) : (
                              '-'
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
       </div>
       
       {/* Toast 通知 */}
       {toast && (
         <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
           toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
         }`}>
           <div className="flex items-center gap-2">
             {toast.type === 'success' ? (
               <CheckSquare className="h-5 w-5" />
             ) : (
               <AlertCircle className="h-5 w-5" />
             )}
             <span>{toast.message}</span>
           </div>
         </div>
       )}
     </MainLayout>
   );
 }
