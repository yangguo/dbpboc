"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, Download, Eye, Edit, Trash2 } from "lucide-react";

// Mock data for cases
const mockCases = [
  {
    id: "CASE-2024-001",
    title: "某银行违规放贷案",
    status: "处理中",
    caseType: "违规放贷",
    province: "北京市",
    penaltyAmount: 500000,
    createdDate: "2024-01-15",
    lastUpdated: "2024-01-20",
    description: "某银行在放贷过程中存在违规操作，未按规定进行风险评估"
  },
  {
    id: "CASE-2024-002",
    title: "金融机构反洗钱违规案",
    status: "已结案",
    caseType: "反洗钱违规",
    province: "上海市",
    penaltyAmount: 1200000,
    createdDate: "2024-01-10",
    lastUpdated: "2024-01-25",
    description: "金融机构未按规定履行反洗钱义务，存在重大合规风险"
  },
  {
    id: "CASE-2024-003",
    title: "支付机构违规案",
    status: "调查中",
    caseType: "支付违规",
    province: "广东省",
    penaltyAmount: 300000,
    createdDate: "2024-01-12",
    lastUpdated: "2024-01-22",
    description: "支付机构在业务开展中存在违规行为，需要进一步调查"
  }
];

const statusColors = {
  "处理中": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
  "已结案": "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
  "调查中": "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
  "暂停": "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
};

export default function CasesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [provinceFilter, setProvinceFilter] = useState("all");
  const [cases, setCases] = useState(mockCases);

  const filteredCases = cases.filter(case_ => {
    const matchesSearch = case_.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         case_.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         case_.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || case_.status === statusFilter;
    const matchesType = typeFilter === "all" || case_.caseType === typeFilter;
    const matchesProvince = provinceFilter === "all" || case_.province === provinceFilter;
    
    return matchesSearch && matchesStatus && matchesType && matchesProvince;
  });

  const handleExport = () => {
    // Mock export functionality
    console.log("Exporting cases...");
  };

  const handleView = (caseId: string) => {
    console.log("Viewing case:", caseId);
  };

  const handleEdit = (caseId: string) => {
    console.log("Editing case:", caseId);
  };

  const handleDelete = (caseId: string) => {
    console.log("Deleting case:", caseId);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">案例搜索</h1>
            <p className="text-muted-foreground">搜索和管理所有案例记录</p>
          </div>
          <Button onClick={handleExport} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            导出数据
          </Button>
        </div>

        {/* Search and Filter Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              搜索与筛选
            </CardTitle>
            <CardDescription>
              使用下方工具搜索和筛选案例
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索案例标题、编号或描述..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有状态</SelectItem>
                    <SelectItem value="处理中">处理中</SelectItem>
                    <SelectItem value="已结案">已结案</SelectItem>
                    <SelectItem value="调查中">调查中</SelectItem>
                    <SelectItem value="暂停">暂停</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有类型</SelectItem>
                    <SelectItem value="违规放贷">违规放贷</SelectItem>
                    <SelectItem value="反洗钱违规">反洗钱违规</SelectItem>
                    <SelectItem value="支付违规">支付违规</SelectItem>
                    <SelectItem value="其他">其他</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={provinceFilter} onValueChange={setProvinceFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="省份" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有省份</SelectItem>
                    <SelectItem value="北京市">北京市</SelectItem>
                    <SelectItem value="上海市">上海市</SelectItem>
                    <SelectItem value="广东省">广东省</SelectItem>
                    <SelectItem value="江苏省">江苏省</SelectItem>
                    <SelectItem value="浙江省">浙江省</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card>
          <CardHeader>
            <CardTitle>搜索结果</CardTitle>
            <CardDescription>
              找到 {filteredCases.length} 个案例
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>案例编号</TableHead>
                    <TableHead>标题</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>省份</TableHead>
                    <TableHead>罚款金额</TableHead>
                    <TableHead>创建日期</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCases.map((case_) => (
                    <TableRow key={case_.id}>
                      <TableCell className="font-medium">{case_.id}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{case_.title}</div>
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {case_.description}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[case_.status as keyof typeof statusColors]}>
                          {case_.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{case_.caseType}</TableCell>
                      <TableCell>{case_.province}</TableCell>
                      <TableCell>¥{case_.penaltyAmount.toLocaleString()}</TableCell>
                      <TableCell>{case_.createdDate}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(case_.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(case_.id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(case_.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}