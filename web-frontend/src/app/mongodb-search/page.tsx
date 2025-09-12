'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Database, FileText, Calendar, DollarSign, User, Building, Hash, Filter, X, RotateCcw, Gavel, ExternalLink, AlertTriangle } from 'lucide-react';
import { MainLayout } from '@/components/layout/main-layout';
import { DateRange } from '@/components/ui/date-range';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';

interface SearchResult {
  items: any[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface AdvancedFilters {
  doc_no: string;
  entity_name: string;
  case_type: string;
  penalty_basis: string;
  penalty_decision: string;
  publish_date_start: string;
  publish_date_end: string;
  amount_min: string;
  amount_max: string;
  department: string;
  region: string;
  keywords: string;
}

export default function MongoDBSearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchLogs, setSearchLogs] = useState<string[]>([]);
  
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    doc_no: "",
    entity_name: "",
    case_type: "",
    penalty_basis: "",
    penalty_decision: "",
    publish_date_start: "",
    publish_date_end: "",
    amount_min: "",
    amount_max: "",
    department: "",
    region: "",
    keywords: ""
  });

  const searchCases = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults(null);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        q: searchQuery.trim(),
        page: '1',
        page_size: '20'
      });

      const response = await fetch(`/api/mongodb-search?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setResults(data.data);
      } else {
        setError(data.error || 'Search failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    // Set new timer for debounced search
    if (query.trim()) {
      const timer = setTimeout(() => {
        searchCases(query);
      }, 500);
      setDebounceTimer(timer);
    } else {
      setResults(null);
    }
    
    // Cleanup timer on unmount or query change
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchCases(query);
  };
  
  const handleAdvancedSearch = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: '1',
        page_size: '20'
      });
      
      // Add advanced filters to params
      Object.entries(advancedFilters).forEach(([key, value]) => {
        if (value.trim()) {
          params.append(key, value.trim());
        }
      });

      const response = await fetch(`/api/mongodb-search?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setResults(data.data);
        // 添加高级搜索日志
        const activeFilters = Object.entries(advancedFilters)
          .filter(([_, value]) => value.trim() !== "")
          .map(([key, _]) => key)
          .join(", ");
        const logEntry = `高级搜索: ${activeFilters || "无筛选条件"} - ${data.data.total || 0}条结果`;
        setSearchLogs(prev => [logEntry, ...prev.slice(0, 4)]);
      } else {
        setError(data.error || 'Search failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCombinedSearch = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: '1',
        page_size: '20'
      });
      
      if (query.trim()) {
        params.append('q', query.trim());
      }
      
      // Add advanced filters to params
      Object.entries(advancedFilters).forEach(([key, value]) => {
        if (value.trim()) {
          params.append(key, value.trim());
        }
      });

      const response = await fetch(`/api/mongodb-search?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setResults(data.data);
        // 添加组合搜索日志
        const activeFilters = Object.entries(advancedFilters)
          .filter(([_, value]) => value.trim() !== "")
          .map(([key, _]) => key)
          .join(", ");
        const logEntry = `组合搜索: "${query.trim()}" + ${activeFilters || "无筛选条件"} - ${data.data.total || 0}条结果`;
        setSearchLogs(prev => [logEntry, ...prev.slice(0, 4)]);
      } else {
        setError(data.error || 'Search failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };
  
  const clearAllFilters = () => {
    setQuery("");
    setAdvancedFilters({
      doc_no: "",
      entity_name: "",
      case_type: "",
      penalty_basis: "",
      penalty_decision: "",
      publish_date_start: "",
      publish_date_end: "",
      amount_min: "",
      amount_max: "",
      department: "",
      region: "",
      keywords: ""
    });
    setResults(null);
    setError(null);
  };
  
  const updateFilter = (key: keyof AdvancedFilters, value: string) => {
    setAdvancedFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold mb-8 flex items-center gap-2 text-gray-900">
            <Database className="h-8 w-8 text-blue-600" />
            MongoDB Search
          </h1>
        
          {/* 关键词搜索区 */}
          <Card className="mb-6 bg-white border-2 border-gray-200 shadow-md">
            <CardHeader className="bg-gray-50">
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Search className="h-5 w-5 text-blue-600" />
                关键词搜索
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="flex gap-4">
                <Input
                  type="text"
                  placeholder="输入搜索关键词..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={loading || !query.trim()}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  搜索
                </Button>
              </form>
              
              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
                  {error}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* 高级筛选区 */}
          <Card className="mb-6 bg-white border-2 border-gray-200 shadow-md">
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors bg-gray-50">
                  <CardTitle className="flex items-center justify-between text-gray-900">
                    <div className="flex items-center gap-2">
                      <Filter className="h-5 w-5 text-blue-600" />
                      高级筛选
                    </div>
                    <div className="text-sm font-normal text-gray-600">
                      {showAdvanced ? "收起" : "展开"}
                    </div>
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <div className="space-y-2">
                      <Label htmlFor="doc_no">文号</Label>
                      <Input
                        id="doc_no"
                        placeholder="输入文号"
                        value={advancedFilters.doc_no}
                        onChange={(e) => updateFilter('doc_no', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="entity_name">当事人</Label>
                      <Input
                        id="entity_name"
                        placeholder="输入当事人名称"
                        value={advancedFilters.entity_name}
                        onChange={(e) => updateFilter('entity_name', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="case_type">案件类型</Label>
                      <Input
                        id="case_type"
                        placeholder="输入案件类型"
                        value={advancedFilters.case_type}
                        onChange={(e) => updateFilter('case_type', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="penalty_basis">处罚依据</Label>
                      <Input
                        id="penalty_basis"
                        placeholder="输入处罚依据"
                        value={advancedFilters.penalty_basis}
                        onChange={(e) => updateFilter('penalty_basis', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="penalty_decision">处罚决定</Label>
                      <Input
                        id="penalty_decision"
                        placeholder="输入处罚决定"
                        value={advancedFilters.penalty_decision}
                        onChange={(e) => updateFilter('penalty_decision', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="department">处罚机关</Label>
                      <Input
                        id="department"
                        placeholder="输入处罚机关"
                        value={advancedFilters.department}
                        onChange={(e) => updateFilter('department', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="region">地区</Label>
                      <Input
                        id="region"
                        placeholder="输入地区"
                        value={advancedFilters.region}
                        onChange={(e) => updateFilter('region', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="keywords">关键词</Label>
                      <Input
                        id="keywords"
                        placeholder="输入关键词"
                        value={advancedFilters.keywords}
                        onChange={(e) => updateFilter('keywords', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="space-y-2">
                      <Label>发布日期范围</Label>
                      <div className="flex gap-2">
                        <Input
                          type="date"
                          value={advancedFilters.publish_date_start}
                          onChange={(e) => updateFilter('publish_date_start', e.target.value)}
                        />
                        <span className="flex items-center px-2 text-muted-foreground">至</span>
                        <Input
                          type="date"
                          value={advancedFilters.publish_date_end}
                          onChange={(e) => updateFilter('publish_date_end', e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>金额范围</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="最小金额"
                          value={advancedFilters.amount_min}
                          onChange={(e) => updateFilter('amount_min', e.target.value)}
                          type="number"
                        />
                        <span className="flex items-center px-2 text-muted-foreground">至</span>
                        <Input
                          placeholder="最大金额"
                          value={advancedFilters.amount_max}
                          onChange={(e) => updateFilter('amount_max', e.target.value)}
                          type="number"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      onClick={handleAdvancedSearch}
                      disabled={loading}
                      variant="default"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Filter className="h-4 w-4 mr-2" />
                      )}
                      应用筛选
                    </Button>
                    
                    <Button 
                      type="button" 
                      onClick={handleCombinedSearch}
                      disabled={loading}
                      variant="secondary"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Search className="h-4 w-4 mr-2" />
                      )}
                      组合搜索
                    </Button>
                    
                    <Button 
                      type="button" 
                      onClick={clearAllFilters}
                      variant="outline"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      清除全部
                    </Button>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
          
          {/* 搜索日志区 */}
          {searchLogs.length > 0 && (
            <Card className="mb-6 bg-white border-2 border-gray-200 shadow-md">
              <CardHeader className="bg-gray-50">
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <FileText className="h-5 w-5 text-blue-600" />
                  搜索历史
                </CardTitle>
              </CardHeader>
              <CardContent className="bg-white">
                <div className="space-y-2">
                  {searchLogs.map((log, index) => (
                    <div key={index} className="text-sm text-gray-700 p-3 bg-gray-100 rounded-lg border border-gray-200">
                      {log}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        {results && (
          <Card className="bg-white border-2 border-gray-200 shadow-md">
            <CardHeader className="bg-gray-50">
              <CardTitle className="flex items-center justify-between text-gray-900">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-blue-600" />
                  搜索结果
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                  共 {results.total} 条结果
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="bg-white">
              <div className="mb-4 flex justify-between items-center">
                <p className="text-gray-600">
                  Found {results.total} results{query && ` for "${query}"`}
                </p>
                <Badge variant="secondary">
                  Page {results.page} of {results.totalPages}
                </Badge>
              </div>

              <div className="grid gap-6">
                {results.items.map((item, index) => (
                  <Card key={index} className="hover:shadow-xl transition-all duration-200 border-2 border-gray-200 hover:border-blue-300 bg-white">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-xl mb-3 text-white leading-tight">
                          {item.entity_name || item.title || item.doc_no || '处罚案例'}
                        </h3>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {item.doc_no && (
                            <Badge variant="secondary" className="text-xs">
                              <Hash className="h-3 w-3 mr-1" />
                              {item.doc_no}
                            </Badge>
                          )}
                          {item.case_type && (
                            <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 border-blue-300">
                              <FileText className="h-3 w-3 mr-1" />
                              {item.case_type}
                            </Badge>
                          )}
                          {item.decision_date && (
                            <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-300">
                              <Calendar className="h-3 w-3 mr-1" />
                              决定日期: {item.decision_date}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {item.amount_num && (
                          <div className="mb-2">
                            <Badge variant="destructive" className="text-sm font-semibold">
                              <DollarSign className="h-3 w-3 mr-1" />
                              ¥{item.amount_num.toLocaleString()}
                            </Badge>
                          </div>
                        )}
                        {(item.publish_date || item.decision_date) && (
                          <div className="flex items-center text-sm text-gray-300">
                            <Calendar className="h-3 w-3 mr-1" />
                            {item.publish_date || item.decision_date}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {/* 主要信息区域 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                      {item.entity_name && (
                        <div className="space-y-2">
                          <div className="flex items-center text-xs font-bold text-gray-300 uppercase tracking-wide">
                            <User className="h-4 w-4 mr-1 text-blue-400" />
                            当事人
                          </div>
                          <p className="text-sm text-white font-semibold">{item.entity_name}</p>
                        </div>
                      )}
                      
                      {item.agency && (
                        <div className="space-y-2">
                          <div className="flex items-center text-xs font-bold text-gray-300 uppercase tracking-wide">
                            <Building className="h-4 w-4 mr-1 text-blue-400" />
                            处罚机关
                          </div>
                          <p className="text-sm text-white font-semibold">{item.agency}</p>
                        </div>
                      )}
                      
                      {(item.province || item.region) && (
                        <div className="space-y-2">
                          <div className="flex items-center text-xs font-bold text-gray-300 uppercase tracking-wide">
                            <Hash className="h-4 w-4 mr-1 text-blue-400" />
                            地区
                          </div>
                          <p className="text-sm text-white font-semibold">
                            {[item.province, item.region].filter(Boolean).join(' - ')}
                          </p>
                        </div>
                      )}
                      
                      {(item.amount || item.amount_num) && (
                        <div className="space-y-2">
                          <div className="flex items-center text-xs font-bold text-gray-300 uppercase tracking-wide">
                            <DollarSign className="h-4 w-4 mr-1 text-blue-400" />
                            罚款金额
                          </div>
                          <p className="text-sm text-red-400 font-bold">
                            {typeof item.amount_num === 'number'
                              ? `¥${item.amount_num.toLocaleString()}`
                              : (item.amount ? `¥${item.amount}` : "未提供")
                            }
                          </p>
                        </div>
                      )}
                      
                      {(item.publish_date || item.decision_date) && (
                        <div className="space-y-2">
                          <div className="flex items-center text-xs font-bold text-gray-300 uppercase tracking-wide">
                            <Calendar className="h-4 w-4 mr-1 text-blue-400" />
                            {item.publish_date ? '发布日期' : '决定日期'}
                          </div>
                          <p className="text-sm text-white font-semibold">
                            {item.publish_date || item.decision_date}
                          </p>
                        </div>
                      )}
                      
                      {item.industry && (
                        <div className="space-y-2">
                          <div className="flex items-center text-xs font-bold text-gray-300 uppercase tracking-wide">
                            <Building className="h-4 w-4 mr-1 text-blue-400" />
                            行业
                          </div>
                          <p className="text-sm text-white font-semibold">{item.industry}</p>
                        </div>
                      )}
                    </div>

                    {/* 详细信息网格 */}
                    <div className="space-y-4">
                      {item.violation_type && (
                        <div className="bg-red-900/20 p-4 rounded-lg border-2 border-red-500/30 shadow-sm">
                          <span className="font-bold text-red-300 text-sm block mb-2">违法行为类型</span>
                          <p className="text-red-200 text-sm leading-relaxed font-medium">{item.violation_type}</p>
                        </div>
                      )}
                      
                      {item.penalty_content && (
                        <div className="bg-orange-900/20 p-4 rounded-lg border-2 border-orange-500/30 shadow-sm">
                          <span className="font-bold text-orange-300 text-sm block mb-2">行政处罚内容</span>
                          <p className="text-orange-200 text-sm leading-relaxed font-medium">{item.penalty_content}</p>
                        </div>
                      )}
                    </div>

                    {/* 详细信息网格 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6 pt-4 border-t-2 border-gray-600">
                      {item.agency && (
                        <div className="space-y-2 p-3 bg-gray-800/50 rounded-lg border border-gray-600">
                          <div className="flex items-center text-xs font-bold text-gray-300 uppercase tracking-wide">
                            <Building className="h-4 w-4 mr-1 text-blue-400" />
                            处罚机关
                          </div>
                          <p className="text-sm text-white font-semibold">{item.agency}</p>
                        </div>
                      )}
                      
                      {(item.province || item.region) && (
                        <div className="space-y-2 p-3 bg-gray-800/50 rounded-lg border border-gray-600">
                          <div className="flex items-center text-xs font-bold text-gray-300 uppercase tracking-wide">
                            <Hash className="h-4 w-4 mr-1 text-blue-400" />
                            地区
                          </div>
                          <p className="text-sm text-white font-semibold">
                            {[item.province, item.region].filter(Boolean).join(', ')}
                          </p>
                        </div>
                      )}
                      
                      {item.industry && (
                        <div className="space-y-2 p-3 bg-gray-800/50 rounded-lg border border-gray-600">
                          <div className="flex items-center text-xs font-bold text-gray-300 uppercase tracking-wide">
                            <Building className="h-4 w-4 mr-1 text-blue-400" />
                            行业
                          </div>
                          <p className="text-sm text-white font-semibold">{item.industry}</p>
                        </div>
                      )}
                      
                      {item.category && (
                        <div className="space-y-2 p-3 bg-gray-800/50 rounded-lg border border-gray-600">
                          <div className="flex items-center text-xs font-bold text-gray-300 uppercase tracking-wide">
                            <FileText className="h-4 w-4 mr-1 text-blue-400" />
                            违规类别
                          </div>
                          <p className="text-sm text-white font-semibold">{item.category}</p>
                        </div>
                      )}
                      
                      {item.penalty_basis && (
                        <div className="space-y-2 p-3 bg-gray-800/50 rounded-lg border border-gray-600">
                          <div className="flex items-center text-xs font-bold text-gray-300 uppercase tracking-wide">
                            <FileText className="h-4 w-4 mr-1 text-blue-400" />
                            处罚依据
                          </div>
                          <p className="text-sm text-white font-semibold">{item.penalty_basis}</p>
                        </div>
                      )}
                      
                      {item.penalty_decision && (
                        <div className="space-y-2 p-3 bg-gray-800/50 rounded-lg border border-gray-600">
                          <div className="flex items-center text-xs font-bold text-gray-300 uppercase tracking-wide">
                            <Gavel className="h-4 w-4 mr-1 text-blue-400" />
                            处罚决定
                          </div>
                          <p className="text-sm text-white font-semibold">{item.penalty_decision}</p>
                        </div>
                      )}
                      
                      {item.document_number && (
                        <div className="space-y-2 p-3 bg-gray-800/50 rounded-lg border border-gray-600">
                          <div className="flex items-center text-xs font-bold text-gray-300 uppercase tracking-wide">
                            <FileText className="h-4 w-4 mr-1 text-blue-400" />
                            文号
                          </div>
                          <p className="text-sm text-white font-semibold">{item.document_number}</p>
                        </div>
                      )}
                      
                      {item.case_number && (
                        <div className="space-y-2 p-3 bg-gray-800/50 rounded-lg border border-gray-600">
                          <div className="flex items-center text-xs font-bold text-gray-300 uppercase tracking-wide">
                            <Hash className="h-4 w-4 mr-1 text-blue-400" />
                            案件编号
                          </div>
                          <p className="text-sm text-white font-semibold">{item.case_number}</p>
                        </div>
                      )}
                      
                      {item.decision_number && (
                        <div className="space-y-2 p-3 bg-gray-800/50 rounded-lg border border-gray-600">
                          <div className="flex items-center text-xs font-bold text-gray-300 uppercase tracking-wide">
                            <FileText className="h-4 w-4 mr-1 text-blue-400" />
                            决定书编号
                          </div>
                          <p className="text-sm text-white font-semibold">{item.decision_number}</p>
                        </div>
                      )}
                    </div>

                    {/* 底部操作区 */}
                    <div className="flex justify-between items-center mt-6 pt-4 border-t-2 border-gray-600">
                      <div className="flex items-center space-x-2">
                        {item.uid && (
                          <Badge variant="outline" className="text-xs bg-gray-800/50 text-gray-300 border-2 border-gray-600 font-semibold">
                            ID: {item.uid.slice(-8)}
                          </Badge>
                        )}
                      </div>
                      {item.link && (
                        <a 
                          href={item.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 border-2 border-blue-600 hover:border-blue-500 rounded-md transition-all duration-200 shadow-md"
                        >
                          查看原文
                          <svg className="ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {results.total === 0 && (
              <Card className="bg-gray-800/50 border-gray-600">
                <CardContent className="text-center py-12 bg-gray-800/50">
                  <p className="text-gray-300 text-lg font-medium">未找到相关结果{query && ` "${query}"`}</p>
                  <p className="text-gray-400 text-sm mt-2">请尝试调整搜索条件或使用不同的关键词</p>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}
        </div>
      </div>
    </MainLayout>
  );
}