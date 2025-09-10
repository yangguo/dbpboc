"use client";

import { useEffect, useState } from "react";
import { useApiCallDeduplication } from "@/hooks/useDebounce";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Upload, Database, CheckSquare, Square, RotateCcw } from "lucide-react";
import { config } from "@/lib/config";

interface PendingRecord {
  id: string;
  企业名称?: string;
  处罚决定书文号?: string;
  违法行为类型?: string;
  发布日期?: string;
  区域?: string;
  link?: string;
  uid?: string;
  amount?: number;
  category?: string;
  province?: string;
  industry?: string;
  [key: string]: any;
}

export default function UplinkPage() {
  const [loading, setLoading] = useState(false);
  const [uplinkInfo, setUplinkInfo] = useState<{
    sum?: { total_cases: number; link_count: number; min_date: string; max_date: string };
    dtl?: { total_cases: number; link_count: number; uid_count: number; min_date: string; max_date: string };
    cat?: { total_cases: number; link_count: number; uid_count: number; min_date: string; max_date: string };
    collection?: { size: number; pending: number };
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingData, setPendingData] = useState<PendingRecord[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [loadingPending, setLoadingPending] = useState(false);
  const [nullStats, setNullStats] = useState<{
    null_stats: Record<string, { null_count: number; null_percentage: number; non_null_count: number }>;
    total_records: number;
  } | null>(null);
  const [loadingNullStats, setLoadingNullStats] = useState(false);

  const loadUplinkInfoInternal = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${config.backendUrl}/api/v1/uplink/info`);
      if (resp.ok) {
        const data = await resp.json();
        setUplinkInfo(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const loadPendingData = async () => {
    setLoadingPending(true);
    try {
      const resp = await fetch(`${config.backendUrl}/api/v1/uplink/pending`);
      if (resp.ok) {
        const data = await resp.json();
        setPendingData(data.records || []);
        setSelectedRecords(new Set()); // 重置选择
      }
    } catch (error) {
      console.error('加载待更新数据失败:', error);
      setPendingData([]);
    } finally {
      setLoadingPending(false);
    }
  };

  const loadNullStats = async () => {
    setLoadingNullStats(true);
    try {
      const resp = await fetch(`${config.backendUrl}/api/v1/uplink/null-stats`);
      if (resp.ok) {
        const data = await resp.json();
        setNullStats(data);
      }
    } catch (error) {
      console.error('加载空值统计失败:', error);
      setNullStats(null);
    } finally {
      setLoadingNullStats(false);
    }
  };

  // 使用防重复调用的hook
  const loadUplinkInfo = useApiCallDeduplication(loadUplinkInfoInternal, 'loadUplinkInfo', 2000);

  const reloadWithFeedback = async () => {
    try {
      await loadUplinkInfo();
      await loadPendingData();
      await loadNullStats();
    } catch (error) {
      console.error('Error reloading uplink info:', error);
      alert('重新加载数据失败，请重试');
    }
  };

  const downloadSelectedData = async () => {
    const selectedIds = Array.from(selectedRecords);
    if (selectedIds.length === 0) {
      alert('请先选择要下载的记录');
      return;
    }

    try {
      const resp = await fetch(`${config.backendUrl}/api/v1/uplink/export-selected`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selected_ids: selectedIds
        })
      });
      
      if (!resp.ok) throw new Error('导出失败');
      
      const blob = await resp.blob();
      const a = document.createElement('a');
      const objectUrl = URL.createObjectURL(blob);
      a.href = objectUrl;
      a.download = `selected_pending_data_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      console.error(e);
      alert('下载失败');
    }
  };

  const downloadPendingData = async () => {
    try {
      const resp = await fetch(`${config.backendUrl}/api/v1/uplink/export-pending`);
      if (!resp.ok) throw new Error('导出失败');
      
      const blob = await resp.blob();
      const a = document.createElement('a');
      const objectUrl = URL.createObjectURL(blob);
      a.href = objectUrl;
      a.download = `pending_data_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      console.error(e);
      alert('下载失败');
    }
  };

  useEffect(() => {
    loadUplinkInfo();
    loadPendingData();
    loadNullStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectAll = () => {
    if (selectedRecords.size === pendingData.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(pendingData.map((record, index) => record.uid || record.id || `index-${index}`)));
    }
  };

  const handleSelectRecord = (recordId: string) => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(recordId)) {
      newSelected.delete(recordId);
    } else {
      newSelected.add(recordId);
    }
    setSelectedRecords(newSelected);
  };

  const handleInvertSelection = () => {
    const newSelected = new Set<string>();
    pendingData.forEach((record, index) => {
      const recordId = record.uid || record.id || `index-${index}`;
      if (!selectedRecords.has(recordId)) {
        newSelected.add(recordId);
      }
    });
    setSelectedRecords(newSelected);
  };

  const [updateProgress, setUpdateProgress] = useState<{
    isRunning: boolean;
    logs: string[];
    result?: any;
    error?: string;
  }>({ isRunning: false, logs: [] });

  const doUpdate = async () => {
    const selectedIds = Array.from(selectedRecords);
    if (selectedIds.length === 0) {
      alert('请先选择要上线的记录');
      return;
    }

    setBusy(true);
    setUpdateProgress({ isRunning: true, logs: ['开始执行上线操作...'] });
    
    try {
      const resp = await fetch(`${config.backendUrl}/api/v1/uplink/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selected_ids: selectedIds
        })
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.detail || '更新失败');
      }

      const result = await resp.json();
      
      // 显示详细的处理结果和日志
      setUpdateProgress({
        isRunning: false,
        logs: result.processing_log || ['处理完成'],
        result: result,
        error: result.error
      });

      // 重新加载数据
      await loadUplinkInfo();
      await loadPendingData();
      await loadNullStats();
    } catch (e) {
        console.error('更新失败:', e);
        const errorMessage = e instanceof Error ? e.message : '未知错误';
        setUpdateProgress({
          isRunning: false,
          logs: ['操作失败'],
          error: errorMessage
        });
      } finally {
        setBusy(false);
      }
    };

  const downloadMongo = async () => {
    try {
      const url = `${config.backendUrl}/api/v1/uplink/export`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('导出失败');
      const blob = await resp.blob();
      const a = document.createElement('a');
      const objectUrl = URL.createObjectURL(blob);
      a.href = objectUrl;
      a.download = `uplink_pbocdtl_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      console.error(e);
      alert('下载失败');
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">案例上线</h1>
            <p className="text-muted-foreground">参考旧版“案例数据上线”视图，汇总当前本地CSV数据概况并提供导出/占位操作</p>
          </div>
          <Button variant="outline" onClick={reloadWithFeedback} className="flex items-center gap-2">
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} 刷新
          </Button>
        </div>

        {/* MongoDB 集合信息 */}
        {uplinkInfo?.collection && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">MongoDB 集合状态</CardTitle>
              <CardDescription>pbocdtl 集合的当前状态</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{uplinkInfo.collection.size || 0}</div>
                  <p className="text-sm text-muted-foreground">已上线数据</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{uplinkInfo.collection.pending || 0}</div>
                  <p className="text-sm text-muted-foreground">待更新数据</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {uplinkInfo.collection.size > 0
                      ? ((uplinkInfo.collection.size / (uplinkInfo.collection.size + uplinkInfo.collection.pending)) * 100).toFixed(1)
                      : 0}%
                  </div>
                  <p className="text-sm text-muted-foreground">上线率</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 待上线数据字段空值统计 */}
        {nullStats && nullStats.total_records > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>待上线数据字段空值统计</span>
                <Badge variant="outline">{nullStats.total_records} 条数据</Badge>
              </CardTitle>
              <CardDescription>统计待上线数据中每个字段的空值情况</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(nullStats.null_stats).map(([field, stats]) => (
                  <div key={field} className="border rounded-lg p-3">
                    <div className="font-medium text-sm mb-2 truncate" title={field}>{field}</div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-red-600">空值:</span>
                        <span className="font-mono">{stats.null_count} ({stats.null_percentage}%)</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-green-600">非空:</span>
                        <span className="font-mono">{stats.non_null_count}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${((stats.non_null_count / nullStats.total_records) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {loadingNullStats && (
                <div className="flex items-center justify-center py-4">
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">加载空值统计中...</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>列表数据（pbocsum）</CardTitle>
              <CardDescription>来自本地 CSV 的汇总列表</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Label>数据量</Label>
                <Badge variant="secondary">{uplinkInfo?.sum?.total_cases ?? 0}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Label>唯一ID数量</Label>
                <Badge variant="outline">{uplinkInfo?.sum?.link_count ?? 0}</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                日期范围：{uplinkInfo?.sum?.min_date || "-"} ~ {uplinkInfo?.sum?.max_date || "-"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>详情数据（pbocdtl）</CardTitle>
              <CardDescription>来自本地 CSV 的详情数据</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Label>数据量</Label>
                <Badge variant="secondary">{uplinkInfo?.dtl?.total_cases ?? 0}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Label>唯一ID数量</Label>
                <Badge variant="outline">{uplinkInfo?.dtl?.link_count ?? 0}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Label>唯一UID数量</Label>
                <Badge variant="outline">{uplinkInfo?.dtl?.uid_count ?? 0}</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                日期范围：{uplinkInfo?.dtl?.min_date || "-"} ~ {uplinkInfo?.dtl?.max_date || "-"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>分类数据（pboccat）</CardTitle>
              <CardDescription>分类与金额等派生数据</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Label>数据量</Label>
                <Badge variant="secondary">{uplinkInfo?.cat?.total_cases ?? 0}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Label>唯一ID数量</Label>
                <Badge variant="outline">{uplinkInfo?.cat?.link_count ?? 0}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Label>唯一UID数量</Label>
                <Badge variant="outline">{uplinkInfo?.cat?.uid_count ?? 0}</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                日期范围：{uplinkInfo?.cat?.min_date || "-"} ~ {uplinkInfo?.cat?.max_date || "-"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 待更新数据选择 */}
        {pendingData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>待上线数据选择</span>
                <Badge variant="outline">{pendingData.length} 条待更新</Badge>
              </CardTitle>
              <CardDescription>
                选择要上线的记录，支持批量操作
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 批量操作按钮 */}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={handleSelectAll}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
                >
                  {selectedRecords.size === pendingData.length ? (
                    <Square className="h-4 w-4" />
                  ) : (
                    <CheckSquare className="h-4 w-4" />
                  )}
                  {selectedRecords.size === pendingData.length ? '全不选' : '全选'}
                </Button>
                <Button
                  size="sm"
                  onClick={handleInvertSelection}
                  className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
                >
                  <RotateCcw className="h-4 w-4" />
                  反选
                </Button>
                <div className="flex-1" />
                <Badge variant="secondary">
                  已选择 {selectedRecords.size} / {pendingData.length} 条
                </Badge>
              </div>

              {/* 数据表格 */}
              <ScrollArea className="h-96 w-full border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">选择</TableHead>
                      <TableHead className="w-16">序号</TableHead>
                      <TableHead>企业名称</TableHead>
                      <TableHead>处罚决定书文号</TableHead>
                      <TableHead>违法行为类型</TableHead>
                      <TableHead>发布日期</TableHead>
                      <TableHead>区域</TableHead>
                      <TableHead>UID</TableHead>
                      <TableHead>金额</TableHead>
                      <TableHead>类别</TableHead>
                      <TableHead>省份</TableHead>
                      <TableHead>行业</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingData.map((record, index) => (
                      <TableRow key={`${record.uid || record.link || `uplink-${index}`}-${index}`}>
                        <TableCell>
                          <Checkbox
                            checked={selectedRecords.has(record.uid || record.id || `index-${index}`)}
                            onCheckedChange={() => handleSelectRecord(record.uid || record.id || `index-${index}`)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{index + 1}</TableCell>
                        <TableCell className="max-w-48 truncate" title={record.企业名称}>
                          {record.企业名称 || '-'}
                        </TableCell>
                        <TableCell className="max-w-32 truncate font-mono text-sm" title={record.处罚决定书文号}>
                          {record.处罚决定书文号 || '-'}
                        </TableCell>
                        <TableCell className="max-w-32 truncate" title={record.违法行为类型}>
                          {record.违法行为类型 || '-'}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {record.发布日期 || '-'}
                        </TableCell>
                        <TableCell>
                          {record.区域 || '-'}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {record.uid || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {record.amount ? record.amount.toLocaleString() : '-'}
                        </TableCell>
                        <TableCell>
                          {record.category || '-'}
                        </TableCell>
                        <TableCell>
                          {record.province || '-'}
                        </TableCell>
                        <TableCell>
                          {record.industry || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              {/* 下载按钮 */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={downloadPendingData}
                  disabled={loadingPending}
                  className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500"
                >
                  下载全部待更新数据
                </Button>
                <Button
                  size="sm"
                  onClick={downloadSelectedData}
                  disabled={selectedRecords.size === 0}
                  className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500"
                >
                  下载选中数据 ({selectedRecords.size})
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>上线操作</CardTitle>
            <CardDescription>
              Mongo 集合：<span className="font-mono">pbocdtl</span>
              {uplinkInfo?.collection && (
                <span className="ml-2 text-muted-foreground">（当前 {uplinkInfo.collection.size} 条，待更新 {uplinkInfo.collection.pending} 条）</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button 
                onClick={doUpdate} 
                disabled={busy || selectedRecords.size === 0} 
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500"
              >
                {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} 
                上线选中数据 ({selectedRecords.size})
              </Button>
              <Button 
                onClick={downloadMongo} 
                disabled={loading} 
                className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500"
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />} 导出 MongoDB 数据
              </Button>
            </div>
            <div className="my-2 h-px bg-border" />
            <p className="text-sm text-muted-foreground">
              说明：已对齐旧版 Streamlit 的&quot;案例数据上线&quot;能力：基于本地 CSV 计算增量并写入 Mongo（pbocdtl 集合）、支持导出。现在支持选择性上线，只有选中的记录会被上线到数据库。
            </p>
          </CardContent>
        </Card>

        {/* 进度显示组件 */}
        {(updateProgress.isRunning || updateProgress.logs.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {updateProgress.isRunning ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    处理中...
                  </>
                ) : updateProgress.error ? (
                  <>
                    <span className="text-red-600">❌</span>
                    处理失败
                  </>
                ) : (
                  <>
                    <span className="text-green-600">✅</span>
                    处理完成
                  </>
                )}
              </CardTitle>
              <CardDescription>
                {updateProgress.isRunning ? '正在执行上线操作，请稍候...' : '操作执行结果'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 处理结果摘要 */}
              {updateProgress.result && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{updateProgress.result.inserted || 0}</div>
                    <div className="text-sm text-muted-foreground">插入记录</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{updateProgress.result.skipped || 0}</div>
                    <div className="text-sm text-muted-foreground">跳过记录</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{updateProgress.result.total_records || 0}</div>
                    <div className="text-sm text-muted-foreground">总记录数</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{updateProgress.result.processing_time || 'N/A'}</div>
                    <div className="text-sm text-muted-foreground">处理时间</div>
                  </div>
                </div>
              )}

              {/* 错误信息 */}
              {updateProgress.error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-red-800 font-medium">错误信息：</div>
                  <div className="text-red-700 mt-1">{updateProgress.error}</div>
                </div>
              )}

              {/* 处理日志 */}
              <div>
                <Label className="text-sm font-medium">处理日志：</Label>
                <ScrollArea className="h-48 w-full mt-2 p-3 bg-gray-50 border rounded-md">
                  <div className="space-y-1">
                    {updateProgress.logs.map((log, index) => (
                      <div key={index} className="text-sm font-mono text-gray-700">
                        <span className="text-gray-500">[{String(index + 1).padStart(2, '0')}]</span> {log}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* 详细时间统计 */}
              {updateProgress.result && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {updateProgress.result.data_build_time && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-blue-800 font-medium">数据构建时间</div>
                      <div className="text-blue-700">{updateProgress.result.data_build_time}</div>
                    </div>
                  )}
                  {updateProgress.result.db_connection_time && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="text-green-800 font-medium">数据库连接时间</div>
                      <div className="text-green-700">{updateProgress.result.db_connection_time}</div>
                    </div>
                  )}
                  {updateProgress.result.filter_time && (
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="text-purple-800 font-medium">数据过滤时间</div>
                      <div className="text-purple-700">{updateProgress.result.filter_time}</div>
                    </div>
                  )}
                  {updateProgress.result.insert_time && (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="text-orange-800 font-medium">数据插入时间</div>
                      <div className="text-orange-700">{updateProgress.result.insert_time}</div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
