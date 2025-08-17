"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  FileText,
  TrendingUp,
  Users,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign
} from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";

// Mock data - in real app this would come from API
const stats = {
  totalCases: 1248,
  totalPenalty: 45600000,
  avgPenalty: 36538,
  recentCases: 23,
  byStatus: {
    active: 856,
    closed: 392
  },
  byProvince: {
    "北京": 156,
    "上海": 134,
    "广东": 128,
    "江苏": 98,
    "浙江": 87
  },
  byCaseType: {
    "违规放贷": 234,
    "资金违规使用": 198,
    "信息披露违规": 167,
    "内控制度缺失": 145,
    "其他": 504
  }
};

const recentCases = [
  {
    id: "1",
    title: "某银行违规放贷案例",
    organization: "XX银行",
    province: "北京",
    penalty: 500000,
    status: "处理中",
    date: "2024-01-15"
  },
  {
    id: "2",
    title: "资金违规使用案例",
    organization: "YY金融",
    province: "上海",
    penalty: 300000,
    status: "已结案",
    date: "2024-01-14"
  },
  {
    id: "3",
    title: "信息披露不当案例",
    organization: "ZZ证券",
    province: "深圳",
    penalty: 200000,
    status: "调查中",
    date: "2024-01-13"
  }
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

function getStatusColor(status: string) {
  switch (status) {
    case "已结案":
      return "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30";
    case "处理中":
      return "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30";
    case "调查中":
      return "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30";
    default:
      return "bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-lg shadow-gray-500/30";
  }
}

export default function DashboardPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-xl gradient-primary animate-float">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  仪表板
                </h1>
                <p className="text-muted-foreground text-lg">案例管理系统概览</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" className="bg-white/50 hover:bg-white/70 border-white/30">
              <CheckCircle className="mr-2 h-4 w-4" />
              快速操作
            </Button>
            <Button className="gradient-primary text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
              <BarChart3 className="mr-2 h-4 w-4" />
              生成报告
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="glass-card hover:scale-105 transition-all duration-300 border-0 shadow-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/5 group-hover:from-blue-500/20 group-hover:to-blue-600/10 transition-all duration-300" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">总案例数</CardTitle>
              <div className="p-2 rounded-lg gradient-primary">
                <FileText className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                {stats.totalCases.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-green-600 font-semibold">+{stats.recentCases}</span> 本月新增
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card hover:scale-105 transition-all duration-300 border-0 shadow-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-green-600/5 group-hover:from-green-500/20 group-hover:to-green-600/10 transition-all duration-300" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">总罚款金额</CardTitle>
              <div className="p-2 rounded-lg gradient-success">
                <DollarSign className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent">
                {formatCurrency(stats.totalPenalty)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                平均 <span className="font-semibold">{formatCurrency(stats.avgPenalty)}</span> 每案例
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card hover:scale-105 transition-all duration-300 border-0 shadow-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-orange-600/5 group-hover:from-orange-500/20 group-hover:to-orange-600/10 transition-all duration-300" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">活跃案例</CardTitle>
              <div className="p-2 rounded-lg gradient-warning">
                <Clock className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-800 bg-clip-text text-transparent">
                {stats.byStatus.active.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="font-semibold">{stats.byStatus.closed.toLocaleString()}</span> 已结案
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card hover:scale-105 transition-all duration-300 border-0 shadow-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-purple-600/5 group-hover:from-purple-500/20 group-hover:to-purple-600/10 transition-all duration-300" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">处理效率</CardTitle>
              <div className="p-2 rounded-lg gradient-accent">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
                85%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-green-600 font-semibold">+2.1%</span> 较上月
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent Cases */}
          <Card className="glass-card border-0 shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
            <CardHeader className="relative z-10">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg gradient-info">
                  <AlertCircle className="h-4 w-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">最近案例</CardTitle>
                  <CardDescription>最新添加的案例记录</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="space-y-4">
                {recentCases.map((case_, index) => (
                  <div key={case_.id} className="flex items-center justify-between space-x-4 p-3 rounded-lg bg-gradient-to-r from-white/50 to-white/30 dark:from-white/5 dark:to-white/10 hover:from-white/70 hover:to-white/50 dark:hover:from-white/10 dark:hover:to-white/15 transition-all duration-200 border border-white/20">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{case_.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {case_.organization} • {case_.province} • {case_.date}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent">
                        {formatCurrency(case_.penalty)}
                      </span>
                      <Badge className={`${getStatusColor(case_.status)} border-0 shadow-sm`}>
                        {case_.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Case Types Distribution */}
          <Card className="glass-card border-0 shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5" />
            <CardHeader className="relative z-10">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg gradient-accent">
                  <BarChart3 className="h-4 w-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">案例类型分布</CardTitle>
                  <CardDescription>按案例类型统计</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="space-y-4">
                {Object.entries(stats.byCaseType).map(([type, count], index) => {
                  const percentage = (count / stats.totalCases * 100).toFixed(1);
                  const colors = [
                    'from-blue-500 to-blue-600',
                    'from-green-500 to-green-600', 
                    'from-orange-500 to-orange-600',
                    'from-purple-500 to-purple-600',
                    'from-pink-500 to-pink-600'
                  ];
                  return (
                    <div key={type} className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-white/30 to-white/10 dark:from-white/5 dark:to-white/10 hover:from-white/50 hover:to-white/30 dark:hover:from-white/10 dark:hover:to-white/15 transition-all duration-200">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${colors[index % colors.length]}`} />
                        <span className="text-sm font-medium">{type}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`bg-gradient-to-r ${colors[index % colors.length]} h-2 rounded-full transition-all duration-500 ease-out`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold w-12 text-right bg-gradient-to-r from-gray-600 to-gray-800 bg-clip-text text-transparent">
                          {count}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Province Distribution */}
        <Card className="glass-card border-0 shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-blue-500/5" />
          <CardHeader className="relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg gradient-success">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">地区分布</CardTitle>
                  <CardDescription>按省份统计的案例数量</CardDescription>
                </div>
              </div>
              <Button variant="outline" size="sm" className="bg-white/50 hover:bg-white/70 border-white/30">
                查看详情
              </Button>
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="grid gap-4 md:grid-cols-5">
              {Object.entries(stats.byProvince).map(([province, count], index) => {
                const colors = [
                  'from-blue-500 to-blue-600',
                  'from-green-500 to-green-600', 
                  'from-orange-500 to-orange-600',
                  'from-purple-500 to-purple-600',
                  'from-pink-500 to-pink-600'
                ];
                return (
                  <div key={province} className="text-center p-4 rounded-xl bg-gradient-to-br from-white/40 to-white/20 dark:from-white/10 dark:to-white/5 hover:from-white/60 hover:to-white/40 dark:hover:from-white/15 dark:hover:to-white/10 transition-all duration-300 hover:scale-105 border border-white/20 group">
                    <div className={`text-3xl font-bold bg-gradient-to-r ${colors[index % colors.length]} bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-200`}>
                      {count}
                    </div>
                    <div className="text-sm text-muted-foreground font-medium mt-1">{province}</div>
                    <div className={`w-full h-1 bg-gradient-to-r ${colors[index % colors.length]} rounded-full mt-2 opacity-60 group-hover:opacity-100 transition-opacity duration-200`} />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}