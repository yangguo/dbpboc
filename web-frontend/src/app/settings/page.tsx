"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { User, Bell, Shield, Database, Mail, Phone, Save, Upload, Key, Globe, Palette } from "lucide-react";

export default function SettingsPage() {
  const [profile, setProfile] = useState({
    fullName: "张三",
    username: "zhangsan",
    email: "zhangsan@pboc.gov.cn",
    phone: "010-12345679",
    department: "法律事务部",
    position: "案例管理员",
    bio: "负责案例管理和文档处理工作",
    avatar: ""
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: true,
    caseUpdates: true,
    documentProcessing: true,
    systemAlerts: false,
    weeklyReports: true
  });

  const [security, setSecurity] = useState({
    twoFactorAuth: false,
    sessionTimeout: "30",
    passwordExpiry: "90",
    loginAlerts: true
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

  const handleProfileSave = () => {
    console.log("Saving profile:", profile);
  };

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

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log("Uploading avatar:", file);
    }
  };

  const handlePasswordChange = () => {
    console.log("Changing password");
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">系统设置</h1>
          <p className="text-muted-foreground">管理您的账户设置和系统偏好</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              个人资料
            </TabsTrigger>
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

          {/* Profile Settings */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>个人资料</CardTitle>
                <CardDescription>管理您的个人信息和头像</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profile.avatar} />
                    <AvatarFallback className="text-lg">
                      {profile.fullName.split('').slice(0, 2).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      <label htmlFor="avatar-upload" className="cursor-pointer">
                        更换头像
                      </label>
                    </Button>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      支持 JPG、PNG 格式，文件大小不超过 2MB
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">姓名</label>
                    <Input
                      value={profile.fullName}
                      onChange={(e) => setProfile({...profile, fullName: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">用户名</label>
                    <Input
                      value={profile.username}
                      onChange={(e) => setProfile({...profile, username: e.target.value})}
                      className="mt-1"
                      disabled
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      邮箱
                    </label>
                    <Input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({...profile, email: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      电话
                    </label>
                    <Input
                      value={profile.phone}
                      onChange={(e) => setProfile({...profile, phone: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">部门</label>
                    <Input
                      value={profile.department}
                      onChange={(e) => setProfile({...profile, department: e.target.value})}
                      className="mt-1"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">职位</label>
                    <Input
                      value={profile.position}
                      onChange={(e) => setProfile({...profile, position: e.target.value})}
                      className="mt-1"
                      disabled
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">个人简介</label>
                  <Textarea
                    value={profile.bio}
                    onChange={(e) => setProfile({...profile, bio: e.target.value})}
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleProfileSave} className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    保存更改
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

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
                  <Button onClick={handleNotificationsSave} className="flex items-center gap-2">
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
                <CardDescription>管理您的账户安全和访问控制</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">双因素认证</h4>
                      <p className="text-sm text-muted-foreground">为您的账户添加额外的安全层</p>
                    </div>
                    <Switch
                      checked={security.twoFactorAuth}
                      onCheckedChange={(checked) => setSecurity({...security, twoFactorAuth: checked})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">会话超时（分钟）</label>
                      <Select value={security.sessionTimeout} onValueChange={(value) => setSecurity({...security, sessionTimeout: value})}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15分钟</SelectItem>
                          <SelectItem value="30">30分钟</SelectItem>
                          <SelectItem value="60">1小时</SelectItem>
                          <SelectItem value="120">2小时</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">密码过期（天）</label>
                      <Select value={security.passwordExpiry} onValueChange={(value) => setSecurity({...security, passwordExpiry: value})}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30天</SelectItem>
                          <SelectItem value="60">60天</SelectItem>
                          <SelectItem value="90">90天</SelectItem>
                          <SelectItem value="180">180天</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">登录警报</h4>
                      <p className="text-sm text-muted-foreground">异常登录时发送警报</p>
                    </div>
                    <Switch
                      checked={security.loginAlerts}
                      onCheckedChange={(checked) => setSecurity({...security, loginAlerts: checked})}
                    />
                  </div>

                  <div className="pt-4 border-t">
                    <Button onClick={handlePasswordChange} variant="outline" className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      更改密码
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSecuritySave} className="flex items-center gap-2">
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
                  <Button onClick={handleSystemSave} className="flex items-center gap-2">
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
                  <Button onClick={handleDatabaseSave} className="flex items-center gap-2">
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