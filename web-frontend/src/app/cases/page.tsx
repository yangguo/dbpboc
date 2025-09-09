"use client";

import { useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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

  // Dialog state for case details
  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  // Function to handle row click and open dialog
  const handleRowClick = (caseItem: CaseItem) => {
    setSelectedCase(caseItem);
    setIsDialogOpen(true);
  };

  // Function to close dialog
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedCase(null);
  };

  // Check if advanced filters are being used
  const hasAdvancedFilters = () => {
    return docNo || entityName || violationType || penaltyContent || agency || 
           (region && region !== "all") || province || industry || category || 
           startDate || endDate || minAmount || maxAmount;
  };

  // Keyword search only (clears advanced filters)
  const performKeywordSearch = async () => {
    // Clear advanced filters when doing keyword search
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
    
    await fetchCasesWithParams({ keyword: true, advanced: false });
  };

  // Advanced filter search only (clears keyword)
  const performAdvancedSearch = async () => {
    // Clear keyword when doing advanced search
    setKeyword("");
    setPage(1);
    
    await fetchCasesWithParams({ keyword: false, advanced: true });
  };

  // Combined search (keeps both keyword and advanced filters)
  const performCombinedSearch = async () => {
    setPage(1);
    await fetchCasesWithParams({ keyword: true, advanced: true });
  };

  // Pagination search - maintains current search mode
  const performPaginationSearch = async () => {
    const hasKeyword = Boolean(keyword);
    const hasAdvanced = hasAdvancedFilters();
    
    if (hasKeyword && hasAdvanced) {
      await fetchCasesWithParams({ keyword: true, advanced: true });
    } else if (hasKeyword) {
      await fetchCasesWithParams({ keyword: true, advanced: false });
    } else if (hasAdvanced) {
      await fetchCasesWithParams({ keyword: false, advanced: true });
    }
  };

  const fetchCasesWithParams = async (options: { keyword: boolean; advanced: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      
      // Apply keyword search if enabled
      if (options.keyword && keyword) {
        params.set("q", keyword);
      }
      
      // Apply advanced filters if enabled
      if (options.advanced) {
        if (docNo) params.set("doc_no", docNo);
        if (entityName) params.set("entity_name", entityName);
        if (violationType) params.set("violation_type", violationType);
        if (penaltyContent) params.set("penalty_content", penaltyContent);
        if (agency) params.set("agency", agency);
        if (region && region !== "all") params.set("region", region);
        if (province) params.set("province", province);
        if (industry) params.set("industry", industry);
        if (category) params.set("category", category);
        if (startDate) params.set("start_date", startDate);
        if (endDate) params.set("end_date", endDate);
        if (minAmount) params.set("min_amount", minAmount);
        if (maxAmount) params.set("max_amount", maxAmount);
      }
      
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
              {hasAdvancedFilters() && (
                <span className="text-orange-600 font-medium"> · 当前有高级筛选条件，搜索将仅使用关键词</span>
              )}
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
                  onKeyDown={(e) => { 
                    if (e.key === 'Enter' && keyword.trim()) { 
                      e.preventDefault(); 
                      performKeywordSearch();
                    } 
                  }}
                  className="pl-10"
                />
              </div>
              <Button
                onClick={() => performKeywordSearch()}
                disabled={loading || !keyword.trim()}
                size="lg"
                className={`shrink-0 shadow-lg min-w-[100px] transition-all duration-200 ${
                  keyword.trim() 
                    ? "bg-blue-600 hover:bg-blue-700 text-white hover:shadow-xl" 
                    : "bg-gray-300 hover:bg-gray-400 text-gray-500 cursor-not-allowed"
                }`}
              >
                <Search className="h-4 w-4 mr-1" />
                {loading ? "搜索中..." : "搜索"}
              </Button>
            </div>
            {keyword && hasAdvancedFilters() && (
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
                <span className="font-medium">注意：</span>点击"搜索"将清除高级筛选条件，仅使用关键词搜索；点击下方"应用筛选"将清除关键词，仅使用筛选条件；如需组合搜索请点击"组合搜索"
              </div>
            )}
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
          <CardContent className="space-y-4">
            {/* All Filters in Compact Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">文号关键词</label>
                <Input placeholder="如 银保监罚决字..." value={docNo} onChange={(e) => setDocNo(e.target.value)} className="h-9" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">当事人关键词</label>
                <Input placeholder="企业或个人名称" value={entityName} onChange={(e) => setEntityName(e.target.value)} className="h-9" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">案情关键词</label>
                <Input placeholder="违法行为描述" value={violationType} onChange={(e) => setViolationType(e.target.value)} className="h-9" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">处罚内容关键词</label>
                <Input placeholder="处罚内容关键词" value={penaltyContent} onChange={(e) => setPenaltyContent(e.target.value)} className="h-9" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">处罚机关关键词</label>
                <Input placeholder="监管机构名称" value={agency} onChange={(e) => setAgency(e.target.value)} className="h-9" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">处罚区域</label>
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger className="h-9">
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
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">省份</label>
                <Input placeholder="输入省份" value={province} onChange={(e) => setProvince(e.target.value)} className="h-9" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">行业类别</label>
                <Input placeholder="输入行业类别" value={industry} onChange={(e) => setIndustry(e.target.value)} className="h-9" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">案例分类</label>
                <Input placeholder="输入案例分类" value={category} onChange={(e) => setCategory(e.target.value)} className="h-9" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">最小金额</label>
                <Input type="number" placeholder="最小金额" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} className="h-9" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">最大金额</label>
                <Input type="number" placeholder="最大金额" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} className="h-9" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">每页显示</label>
                <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                  <SelectTrigger className="h-9">
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

            {/* Date Range in Separate Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">发布日期范围</label>
                <DateRange
                  start={startDate}
                  end={endDate}
                  onChange={(s, e) => { setStartDate(s); setEndDate(e); }}
                  disabled={loading}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button 
                  variant="default" 
                  onClick={() => performAdvancedSearch()} 
                  disabled={loading || !hasAdvancedFilters()} 
                  className={`flex-1 transition-all duration-200 ${
                    hasAdvancedFilters() 
                      ? "bg-green-600 hover:bg-green-700 text-white shadow-md" 
                      : "bg-gray-300 hover:bg-gray-400 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  应用筛选
                </Button>
                {keyword && hasAdvancedFilters() && (
                  <Button 
                    variant="secondary" 
                    onClick={() => performCombinedSearch()} 
                    disabled={loading} 
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    组合搜索
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  onClick={() => {
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
                  }} 
                  className="flex-1 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                >
                  清除全部
                </Button>
              </div>
            </div>
            
            {/* Help Text */}
            <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2 mt-2">
              <strong>使用说明：</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li><strong>关键词搜索：</strong>在上方输入关键词后点击"搜索"，会清除高级筛选条件</li>
                <li><strong>高级筛选：</strong>填写筛选条件后点击"应用筛选"，会清除关键词</li>
                <li><strong>组合搜索：</strong>同时有关键词和筛选条件时，点击"组合搜索"使用全部条件</li>
              </ul>
              {!hasAdvancedFilters() && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-blue-700">
                  💡 <strong>提示：</strong>请先填写上方任意筛选条件，"应用筛选"按钮将变为可点击状态
                </div>
              )}
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
                    <TableHead className="w-36">处罚文号</TableHead>
                    <TableHead className="min-w-[200px] max-w-[250px]">企业信息</TableHead>
                    <TableHead className="w-32">地区</TableHead>
                    <TableHead className="w-32">罚款金额</TableHead>
                    <TableHead className="w-28">发布日期</TableHead>
                    <TableHead className="w-20">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it, idx) => (
                    <TableRow
                      key={`${it.uid || it.doc_no || `item-${idx}`}-${idx}`}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleRowClick(it)}
                    >
                      <TableCell className="font-mono text-xs">
                        {it.doc_no || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <div className="font-medium text-sm line-clamp-1">{it.entity_name || "-"}</div>
                          {it.violation_type && (
                            <div className="text-xs text-blue-200 line-clamp-2 bg-blue-900/30 border border-blue-700/50 rounded-md px-3 py-2">
                              <span className="font-semibold text-blue-100">案情：</span>{it.violation_type}
                            </div>
                          )}
                          {it.penalty_content && (
                            <div className="text-xs text-rose-200 line-clamp-2 bg-rose-900/30 border border-rose-700/50 rounded-md px-3 py-2">
                              <span className="font-semibold text-rose-100">处罚：</span>{it.penalty_content}
                            </div>
                          )}
                          {(it.category || it.title) && (
                            <div className="text-xs text-slate-300 line-clamp-1 bg-slate-800/40 border border-slate-600/50 rounded-md px-3 py-1">
                              {it.category || it.title}
                            </div>
                          )}
                        </div>
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
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
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
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        暂无数据，请尝试搜索或调整筛选条件
                      </TableCell>
                    </TableRow>
                  )}
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
                    onClick={() => { setPage(1); setTimeout(performPaginationSearch, 0); }}
                  >
                    首页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || loading}
                    onClick={() => { setPage((p) => Math.max(1, p - 1)); setTimeout(performPaginationSearch, 0); }}
                  >
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages || loading}
                    onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); setTimeout(performPaginationSearch, 0); }}
                  >
                    下一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages || loading}
                    onClick={() => { setPage(totalPages); setTimeout(performPaginationSearch, 0); }}
                  >
                    末页
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Case Details Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="w-[95vw] sm:!max-w-7xl xl:!max-w-[84rem] max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900">
            <DialogHeader className="pb-4 border-b">
              <DialogTitle className="text-xl font-bold">案例详情</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                查看完整的处罚案例信息
              </DialogDescription>
            </DialogHeader>

            {selectedCase && (
              <div className="space-y-6 pt-4">
                {/* Basic Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">处罚文号</label>
                    <div className="p-3 bg-muted rounded-md text-sm font-mono">
                      {selectedCase.doc_no || "未提供"}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">当事人</label>
                    <div className="p-3 bg-muted rounded-md text-sm font-medium">
                      {selectedCase.entity_name || "未提供"}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">处罚区域</label>
                    <div className="p-3 bg-muted rounded-md text-sm">
                      {[selectedCase.province, selectedCase.region].filter(Boolean).join(" - ") || "未提供"}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">处罚机关</label>
                    <div className="p-3 bg-muted rounded-md text-sm">
                      {selectedCase.agency || "未提供"}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">罚款金额</label>
                    <div className="p-3 bg-muted rounded-md text-sm font-bold text-red-600">
                      {typeof selectedCase.amount_num === 'number'
                        ? `¥${selectedCase.amount_num.toLocaleString()}`
                        : (selectedCase.amount ? `¥${selectedCase.amount}` : "未提供")
                      }
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">发布日期</label>
                    <div className="p-3 bg-muted rounded-md text-sm">
                      {selectedCase.publish_date || selectedCase.decision_date || "未提供"}
                    </div>
                  </div>
                </div>

                {/* Classification Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">行业分类</label>
                    <div className="p-3 bg-muted rounded-md text-sm">
                      {selectedCase.industry || "未分类"}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">案例分类</label>
                    <div className="p-3 bg-muted rounded-md text-sm">
                      {selectedCase.category || "未分类"}
                    </div>
                  </div>
                </div>

                {/* Detailed Information */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">违法类型</label>
                    <div className="p-4 bg-muted rounded-md text-sm leading-relaxed border-l-4 border-orange-500">
                      {selectedCase.violation_type || "未提供"}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">处罚内容</label>
                    <div className="p-4 bg-muted rounded-md text-sm leading-relaxed border-l-4 border-red-500">
                      {selectedCase.penalty_content || "未提供"}
                    </div>
                  </div>

                  {selectedCase.title && (
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">案例标题</label>
                      <div className="p-4 bg-muted rounded-md text-sm leading-relaxed border-l-4 border-blue-500">
                        {selectedCase.title}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="border-t pt-4 mt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      {selectedCase.uid && (
                        <div className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                          ID: {selectedCase.uid}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3">
                      {selectedCase.link && (
                        <Button asChild variant="outline" size="sm">
                          <a href={selectedCase.link} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            查看原文
                          </a>
                        </Button>
                      )}
                      <Button onClick={handleCloseDialog} variant="default" size="sm">
                        关闭
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
