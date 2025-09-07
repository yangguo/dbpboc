"use client";

import { useEffect, useMemo, useState } from "react";
import { useApiCallDeduplication } from "@/hooks/useDebounce";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Upload, Download } from "lucide-react";
import { config } from "@/lib/config";

type OrgStats = {
  organization: string;
  summary_stats: {
    total_cases: number;
    link_count: number;
    min_date: string | null;
    max_date: string | null;
  };
  detail_stats: {
    total_cases: number;
    link_count: number;
    min_date: string | null;
    max_date: string | null;
  };
};

export default function UplinkPage() {
  const [orgs, setOrgs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<OrgStats[]>([]);
  const [uplinkInfo, setUplinkInfo] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  // Load organizations
  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch(`${config.backendUrl}/api/v1/attachments/organizations`);
        if (resp.ok) {
          const data: string[] = await resp.json();
          setOrgs(data || []);
        }
      } catch {
        /* noop */
      }
    })();
  }, []);

  const loadUplinkInfoInternal = async () => {
    try {
      const resp = await fetch(`${config.backendUrl}/api/v1/uplink/info`);
      if (resp.ok) {
        const data = await resp.json();
        setUplinkInfo(data);
      }
    } catch {
      // ignore
    }
  };

  // Load per-organization stats, then aggregate to mimic Streamlit uplink overview
  const reloadStatsInternal = async () => {
    if (!orgs.length) return;
    setLoading(true);
    try {
      const results: OrgStats[] = [];
      for (const org of orgs) {
        try {
          const resp = await fetch(`${config.backendUrl}/api/v1/stats/${encodeURIComponent(org)}`);
          if (resp.ok) {
            const data = await resp.json();
            results.push(data as OrgStats);
          }
        } catch {
          // ignore a single org failure
        }
      }
      setStats(results);
    } finally {
      setLoading(false);
    }
  };

  // 使用防重复调用的hook
  const loadUplinkInfo = useApiCallDeduplication(loadUplinkInfoInternal, 'loadUplinkInfo', 2000);
  const reloadStats = useApiCallDeduplication(reloadStatsInternal, 'reloadStats', 2000);

  useEffect(() => {
    // initial load when orgs list arrives
    if (orgs.length) reloadStats();
    loadUplinkInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgs.length]); // 只依赖orgs的长度，避免数组引用变化导致的重复调用
  const agg = useMemo(() => {
    // Aggregate counts and date ranges across orgs
    const sumCount = stats.reduce((acc, s) => acc + (s.summary_stats?.total_cases || 0), 0);
    const dtlCount = stats.reduce((acc, s) => acc + (s.detail_stats?.total_cases || 0), 0);
    const sumUnique = stats.reduce((acc, s) => acc + (s.summary_stats?.link_count || 0), 0);
    const dtlUnique = stats.reduce((acc, s) => acc + (s.detail_stats?.link_count || 0), 0);

    const sumDates = stats
      .map(s => ({ min: s.summary_stats?.min_date, max: s.summary_stats?.max_date }))
      .filter(x => x.min && x.max) as { min: string; max: string }[];
    const dtlDates = stats
      .map(s => ({ min: s.detail_stats?.min_date, max: s.detail_stats?.max_date }))
      .filter(x => x.min && x.max) as { min: string; max: string }[];

    const min = (dates: { min: string; max: string }[]) =>
      dates.length ? dates.map(d => d.min).sort()[0] : null;
    const max = (dates: { min: string; max: string }[]) =>
      dates.length ? dates.map(d => d.max).sort().slice(-1)[0] : null;

    return {
      sumCount,
      dtlCount,
      sumUnique,
      dtlUnique,
      sumMin: min(sumDates),
      sumMax: max(sumDates),
      dtlMin: min(dtlDates),
      dtlMax: max(dtlDates),
    };
  }, [stats]);

  const downloadAll = async (datasets: string[]) => {
    if (!datasets.length) return;
    try {
      const params = new URLSearchParams();
      params.set("datasets", datasets.join(","));
      const url = `${config.backendUrl}/api/v1/downloads/pboc-export?${params.toString()}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error("下载失败");
      const blob = await resp.blob();
      const a = document.createElement("a");
      const objectUrl = URL.createObjectURL(blob);
      a.href = objectUrl;
      a.download = `pboc_export_${new Date().toISOString().slice(0,10)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      console.error(e);
      alert("下载失败，请重试");
    }
  };

  const doUpdate = async () => {
    setBusy(true);
    try {
      const resp = await fetch(`${config.backendUrl}/api/v1/uplink/update`, { method: 'POST' });
      if (!resp.ok) throw new Error('更新失败');
      await loadUplinkInfo();
      alert('更新上线数据完成');
    } catch (e) {
      console.error(e);
      alert('更新失败');
    } finally {
      setBusy(false);
    }
  };

  // 删除上线数据操作已移除

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
          <Button variant="outline" onClick={reloadStats} className="flex items-center gap-2">
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} 刷新
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>列表数据（pbocsum）</CardTitle>
              <CardDescription>来自本地 CSV 的汇总列表</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Label>数据量</Label>
                <Badge variant="secondary">{agg.sumCount}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Label>唯一ID数量</Label>
                <Badge variant="outline">{agg.sumUnique}</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                日期范围：{agg.sumMin || "-"} ~ {agg.sumMax || "-"}
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
                <Badge variant="secondary">{agg.dtlCount}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Label>唯一ID数量</Label>
                <Badge variant="outline">{agg.dtlUnique}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Label>唯一UID数量</Label>
                <Badge variant="outline">{uplinkInfo?.dtl?.uid_count ?? 0}</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                日期范围：{agg.dtlMin || "-"} ~ {agg.dtlMax || "-"}
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button onClick={doUpdate} disabled={busy} className="flex items-center gap-2">
                {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} 更新上线数据
              </Button>
              <Button onClick={downloadMongo} variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" /> 下载上线数据（Mongo）
              </Button>
            </div>
            <div className="my-2 h-px bg-border" />
            <p className="text-sm text-muted-foreground">
              说明：已对齐旧版 Streamlit 的“案例数据上线”能力：基于本地 CSV 计算增量并写入 Mongo（pbocdtl 集合）、支持导出。若 CSV 目录或数据库配置变更，请在 backend/.env 中调整相关环境变量。
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
