"use client";

import { useEffect, useState } from "react";
import { useApiCallDeduplication } from "@/hooks/useDebounce";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RefreshCw, Upload, Database } from "lucide-react";
import { config } from "@/lib/config";

export default function UplinkPage() {
  const [loading, setLoading] = useState(false);
  const [uplinkInfo, setUplinkInfo] = useState<{
    sum?: { total_cases: number; link_count: number; min_date: string; max_date: string };
    dtl?: { total_cases: number; link_count: number; uid_count: number; min_date: string; max_date: string };
    cat?: { total_cases: number; link_count: number; uid_count: number; min_date: string; max_date: string };
    collection?: { size: number; pending: number };
  } | null>(null);
  const [busy, setBusy] = useState(false);

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

  // 使用防重复调用的hook
  const loadUplinkInfo = useApiCallDeduplication(loadUplinkInfoInternal, 'loadUplinkInfo', 2000);

  const reloadWithFeedback = async () => {
    try {
      await loadUplinkInfo();
    } catch (error) {
      console.error('Error reloading uplink info:', error);
      alert('重新加载数据失败，请重试');
    }
  };

  useEffect(() => {
    loadUplinkInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doUpdate = async () => {
    const confirmed = window.confirm(
      `确定要上线数据吗？\n\n` +
      `此操作将把数据插入到 MongoDB 中，请确认。`
    );

    if (!confirmed) return;

    setBusy(true);
    try {
      const resp = await fetch(`${config.backendUrl}/api/v1/uplink/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.detail || '更新失败');
      }

      const result = await resp.json();
      alert(
        `✅ 数据上线成功！\n\n` +
        `📊 插入记录: ${result.inserted || 0} 条\n` +
        `⏱️ 处理时间: ${result.processing_time || 'N/A'}\n` +
        `📅 更新时间: ${new Date().toLocaleString()}`
      );

      // 重新加载数据
      await loadUplinkInfo();
    } catch (e) {
        console.error('更新失败:', e);
        const errorMessage = e instanceof Error ? e.message : '未知错误';
        alert(
          `❌ 数据上线失败\n\n` +
          `错误信息: ${errorMessage}\n` +
          `请检查网络连接和后端服务状态，然后重试。`
        );
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
              <Button onClick={doUpdate} disabled={busy} className="flex items-center gap-2">
                {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} 上线数据到 MongoDB
              </Button>
              <Button onClick={downloadMongo} variant="outline" disabled={loading} className="flex items-center gap-2">
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />} 导出 MongoDB 数据
              </Button>
            </div>
            <div className="my-2 h-px bg-border" />
            <p className="text-sm text-muted-foreground">
              说明：已对齐旧版 Streamlit 的&quot;案例数据上线&quot;能力：基于本地 CSV 计算增量并写入 Mongo（pbocdtl 集合）、支持导出。若 CSV 目录或数据库配置变更，请在 backend/.env 中调整相关环境变量。
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
