'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, FileText, Calendar, DollarSign, User, Building, Hash, Filter, RotateCcw, Gavel } from 'lucide-react';
import { MainLayout } from '@/components/layout/main-layout';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">MongoDB 搜索</h1>
            <p className="text-muted-foreground">搜索和管理所有案例记录</p>
          </div>
        </div>
        
          {/* 关键词搜索区 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
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
                <Button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className={`${
                    query.trim()
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-gray-300 hover:bg-gray-400 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  搜索
                </Button>
              </form>
              
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  {error}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* 高级筛选区 */}
          <Card>
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Filter className="h-5 w-5" />
                      高级筛选
                    </div>
                    <div className="text-sm font-normal text-muted-foreground">
                      {showAdvanced ? "收起" : "展开"}
                    </div>
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <div className="space-y-2">
                      <Label htmlFor="doc_no" className="text-muted-foreground">文号</Label>
                      <Input
                        id="doc_no"
                        placeholder="输入文号"
                        value={advancedFilters.doc_no}
                        onChange={(e) => updateFilter('doc_no', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="entity_name" className="text-muted-foreground">当事人</Label>
                      <Input
                        id="entity_name"
                        placeholder="输入当事人名称"
                        value={advancedFilters.entity_name}
                        onChange={(e) => updateFilter('entity_name', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="case_type" className="text-muted-foreground">案件类型</Label>
                      <Input
                        id="case_type"
                        placeholder="输入案件类型"
                        value={advancedFilters.case_type}
                        onChange={(e) => updateFilter('case_type', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="penalty_basis" className="text-muted-foreground">处罚依据</Label>
                      <Input
                        id="penalty_basis"
                        placeholder="输入处罚依据"
                        value={advancedFilters.penalty_basis}
                        onChange={(e) => updateFilter('penalty_basis', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="penalty_decision" className="text-muted-foreground">处罚决定</Label>
                      <Input
                        id="penalty_decision"
                        placeholder="输入处罚决定"
                        value={advancedFilters.penalty_decision}
                        onChange={(e) => updateFilter('penalty_decision', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="department" className="text-muted-foreground">处罚机关</Label>
                      <Input
                        id="department"
                        placeholder="输入处罚机关"
                        value={advancedFilters.department}
                        onChange={(e) => updateFilter('department', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="region" className="text-muted-foreground">地区</Label>
                      <Input
                        id="region"
                        placeholder="输入地区"
                        value={advancedFilters.region}
                        onChange={(e) => updateFilter('region', e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="keywords" className="text-muted-foreground">关键词</Label>
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
                      <Label className="text-muted-foreground">发布日期范围</Label>
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
                      <Label className="text-muted-foreground">金额范围</Label>
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
                      className="bg-green-600 hover:bg-green-700 text-white"
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
                      className="bg-purple-600 hover:bg-purple-700 text-white"
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
                      className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  搜索历史
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {searchLogs.map((log, index) => (
                    <div key={index} className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-md">
                      {log}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        {results && (
          <Card>
            <CardHeader>
              <CardTitle>搜索结果</CardTitle>
              <CardDescription>共 {results.total} 条记录</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                {results.items.map((item, index) => (
                  <Card key={index} className="hover:shadow-sm transition-all duration-200">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg leading-tight">
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
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              <FileText className="h-3 w-3 mr-1" />
                              {item.case_type}
                            </Badge>
                          )}
                          {item.decision_date && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3 mr-1" />
                              决定日期: {item.decision_date}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {item.amount_num && (
                          <div className="mb-2 text-sm font-bold text-red-600">
                            <DollarSign className="inline h-3 w-3 mr-1" />
                            ¥{item.amount_num.toLocaleString()}
                          </div>
                        )}
                        {(item.publish_date || item.decision_date) && (
                          <div className="flex items-center text-xs text-muted-foreground">
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
                          <div className="flex items-center text-xs text-muted-foreground">
                            <User className="h-4 w-4 mr-1" />
                            当事人
                          </div>
                          <p className="text-sm">{item.entity_name}</p>
                        </div>
                      )}
                      
                      {item.agency && (
                        <div className="space-y-2">
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Building className="h-4 w-4 mr-1" />
                            处罚机关
                          </div>
                          <p className="text-sm">{item.agency}</p>
                        </div>
                      )}
                      
                      {(item.province || item.region) && (
                        <div className="space-y-2">
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Hash className="h-4 w-4 mr-1" />
                            地区
                          </div>
                          <p className="text-sm">
                            {[item.province, item.region].filter(Boolean).join(' - ')}
                          </p>
                        </div>
                      )}
                      
                      {(item.amount || item.amount_num) && (
                        <div className="space-y-2">
                          <div className="flex items-center text-xs text-muted-foreground">
                            <DollarSign className="h-4 w-4 mr-1" />
                            罚款金额
                          </div>
                          <p className="text-sm text-red-600 font-bold">
                            {typeof item.amount_num === 'number'
                              ? `¥${item.amount_num.toLocaleString()}`
                              : (item.amount ? `¥${item.amount}` : "未提供")
                            }
                          </p>
                        </div>
                      )}
                      
                      {(item.publish_date || item.decision_date) && (
                        <div className="space-y-2">
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Calendar className="h-4 w-4 mr-1" />
                            {item.publish_date ? '发布日期' : '决定日期'}
                          </div>
                          <p className="text-sm">
                            {item.publish_date || item.decision_date}
                          </p>
                        </div>
                      )}
                      
                      {item.industry && (
                        <div className="space-y-2">
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Building className="h-4 w-4 mr-1" />
                            行业
                          </div>
                          <p className="text-sm">{item.industry}</p>
                        </div>
                      )}
                    </div>

                    {/* 详细信息网格 */}
                    <div className="space-y-4">
                      {item.violation_type && (
                        <div className="p-4 bg-muted rounded-md text-sm leading-relaxed border-l-4 border-orange-500">
                          {item.violation_type}
                        </div>
                      )}
                      
                      {item.penalty_content && (
                        <div className="p-4 bg-muted rounded-md text-sm leading-relaxed border-l-4 border-red-500">
                          {item.penalty_content}
                        </div>
                      )}
                    </div>

                    {/* 详细信息网格 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6 pt-4 border-t">
                      {item.agency && (
                        <div className="space-y-2 p-3 bg-muted rounded-md">
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Building className="h-4 w-4 mr-1" />
                            处罚机关
                          </div>
                          <p className="text-sm">{item.agency}</p>
                        </div>
                      )}
                      
                      {(item.province || item.region) && (
                        <div className="space-y-2 p-3 bg-muted rounded-md">
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Hash className="h-4 w-4 mr-1" />
                            地区
                          </div>
                          <p className="text-sm">
                            {[item.province, item.region].filter(Boolean).join(', ')}
                          </p>
                        </div>
                      )}
                      
                      {item.industry && (
                        <div className="space-y-2 p-3 bg-muted rounded-md">
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Building className="h-4 w-4 mr-1" />
                            行业
                          </div>
                          <p className="text-sm">{item.industry}</p>
                        </div>
                      )}
                      
                      {item.category && (
                        <div className="space-y-2 p-3 bg-muted rounded-md">
                          <div className="flex items-center text-xs text-muted-foreground">
                            <FileText className="h-4 w-4 mr-1" />
                            违规类别
                          </div>
                          <p className="text-sm">{item.category}</p>
                        </div>
                      )}
                      
                      {item.penalty_basis && (
                        <div className="space-y-2 p-3 bg-muted rounded-md">
                          <div className="flex items-center text-xs text-muted-foreground">
                            <FileText className="h-4 w-4 mr-1" />
                            处罚依据
                          </div>
                          <p className="text-sm">{item.penalty_basis}</p>
                        </div>
                      )}
                      
                      {item.penalty_decision && (
                        <div className="space-y-2 p-3 bg-muted rounded-md">
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Gavel className="h-4 w-4 mr-1" />
                            处罚决定
                          </div>
                          <p className="text-sm">{item.penalty_decision}</p>
                        </div>
                      )}
                      
                      {item.document_number && (
                        <div className="space-y-2 p-3 bg-muted rounded-md">
                          <div className="flex items-center text-xs text-muted-foreground">
                            <FileText className="h-4 w-4 mr-1" />
                            文号
                          </div>
                          <p className="text-sm">{item.document_number}</p>
                        </div>
                      )}
                      
                      {item.case_number && (
                        <div className="space-y-2 p-3 bg-muted rounded-md">
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Hash className="h-4 w-4 mr-1" />
                            案件编号
                          </div>
                          <p className="text-sm">{item.case_number}</p>
                        </div>
                      )}
                      
                      {item.decision_number && (
                        <div className="space-y-2 p-3 bg-muted rounded-md">
                          <div className="flex items-center text-xs text-muted-foreground">
                            <FileText className="h-4 w-4 mr-1" />
                            决定书编号
                          </div>
                          <p className="text-sm">{item.decision_number}</p>
                        </div>
                      )}
                    </div>

                    {/* 底部操作区 */}
                    <div className="flex justify-between items-center mt-6 pt-4 border-t">
                      <div className="flex items-center space-x-2">
                        {item.uid && (
                          <div className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                            ID: {item.uid.slice(-8)}
                          </div>
                        )}
                      </div>
                      {item.link && (
                        <Button asChild variant="outline" size="sm">
                          <a href={item.link} target="_blank" rel="noopener noreferrer">
                            查看原文
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {results.total === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-lg font-medium text-muted-foreground">未找到相关结果{query && ` "${query}"`}</p>
                  <p className="text-sm mt-2 text-muted-foreground">请尝试调整搜索条件或使用不同的关键词</p>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}
        </div>
    </MainLayout>
  );
}
