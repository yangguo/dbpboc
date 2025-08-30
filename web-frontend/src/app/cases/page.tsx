"use client";

import { useEffect, useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, ExternalLink } from "lucide-react";
import { config } from "@/lib/config";
import { DateRange } from "@/components/ui/date-range";

type CaseItem = {
  uid?: string;
  doc_no?: string;
  entity_name?: string;
  violation_type?: string;
  penalty_content?: string;
  agency?: string;
  decision_date?: string;
  publish_date?: string;
  region?: string;
  province?: string;
  industry?: string;
  amount?: string;
  amount_num?: number | null;
  category?: string;
  title?: string;
  link?: string;
};

export default function CasesPage() {
  // Query params
  const [keyword, setKeyword] = useState("");
  const [docNo, setDocNo] = useState("");
  const [entityName, setEntityName] = useState("");
  const [violationType, setViolationType] = useState("");
  const [penaltyContent, setPenaltyContent] = useState("");
  const [agency, setAgency] = useState("");
  const [region, setRegion] = useState("");
  const [province, setProvince] = useState("");
  const [industry, setIndustry] = useState("");
  const [category, setCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Results state
  const [items, setItems] = useState<CaseItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const fetchCases = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (keyword) params.set("q", keyword);
      if (docNo) params.set("doc_no", docNo);
      if (entityName) params.set("entity_name", entityName);
      if (violationType) params.set("violation_type", violationType);
      if (penaltyContent) params.set("penalty_content", penaltyContent);
      if (agency) params.set("agency", agency);
      if (region && region !== "all") params.set("region", region);
      if (province) params.set("province", province);
      if (industry && industry !== "all") params.set("industry", industry);
      if (category && category !== "all") params.set("category", category);
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);
      if (minAmount) params.set("min_amount", minAmount);
      if (maxAmount) params.set("max_amount", maxAmount);
      params.set("page", String(page));
      params.set("page_size", String(pageSize));
      params.set("verbose", "true");

      // Simple retry to survive backend auto-reload hiccups
      const doFetch = async (attempt = 1): Promise<Response> => {
        try {
          const res = await fetch(`${config.backendUrl}/api/v1/search/cases?${params.toString()}`);
          if (!res.ok && attempt < 3 && [500, 502, 503, 504].includes(res.status)) {
            await new Promise(r => setTimeout(r, 300 * attempt));
            return doFetch(attempt + 1);
          }
          return res;
        } catch (err) {
          if (attempt < 3) {
            await new Promise(r => setTimeout(r, 300 * attempt));
            return doFetch(attempt + 1);
          }
          throw err;
        }
      };

      const res = await doFetch();
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
      setDebugLogs(Array.isArray(data.debug) ? data.debug : []);
    } catch (e: any) {
      setError(e?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  };

  // Note: No auto-fetch on mount; search triggers only on user action

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">案例搜索</h1>
            <p className="text-muted-foreground">搜索和管理所有案例记录</p>
          </div>
        </div>

        {/* Search and Filter Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              关键词搜索
            </CardTitle>
            <CardDescription>
              综合搜索：企业名称、文号、违法类型、处罚内容、案例标题等所有文本内容
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="输入关键词进行搜索（回车搜索）"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setPage(1); fetchCases(); } }}
                  className="pl-10"
                />
              </div>
              <Button
                onClick={() => { setPage(1); fetchCases(); }}
                disabled={loading}
                size="lg"
                className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white shadow min-w-[100px]"
              >
                <Search className="h-4 w-4 mr-1" />
                {loading ? "搜索中..." : "搜索"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Filters Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              高级筛选
            </CardTitle>
            <CardDescription>
              通过具体字段、地区、行业、分类、日期、金额等条件进行精确筛选
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Specific Information Filters */}
            <div>
              <h4 className="text-sm font-medium mb-3 text-muted-foreground">具体信息筛选</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">文号关键词</label>
                  <Input placeholder="如 银保监罚决字..." value={docNo} onChange={(e) => setDocNo(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">处罚决定关键词</label>
                  <Input placeholder="处罚内容关键词" value={penaltyContent} onChange={(e) => setPenaltyContent(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">当事人关键词</label>
                  <Input placeholder="企业或个人名称" value={entityName} onChange={(e) => setEntityName(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">处罚机关关键词</label>
                  <Input placeholder="监管机构名称" value={agency} onChange={(e) => setAgency(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">案情关键词</label>
                  <Input placeholder="违法行为描述" value={violationType} onChange={(e) => setViolationType(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">处罚区域</label>
                  <Select value={region} onValueChange={setRegion}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择处罚区域" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部区域</SelectItem>
                      <SelectItem value="北京">北京</SelectItem>
                      <SelectItem value="上海">上海</SelectItem>
                      <SelectItem value="天津">天津</SelectItem>
                      <SelectItem value="重庆">重庆</SelectItem>
                      <SelectItem value="广东">广东</SelectItem>
                      <SelectItem value="江苏">江苏</SelectItem>
                      <SelectItem value="浙江">浙江</SelectItem>
                      <SelectItem value="山东">山东</SelectItem>
                      <SelectItem value="河南">河南</SelectItem>
                      <SelectItem value="四川">四川</SelectItem>
                      <SelectItem value="湖北">湖北</SelectItem>
                      <SelectItem value="湖南">湖南</SelectItem>
                      <SelectItem value="福建">福建</SelectItem>
                      <SelectItem value="安徽">安徽</SelectItem>
                      <SelectItem value="河北">河北</SelectItem>
                      <SelectItem value="辽宁">辽宁</SelectItem>
                      <SelectItem value="江西">江西</SelectItem>
                      <SelectItem value="陕西">陕西</SelectItem>
                      <SelectItem value="黑龙江">黑龙江</SelectItem>
                      <SelectItem value="广西">广西</SelectItem>
                      <SelectItem value="山西">山西</SelectItem>
                      <SelectItem value="吉林">吉林</SelectItem>
                      <SelectItem value="云南">云南</SelectItem>
                      <SelectItem value="贵州">贵州</SelectItem>
                      <SelectItem value="内蒙古">内蒙古</SelectItem>
                      <SelectItem value="新疆">新疆</SelectItem>
                      <SelectItem value="甘肃">甘肃</SelectItem>
                      <SelectItem value="海南">海南</SelectItem>
                      <SelectItem value="宁夏">宁夏</SelectItem>
                      <SelectItem value="青海">青海</SelectItem>
                      <SelectItem value="西藏">西藏</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Location and Industry Filters */}
            <div>
              <h4 className="text-sm font-medium mb-3 text-muted-foreground">地区与行业</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">省份</label>
                  <Input placeholder="输入省份" value={province} onChange={(e) => setProvince(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">行业类别</label>
                  <Select value={industry} onValueChange={setIndustry}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择行业" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部行业</SelectItem>
                      <SelectItem value="银行业">银行业</SelectItem>
                      <SelectItem value="保险业">保险业</SelectItem>
                      <SelectItem value="证券业">证券业</SelectItem>
                      <SelectItem value="基金业">基金业</SelectItem>
                      <SelectItem value="信托业">信托业</SelectItem>
                      <SelectItem value="期货业">期货业</SelectItem>
                      <SelectItem value="支付机构">支付机构</SelectItem>
                      <SelectItem value="金融科技">金融科技</SelectItem>
                      <SelectItem value="小额贷款">小额贷款</SelectItem>
                      <SelectItem value="融资担保">融资担保</SelectItem>
                      <SelectItem value="其他金融">其他金融</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">案例分类</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择分类" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部分类</SelectItem>
                      <SelectItem value="违规经营">违规经营</SelectItem>
                      <SelectItem value="内控管理">内控管理</SelectItem>
                      <SelectItem value="风险管理">风险管理</SelectItem>
                      <SelectItem value="反洗钱">反洗钱</SelectItem>
                      <SelectItem value="消费者权益">消费者权益</SelectItem>
                      <SelectItem value="数据安全">数据安全</SelectItem>
                      <SelectItem value="信息披露">信息披露</SelectItem>
                      <SelectItem value="从业人员">从业人员</SelectItem>
                      <SelectItem value="市场操纵">市场操纵</SelectItem>
                      <SelectItem value="其他违法">其他违法</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Date and Amount Filters */}
            <div>
              <h4 className="text-sm font-medium mb-3 text-muted-foreground">日期与金额</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">发布日期</label>
                  <DateRange
                    start={startDate}
                    end={endDate}
                    onChange={(s, e) => { setStartDate(s); setEndDate(e); }}
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">罚款金额范围</label>
                  <div className="flex items-center gap-2">
                    <Input type="number" placeholder="最小金额" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} />
                    <span className="text-sm text-muted-foreground">至</span>
                    <Input type="number" placeholder="最大金额" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Search Templates */}
            <div>
              <h4 className="text-sm font-medium mb-3 text-muted-foreground">快速搜索模板</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => { setViolationType("反洗钱"); setPage(1); fetchCases(); }}
                  className="text-xs"
                >
                  反洗钱违法
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => { setIndustry("银行业"); setMinAmount("100000"); setPage(1); fetchCases(); }}
                  className="text-xs"
                >
                  银行业重大处罚
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => { setViolationType("内控"); setPage(1); fetchCases(); }}
                  className="text-xs"
                >
                  内控管理违规
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => { setCategory("消费者权益"); setPage(1); fetchCases(); }}
                  className="text-xs"
                >
                  消费者权益
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => { setIndustry("保险业"); setPage(1); fetchCases(); }}
                  className="text-xs"
                >
                  保险业处罚
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => { setViolationType("数据"); setPage(1); fetchCases(); }}
                  className="text-xs"
                >
                  数据安全违规
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => { setMinAmount("1000000"); setPage(1); fetchCases(); }}
                  className="text-xs"
                >
                  百万以上处罚
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => { 
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
                    setEndDate(new Date().toISOString().split('T')[0]);
                    setPage(1); 
                    fetchCases(); 
                  }}
                  className="text-xs"
                >
                  近期案例
                </Button>
              </div>
            </div>

            {/* Display Options and Actions */}
            <div>
              <h4 className="text-sm font-medium mb-3 text-muted-foreground">显示设置</h4>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">每页显示</label>
                    <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 条</SelectItem>
                        <SelectItem value="20">20 条</SelectItem>
                        <SelectItem value="50">50 条</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={() => { setPage(1); fetchCases(); }} disabled={loading}>
                    应用筛选
                  </Button>
                  <Button variant="outline" onClick={() => { 
                    setKeyword(""); 
                    setDocNo(""); 
                    setEntityName(""); 
                    setViolationType(""); 
                    setPenaltyContent(""); 
                    setAgency(""); 
                    setRegion(""); 
                    setProvince(""); 
                    setIndustry(""); 
                    setCategory(""); 
                    setStartDate(""); 
                    setEndDate(""); 
                    setMinAmount(""); 
                    setMaxAmount(""); 
                    setPage(1); 
                  }}>
                    清除筛选
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Debug logs - separate section */}
        {debugLogs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">搜索日志</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-48 overflow-auto text-xs space-y-1 bg-muted/30 rounded p-3">
                {debugLogs.map((line, i) => (
                  <div key={i} className="font-mono whitespace-pre-wrap text-muted-foreground">{line}</div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Section */}
        <Card>
          <CardHeader>
            <CardTitle>搜索结果</CardTitle>
            <CardDescription>共 {total} 条记录</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</div>
            )}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">处罚文号</TableHead>
                    <TableHead className="min-w-[200px]">企业信息</TableHead>
                    <TableHead className="w-40">违法类型</TableHead>
                    <TableHead className="w-32">地区</TableHead>
                    <TableHead className="w-32">罚款金额</TableHead>
                    <TableHead className="w-28">发布日期</TableHead>
                    <TableHead className="w-20">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it, idx) => (
                    <TableRow key={`${it.uid || it.doc_no || it.link}-${idx}`}>
                      <TableCell className="font-mono text-xs">
                        {it.doc_no || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-sm line-clamp-2">{it.entity_name || "-"}</div>
                          {(it.category || it.penalty_content || it.title) && (
                            <div className="text-xs text-muted-foreground line-clamp-2 bg-muted/30 rounded px-2 py-1">
                              {it.category || it.penalty_content || it.title}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm line-clamp-3">{it.violation_type || "-"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {it.province && <div className="text-sm font-medium">{it.province}</div>}
                          {it.region && <div className="text-xs text-muted-foreground">{it.region}</div>}
                          {!it.province && !it.region && <div className="text-sm text-muted-foreground">-</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium text-right">
                          {typeof it.amount_num === 'number' 
                            ? `¥${it.amount_num.toLocaleString()}` 
                            : (it.amount ? `¥${it.amount}` : "-")
                          }
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {it.publish_date || "-"}
                      </TableCell>
                      <TableCell>
                        {it.link && (
                          <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <a href={it.link} target="_blank" rel="noreferrer" title="查看原文">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {items.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        暂无数据，请尝试搜索或调整筛选条件
                      </TableCell>
                    </TableRow>
                  )}
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        搜索中...
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {/* Pagination */}
            {total > 0 && (
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>共 {total.toLocaleString()} 条记录</span>
                  <span>第 {page} / {totalPages} 页</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={page <= 1 || loading} 
                    onClick={() => { setPage(1); setTimeout(fetchCases, 0); }}
                  >
                    首页
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={page <= 1 || loading} 
                    onClick={() => { setPage((p) => Math.max(1, p - 1)); setTimeout(fetchCases, 0); }}
                  >
                    上一页
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={page >= totalPages || loading} 
                    onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); setTimeout(fetchCases, 0); }}
                  >
                    下一页
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={page >= totalPages || loading} 
                    onClick={() => { setPage(totalPages); setTimeout(fetchCases, 0); }}
                  >
                    末页
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
