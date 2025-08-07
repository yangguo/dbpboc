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
      return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
    case "处理中":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
    case "调查中":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  }
}

export default function DashboardPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">仪表板</h1>
            <p className="text-muted-foreground">案例管理系统概览</p>
          </div>
          <Button>
            <BarChart3 className="mr-2 h-4 w-4" />
            生成报告
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总案例数</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCases.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+{stats.recentCases}</span> 本月新增
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总罚款金额</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalPenalty)}</div>
              <p className="text-xs text-muted-foreground">
                平均 {formatCurrency(stats.avgPenalty)} 每案例
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">活跃案例</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.byStatus.active.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {stats.byStatus.closed.toLocaleString()} 已结案
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">处理效率</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">85%</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+2.1%</span> 较上月
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Recent Cases */}
          <Card>
            <CardHeader>
              <CardTitle>最近案例</CardTitle>
              <CardDescription>最新添加的案例记录</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentCases.map((case_) => (
                  <div key={case_.id} className="flex items-center justify-between space-x-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{case_.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {case_.organization} • {case_.province} • {case_.date}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">
                        {formatCurrency(case_.penalty)}
                      </span>
                      <Badge className={getStatusColor(case_.status)}>
                        {case_.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Case Types Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>案例类型分布</CardTitle>
              <CardDescription>按案例类型统计</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(stats.byCaseType).map(([type, count]) => {
                  const percentage = (count / stats.totalCases * 100).toFixed(1);
                  return (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm">{type}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-12 text-right">
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
        <Card>
          <CardHeader>
            <CardTitle>地区分布</CardTitle>
            <CardDescription>按省份统计的案例数量</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              {Object.entries(stats.byProvince).map(([province, count]) => (
                <div key={province} className="text-center">
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm text-muted-foreground">{province}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}