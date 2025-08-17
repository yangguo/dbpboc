"use client";

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  Settings,
  Save,
  Trash2,
  Merge,
  Edit
} from "lucide-react";

// City list from the original code
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
  "file"
];

export default function AttachmentProcessPage() {
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [processedData, setProcessedData] = useState<ProcessedData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingCell, setEditingCell] = useState<{row: number, col: string} | null>(null);
  const [editValue, setEditValue] = useState("");
  const [selectedColumn, setSelectedColumn] = useState("");
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [mergeColumn, setMergeColumn] = useState("");
  const [saveColumns, setSaveColumns] = useState(defaultColumns.join(", "));

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
      "file": "penalty_001.pdf"
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
      "file": "penalty_002.xlsx"
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
      // Simulate API call to get processed data
      await new Promise(resolve => setTimeout(resolve, 1000));
      setProcessedData(mockProcessedData);
    } catch (error) {
      console.error("Failed to load processed data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCellEdit = (rowIndex: number, columnKey: string, value: string) => {
    setEditingCell({ row: rowIndex, col: columnKey });
    setEditValue(value);
  };

  const handleCellSave = () => {
    if (editingCell) {
      setProcessedData(prev => prev.map((row, index) => 
        index === editingCell.row 
          ? { ...row, [editingCell.col]: editValue }
          : row
      ));
      setEditingCell(null);
      setEditValue("");
    }
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const handleDeleteRows = () => {
    if (!selectedColumn || selectedValues.length === 0) return;
    
    const filteredData = processedData.filter(row => 
      !selectedValues.includes(row[selectedColumn])
    );
    setProcessedData(filteredData);
    setSelectedValues([]);
  };

  const handleMergeRows = () => {
    if (!mergeColumn) return;
    
    // Group by merge column and link, then merge other columns
    const grouped = processedData.reduce((acc, row) => {
      const key = `${row[mergeColumn]}_${row.link}`;
      if (!acc[key]) {
        acc[key] = { ...row };
      } else {
        // Merge other columns by concatenating
        Object.keys(row).forEach(col => {
          if (col !== mergeColumn && col !== 'link' && col !== 'id') {
            acc[key][col] = `${acc[key][col]} ${row[col]}`.trim();
          }
        });
      }
      return acc;
    }, {} as Record<string, ProcessedData>);
    
    setProcessedData(Object.values(grouped));
  };

  const handleSaveData = async () => {
    try {
      // Simulate API call to save data
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert("数据保存成功！");
    } catch (error) {
      console.error("Failed to save data:", error);
      alert("数据保存失败！");
    }
  };

  const getColumnValues = (columnKey: string) => {
    return [...new Set(processedData.map(row => row[columnKey]).filter(Boolean))];
  };

  const columns = processedData.length > 0 ? Object.keys(processedData[0]).filter(key => key !== 'id') : [];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">内容处理</h1>
            <p className="text-muted-foreground">处理和编辑提取的表格数据</p>
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
              选择要处理数据的PBOC机构
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

        {/* Data Processing Controls */}
        {selectedOrg && processedData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>数据处理工具</CardTitle>
              <CardDescription>
                编辑、删除和合并表格数据
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Delete Controls */}
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="text-sm font-medium">选择删除列</label>
                  <Select value={selectedColumn} onValueChange={setSelectedColumn}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择列" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium">选择删除列值</label>
                  <Select 
                    value={selectedValues.join(",")} 
                    onValueChange={(value) => setSelectedValues(value ? value.split(",") : [])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择值" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedColumn && getColumnValues(selectedColumn).map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleDeleteRows}
                  disabled={!selectedColumn || selectedValues.length === 0}
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  删除
                </Button>
              </div>

              {/* Merge Controls */}
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="text-sm font-medium">选择合并列</label>
                  <Select value={mergeColumn} onValueChange={setMergeColumn}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择合并列" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleMergeRows}
                  disabled={!mergeColumn}
                  className="flex items-center gap-2"
                >
                  <Merge className="h-4 w-4" />
                  合并
                </Button>
              </div>

              {/* Save Columns Configuration */}
              <div>
                <label className="text-sm font-medium">保存列配置</label>
                <Textarea
                  value={saveColumns}
                  onChange={(e) => setSaveColumns(e.target.value)}
                  placeholder="输入要保存的列名，用逗号分隔"
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleSaveData}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  保存数据
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Data Table */}
        {selectedOrg && (
          <Card>
            <CardHeader>
              <CardTitle>待更新表格</CardTitle>
              <CardDescription>
                {selectedOrg} - 共 {processedData.length} 条记录
              </CardDescription>
            </CardHeader>
            <CardContent>
              {processedData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {isLoading ? "加载中..." : "暂无数据"}
                </div>
              ) : (
                <div className="rounded-md border max-h-96 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {columns.map((col) => (
                          <TableHead key={col} className="min-w-32">
                            {col}
                          </TableHead>
                        ))}
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {processedData.map((row, rowIndex) => (
                        <TableRow key={row.id}>
                          {columns.map((col) => (
                            <TableCell key={col}>
                              {editingCell?.row === rowIndex && editingCell?.col === col ? (
                                <div className="flex gap-1">
                                  <Input
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    className="h-8"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleCellSave();
                                      if (e.key === 'Escape') handleCellCancel();
                                    }}
                                  />
                                  <Button size="sm" onClick={handleCellSave}>
                                    <CheckCircle className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div 
                                  className="cursor-pointer hover:bg-gray-100 p-1 rounded min-h-8 flex items-center"
                                  onClick={() => handleCellEdit(rowIndex, col, row[col])}
                                >
                                  <span className="truncate max-w-xs">
                                    {row[col]}
                                  </span>
                                </div>
                              )}
                            </TableCell>
                          ))}
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCellEdit(rowIndex, columns[0], row[columns[0]])}
                            >
                              <Edit className="h-4 w-4" />
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

        {/* Processing Status */}
        {processedData.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              数据处理完成。点击单元格可以编辑内容，使用上方工具进行批量操作。
            </AlertDescription>
          </Alert>
        )}
      </div>
    </MainLayout>
  );
}