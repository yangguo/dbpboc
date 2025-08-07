"use client";

import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from "recharts";
import { TrendingUp, TrendingDown, BarChart3, PieChart as PieChartIcon, Download, Calendar } from "lucide-react";
import { useState } from "react";

// Mock data for analytics
const casesByMonth = [
  { month: "2023-07", cases: 12, penalties: 2400000 },
  { month: "2023-08", cases: 15, penalties: 3200000 },
  { month: "2023-09", cases: 8, penalties: 1800000 },
  { month: "2023-10", cases: 22, penalties: 4500000 },
  { month: "2023-11", cases: 18, penalties: 3800000 },
  { month: "2023-12", cases: 25, penalties: 5200000 },
  { month: "2024-01", cases: 30, penalties: 6100000 }
];

const casesByType = [
  { name: "违规放贷", value: 35, color: "#8884d8" },
  { name: "反洗钱违规", value: 28, color: "#82ca9d" },
  { name: "支付违规", value: 20, color: "#ffc658" },
  { name: "其他违规", value: 17, color: "#ff7300" }
];

const casesByProvince = [
  { province: "北京市", cases: 25, penalties: 5200000 },
  { province: "上海市", cases: 22, penalties: 4800000 },
  { province: "广东省", cases: 18, penalties: 3600000 },
  { province: "江苏省", cases: 15, penalties: 3200000 },
  { province: "浙江省", cases: 12, penalties: 2800000 },
  { province: "山东省", cases: 10, penalties: 2200000 },
  { province: "河南省", cases: 8, penalties: 1800000 }
];

const processingTrend = [
  { month: "2023-07", processed: 45, pending: 8, failed: 2 },
  { month: "2023-08", processed: 52, pending: 12, failed: 3 },
  { month: "2023-09", processed: 38, pending: 6, failed: 1 },
  { month: "2023-10", processed: 65, pending: 15, failed: 4 },
  { month: "2023-11", processed: 58, pending: 10, failed: 2 },
  { month: "2023-12", processed: 72, pending: 18, failed: 5 },
  { month: "2024-01", processed: 85, pending: 22, failed: 3 }
];

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("6months");
  const [chartType, setChartType] = useState("bar");

  const handleExport = () => {
    console.log("Exporting analytics data...");
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">数据分析</h1>
            <p className="text-muted-foreground">案例处理和趋势分析</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3months">近3个月</SelectItem>
                <SelectItem value="6months">近6个月</SelectItem>
                <SelectItem value="1year">近1年</SelectItem>
                <SelectItem value="all">全部</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleExport} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              导出报告
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总案例数</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">130</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +12.5%
                </span>
                较上月增长
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总罚款金额</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">¥2,650万</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +8.2%
                </span>
                较上月增长
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">平均处理时间</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">15.2天</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-red-600 flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  -2.1天
                </span>
                较上月减少
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">处理成功率</CardTitle>
              <PieChartIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">94.2%</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  +1.8%
                </span>
                较上月提升
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Cases by Month */}
          <Card>
            <CardHeader>
              <CardTitle>月度案例趋势</CardTitle>
              <CardDescription>案例数量和罚款金额的月度变化</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={casesByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'cases' ? `${value} 个案例` : `¥${(value as number / 10000).toFixed(1)}万`,
                      name === 'cases' ? '案例数' : '罚款金额'
                    ]}
                  />
                  <Legend />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="cases" 
                    stackId="1" 
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    name="案例数"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="penalties" 
                    stroke="#82ca9d" 
                    strokeWidth={3}
                    name="罚款金额"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Cases by Type */}
          <Card>
            <CardHeader>
              <CardTitle>案例类型分布</CardTitle>
              <CardDescription>不同违规类型的案例分布情况</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={casesByType}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {casesByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} 个案例`, '案例数']} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Cases by Province */}
          <Card>
            <CardHeader>
              <CardTitle>地区案例分布</CardTitle>
              <CardDescription>各省市案例数量和罚款金额</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={casesByProvince}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="province" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'cases' ? `${value} 个案例` : `¥${(value as number / 10000).toFixed(1)}万`,
                      name === 'cases' ? '案例数' : '罚款金额'
                    ]}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="cases" fill="#8884d8" name="案例数" />
                  <Bar yAxisId="right" dataKey="penalties" fill="#82ca9d" name="罚款金额" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Processing Trend */}
          <Card>
            <CardHeader>
              <CardTitle>文档处理趋势</CardTitle>
              <CardDescription>文档处理状态的月度变化</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={processingTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => [`${value} 个文档`, name]} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="processed" 
                    stroke="#82ca9d" 
                    strokeWidth={2}
                    name="已处理"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="pending" 
                    stroke="#ffc658" 
                    strokeWidth={2}
                    name="处理中"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="failed" 
                    stroke="#ff7300" 
                    strokeWidth={2}
                    name="处理失败"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Summary Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>统计摘要</CardTitle>
            <CardDescription>关键指标的详细统计信息</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <h4 className="font-medium">案例处理效率</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>平均处理时间:</span>
                    <span className="font-medium">15.2天</span>
                  </div>
                  <div className="flex justify-between">
                    <span>最快处理时间:</span>
                    <span className="font-medium">3天</span>
                  </div>
                  <div className="flex justify-between">
                    <span>最慢处理时间:</span>
                    <span className="font-medium">45天</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">罚款统计</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>平均罚款金额:</span>
                    <span className="font-medium">¥20.4万</span>
                  </div>
                  <div className="flex justify-between">
                    <span>最高罚款金额:</span>
                    <span className="font-medium">¥120万</span>
                  </div>
                  <div className="flex justify-between">
                    <span>最低罚款金额:</span>
                    <span className="font-medium">¥5万</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">文档处理</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>总文档数:</span>
                    <span className="font-medium">1,245个</span>
                  </div>
                  <div className="flex justify-between">
                    <span>OCR平均置信度:</span>
                    <span className="font-medium">92.3%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>处理成功率:</span>
                    <span className="font-medium">94.2%</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}