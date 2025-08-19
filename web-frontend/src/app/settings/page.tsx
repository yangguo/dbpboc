"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Bell, Shield, Database, Save, Globe, Palette } from "lucide-react";

export default function SettingsPage() {
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: true,
    caseUpdates: true,
    documentProcessing: true,
    systemAlerts: false,
    weeklyReports: true
  });

  const [security, setSecurity] = useState({
    dataEncryption: true,
    auditLogging: true,
    accessControl: true
  });

  const [system, setSystem] = useState({
    language: "zh-CN",
    timezone: "Asia/Shanghai",
    dateFormat: "YYYY-MM-DD",
    theme: "light",
    pageSize: "20",
    autoSave: true
  });

  const [database, setDatabase] = useState({
    backupFrequency: "daily",
    retentionPeriod: "365",
    compressionEnabled: true,
    encryptionEnabled: true
  });

  const handleNotificationsSave = () => {
    console.log("Saving notifications:", notifications);
  };

  const handleSecuritySave = () => {
    console.log("Saving security:", security);
  };

  const handleSystemSave = () => {
    console.log("Saving system:", system);
  };

  const handleDatabaseSave = () => {
    console.log("Saving database:", database);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">系统设置</h1>
          <p className="text-muted-foreground">管理系统配置和偏好设置</p>
        </div>

        <Tabs defaultValue="notifications" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              通知设置
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              安全设置
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              系统偏好
            </TabsTrigger>
            <TabsTrigger value="database" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              数据管理
            </TabsTrigger>
          </TabsList>

          {/* Notification Settings */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>通知设置</CardTitle>
                <CardDescription>配置您希望接收的通知类型</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">邮件通知</h4>
                      <p className="text-sm text-muted-foreground">通过邮件接收重要通知</p>
                    </div>
                    <Switch
                      checked={notifications.emailNotifications}
                      onCheckedChange={(checked) => setNotifications({...notifications, emailNotifications: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">推送通知</h4>
                      <p className="text-sm text-muted-foreground">在浏览器中显示推送通知</p>
                    </div>
                    <Switch
                      checked={notifications.pushNotifications}
                      onCheckedChange={(checked) => setNotifications({...notifications, pushNotifications: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">案例更新</h4>
                      <p className="text-sm text-muted-foreground">案例状态变更时通知</p>
                    </div>
                    <Switch
                      checked={notifications.caseUpdates}
                      onCheckedChange={(checked) => setNotifications({...notifications, caseUpdates: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">文档处理</h4>
                      <p className="text-sm text-muted-foreground">文档处理完成时通知</p>
                    </div>
                    <Switch
                      checked={notifications.documentProcessing}
                      onCheckedChange={(checked) => setNotifications({...notifications, documentProcessing: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">系统警报</h4>
                      <p className="text-sm text-muted-foreground">系统错误和警告通知</p>
                    </div>
                    <Switch
                      checked={notifications.systemAlerts}
                      onCheckedChange={(checked) => setNotifications({...notifications, systemAlerts: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">周报</h4>
                      <p className="text-sm text-muted-foreground">每周数据统计报告</p>
                    </div>
                    <Switch
                      checked={notifications.weeklyReports}
                      onCheckedChange={(checked) => setNotifications({...notifications, weeklyReports: checked})}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleNotificationsSave} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white border-green-600 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold">
                    <Save className="h-4 w-4" />
                    保存设置
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>安全设置</CardTitle>
                <CardDescription>管理系统安全和数据保护设置</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">数据加密</h4>
                      <p className="text-sm text-muted-foreground">启用数据传输和存储加密</p>
                    </div>
                    <Switch
                      checked={security.dataEncryption}
                      onCheckedChange={(checked) => setSecurity({...security, dataEncryption: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">审计日志</h4>
                      <p className="text-sm text-muted-foreground">记录系统操作和数据访问日志</p>
                    </div>
                    <Switch
                      checked={security.auditLogging}
                      onCheckedChange={(checked) => setSecurity({...security, auditLogging: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">访问控制</h4>
                      <p className="text-sm text-muted-foreground">启用基于角色的访问控制</p>
                    </div>
                    <Switch
                      checked={security.accessControl}
                      onCheckedChange={(checked) => setSecurity({...security, accessControl: checked})}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSecuritySave} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white border-green-600 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold">
                    <Save className="h-4 w-4" />
                    保存设置
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Preferences */}
          <TabsContent value="system">
            <Card>
              <CardHeader>
                <CardTitle>系统偏好</CardTitle>
                <CardDescription>自定义系统界面和行为设置</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">语言</label>
                    <Select value={system.language} onValueChange={(value) => setSystem({...system, language: value})}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="zh-CN">简体中文</SelectItem>
                        <SelectItem value="zh-TW">繁体中文</SelectItem>
                        <SelectItem value="en-US">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">时区</label>
                    <Select value={system.timezone} onValueChange={(value) => setSystem({...system, timezone: value})}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Shanghai">北京时间 (UTC+8)</SelectItem>
                        <SelectItem value="Asia/Hong_Kong">香港时间 (UTC+8)</SelectItem>
                        <SelectItem value="UTC">协调世界时 (UTC)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">日期格式</label>
                    <Select value={system.dateFormat} onValueChange={(value) => setSystem({...system, dateFormat: value})}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="YYYY-MM-DD">2024-01-20</SelectItem>
                        <SelectItem value="DD/MM/YYYY">20/01/2024</SelectItem>
                        <SelectItem value="MM/DD/YYYY">01/20/2024</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium flex items-center gap-1">
                      <Palette className="h-4 w-4" />
                      主题
                    </label>
                    <Select value={system.theme} onValueChange={(value) => setSystem({...system, theme: value})}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">浅色主题</SelectItem>
                        <SelectItem value="dark">深色主题</SelectItem>
                        <SelectItem value="auto">跟随系统</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">每页显示条数</label>
                    <Select value={system.pageSize} onValueChange={(value) => setSystem({...system, pageSize: value})}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10条</SelectItem>
                        <SelectItem value="20">20条</SelectItem>
                        <SelectItem value="50">50条</SelectItem>
                        <SelectItem value="100">100条</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between pt-6">
                    <div>
                      <h4 className="font-medium">自动保存</h4>
                      <p className="text-sm text-muted-foreground">编辑时自动保存草稿</p>
                    </div>
                    <Switch
                      checked={system.autoSave}
                      onCheckedChange={(checked) => setSystem({...system, autoSave: checked})}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSystemSave} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white border-green-600 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold">
                    <Save className="h-4 w-4" />
                    保存设置
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Database Management */}
          <TabsContent value="database">
            <Card>
              <CardHeader>
                <CardTitle>数据管理</CardTitle>
                <CardDescription>配置数据备份和存储设置</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">备份频率</label>
                    <Select value={database.backupFrequency} onValueChange={(value) => setDatabase({...database, backupFrequency: value})}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">每小时</SelectItem>
                        <SelectItem value="daily">每天</SelectItem>
                        <SelectItem value="weekly">每周</SelectItem>
                        <SelectItem value="monthly">每月</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">数据保留期（天）</label>
                    <Select value={database.retentionPeriod} onValueChange={(value) => setDatabase({...database, retentionPeriod: value})}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="90">90天</SelectItem>
                        <SelectItem value="180">180天</SelectItem>
                        <SelectItem value="365">1年</SelectItem>
                        <SelectItem value="1095">3年</SelectItem>
                        <SelectItem value="1825">5年</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">启用压缩</h4>
                      <p className="text-sm text-muted-foreground">压缩备份文件以节省存储空间</p>
                    </div>
                    <Switch
                      checked={database.compressionEnabled}
                      onCheckedChange={(checked) => setDatabase({...database, compressionEnabled: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">启用加密</h4>
                      <p className="text-sm text-muted-foreground">加密备份文件以提高安全性</p>
                    </div>
                    <Switch
                      checked={database.encryptionEnabled}
                      onCheckedChange={(checked) => setDatabase({...database, encryptionEnabled: checked})}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex gap-2">
                    <Button variant="outline">
                      立即备份
                    </Button>
                    <Button variant="outline">
                      恢复数据
                    </Button>
                    <Button variant="outline">
                      清理日志
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleDatabaseSave} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white border-green-600 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold">
                    <Save className="h-4 w-4" />
                    保存设置
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}