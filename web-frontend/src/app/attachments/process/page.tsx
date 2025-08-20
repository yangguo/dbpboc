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
  Settings
} from "lucide-react";

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

  // Mock data for demonstration
  const mockProcessedData: ProcessedData[] = [
    {
      id: "1",
      "序号": "1",
      "企业名称": "某银行股份有限公司",
      "处罚决定书文号": "京银罚字[2024]001号",
      "违法行为类型": "违规放贷",
      "行政处罚内容": "罚款50万元",
      "作出行政处罚决定机关名称": "中国人民银行北京营业管理部",
      "作出行政处罚决定日期": "2024-01-15",
      "备注": "",
      "link": "http://beijing.pbc.gov.cn/case/001",
      "content": "某银行股份有限公司因违规放贷被处罚款50万元，处罚决定书文号为京银罚字[2024]001号。"
    },
    {
      id: "2",
      "序号": "2", 
      "企业名称": "某金融服务公司",
      "处罚决定书文号": "京银罚字[2024]002号",
      "违法行为类型": "反洗钱违规",
      "行政处罚内容": "罚款30万元",
      "作出行政处罚决定机关名称": "中国人民银行北京营业管理部",
      "作出行政处罚决定日期": "2024-01-20",
      "备注": "",
      "link": "http://beijing.pbc.gov.cn/case/002", 
      "content": "某金融服务公司因反洗钱违规被处罚款30万元，处罚决定书文号为京银罚字[2024]002号。"
    }
  ];

  useEffect(() => {
    if (selectedOrg) {
      loadProcessedData();
    }
  }, [selectedOrg]);

  const loadProcessedData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${config.backendUrl}/api/v1/attachments/processed-data/${encodeURIComponent(selectedOrg)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch processed data');
      }
      const data = await response.json();
      // Transform the API response: extract data from each ProcessedDataItem
      const transformedData = data.map((item: any) => ({
        id: item.id,
        ...item.data
      }));
      setProcessedData(transformedData);
    } catch (error) {
      console.error("Failed to load processed data:", error);
      // Fallback to mock data for development
      setProcessedData(mockProcessedData);
    } finally {
      setIsLoading(false);
    }
  };

  const columns = processedData.length > 0 ? Object.keys(processedData[0]).filter(key => key !== 'id' && (key === 'link' || key === 'content')) : [];

  return (
    <MainLayout>
      <div className="space-y-6">
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
              <CardTitle>数据表格</CardTitle>
              <CardDescription>
                {processedData.length > 0 ? `共 ${processedData.length} 条记录` : '暂无数据'}
              </CardDescription>
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
                        {columns.map((col) => (
                          <TableHead 
                            key={col} 
                            className={`
                              ${col === 'link' ? 'min-w-48' : ''}
                              ${col === 'content' ? 'min-w-64' : ''}
                              ${col !== 'link' && col !== 'content' ? 'min-w-32' : ''}
                            `}
                          >
                            {col}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {processedData.map((row, rowIndex) => (
                        <TableRow key={row.id}>
                          {columns.map((col) => (
                            <TableCell key={col}>
                              <div className="cursor-default hover:bg-gray-50 p-1 rounded min-h-8 flex items-center">
                                {col === 'link' ? (
                                  <a 
                                    href={String(row[col] || '')} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 underline truncate max-w-xs"
                                  >
                                    {String(row[col] || '')}
                                  </a>
                                ) : col === 'content' ? (
                                  <span className="truncate max-w-md" title={String(row[col] || '')}>
                                    {String(row[col] || '')}
                                  </span>
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
      </div>
    </MainLayout>
  );
}