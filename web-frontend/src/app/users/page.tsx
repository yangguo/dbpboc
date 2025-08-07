"use client";

import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, UserPlus, Edit, Trash2, Shield, ShieldCheck, Mail, Phone, Calendar } from "lucide-react";

// Mock data for users
const mockUsers = [
  {
    id: "USER-001",
    username: "admin",
    email: "admin@pboc.gov.cn",
    fullName: "系统管理员",
    role: "超级管理员",
    department: "信息技术部",
    phone: "010-12345678",
    status: "活跃",
    lastLogin: "2024-01-20 14:30",
    createdDate: "2023-01-01",
    avatar: ""
  },
  {
    id: "USER-002",
    username: "zhangsan",
    email: "zhangsan@pboc.gov.cn",
    fullName: "张三",
    role: "案例管理员",
    department: "法律事务部",
    phone: "010-12345679",
    status: "活跃",
    lastLogin: "2024-01-20 09:15",
    createdDate: "2023-03-15",
    avatar: ""
  },
  {
    id: "USER-003",
    username: "lisi",
    email: "lisi@pboc.gov.cn",
    fullName: "李四",
    role: "文档处理员",
    department: "监管一部",
    phone: "010-12345680",
    status: "活跃",
    lastLogin: "2024-01-19 16:45",
    createdDate: "2023-05-20",
    avatar: ""
  },
  {
    id: "USER-004",
    username: "wangwu",
    email: "wangwu@pboc.gov.cn",
    fullName: "王五",
    role: "普通用户",
    department: "监管二部",
    phone: "010-12345681",
    status: "停用",
    lastLogin: "2024-01-10 11:20",
    createdDate: "2023-08-10",
    avatar: ""
  }
];

const roleColors = {
  "超级管理员": "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
  "案例管理员": "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
  "文档处理员": "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
  "普通用户": "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
};

const statusColors = {
  "活跃": "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
  "停用": "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
  "锁定": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
};

const getRoleIcon = (role: string) => {
  switch (role) {
    case "超级管理员":
      return <ShieldCheck className="h-4 w-4 text-red-500" />;
    case "案例管理员":
    case "文档处理员":
      return <Shield className="h-4 w-4 text-blue-500" />;
    default:
      return null;
  }
};

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [users, setUsers] = useState(mockUsers);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    fullName: "",
    role: "",
    department: "",
    phone: ""
  });

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    const matchesDepartment = departmentFilter === "all" || user.department === departmentFilter;
    
    return matchesSearch && matchesRole && matchesStatus && matchesDepartment;
  });

  const handleCreateUser = () => {
    if (newUser.username && newUser.email && newUser.fullName && newUser.role) {
      // Mock create user functionality
      console.log("Creating user:", newUser);
      setIsCreateDialogOpen(false);
      setNewUser({
        username: "",
        email: "",
        fullName: "",
        role: "",
        department: "",
        phone: ""
      });
    }
  };

  const handleEdit = (userId: string) => {
    console.log("Editing user:", userId);
  };

  const handleDelete = (userId: string) => {
    console.log("Deleting user:", userId);
  };

  const handleToggleStatus = (userId: string) => {
    setUsers(users.map(user => 
      user.id === userId 
        ? { ...user, status: user.status === "活跃" ? "停用" : "活跃" }
        : user
    ));
  };

  const getInitials = (name: string) => {
    return name.split('').slice(0, 2).join('').toUpperCase();
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">用户管理</h1>
            <p className="text-muted-foreground">管理系统用户和权限</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                新增用户
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>新增用户</DialogTitle>
                <DialogDescription>
                  创建新的系统用户账户
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">用户名</label>
                    <Input
                      placeholder="输入用户名"
                      value={newUser.username}
                      onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">姓名</label>
                    <Input
                      placeholder="输入真实姓名"
                      value={newUser.fullName}
                      onChange={(e) => setNewUser({...newUser, fullName: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">邮箱</label>
                  <Input
                    type="email"
                    placeholder="输入邮箱地址"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">角色</label>
                    <Select value={newUser.role} onValueChange={(value) => setNewUser({...newUser, role: value})}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="选择角色" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="超级管理员">超级管理员</SelectItem>
                        <SelectItem value="案例管理员">案例管理员</SelectItem>
                        <SelectItem value="文档处理员">文档处理员</SelectItem>
                        <SelectItem value="普通用户">普通用户</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">部门</label>
                    <Select value={newUser.department} onValueChange={(value) => setNewUser({...newUser, department: value})}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="选择部门" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="信息技术部">信息技术部</SelectItem>
                        <SelectItem value="法律事务部">法律事务部</SelectItem>
                        <SelectItem value="监管一部">监管一部</SelectItem>
                        <SelectItem value="监管二部">监管二部</SelectItem>
                        <SelectItem value="监管三部">监管三部</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">电话</label>
                  <Input
                    placeholder="输入联系电话"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    取消
                  </Button>
                  <Button onClick={handleCreateUser} disabled={!newUser.username || !newUser.email || !newUser.fullName || !newUser.role}>
                    创建
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Filter Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              搜索与筛选
            </CardTitle>
            <CardDescription>
              搜索用户姓名、用户名、邮箱或部门
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索用户姓名、用户名、邮箱或部门..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="角色" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有角色</SelectItem>
                    <SelectItem value="超级管理员">超级管理员</SelectItem>
                    <SelectItem value="案例管理员">案例管理员</SelectItem>
                    <SelectItem value="文档处理员">文档处理员</SelectItem>
                    <SelectItem value="普通用户">普通用户</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有状态</SelectItem>
                    <SelectItem value="活跃">活跃</SelectItem>
                    <SelectItem value="停用">停用</SelectItem>
                    <SelectItem value="锁定">锁定</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="部门" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有部门</SelectItem>
                    <SelectItem value="信息技术部">信息技术部</SelectItem>
                    <SelectItem value="法律事务部">法律事务部</SelectItem>
                    <SelectItem value="监管一部">监管一部</SelectItem>
                    <SelectItem value="监管二部">监管二部</SelectItem>
                    <SelectItem value="监管三部">监管三部</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>用户列表</CardTitle>
            <CardDescription>
              找到 {filteredUsers.length} 个用户
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>用户</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>部门</TableHead>
                    <TableHead>联系方式</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>最后登录</TableHead>
                    <TableHead>创建日期</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback>{getInitials(user.fullName)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.fullName}</div>
                            <div className="text-sm text-muted-foreground">@{user.username}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getRoleIcon(user.role)}
                          <Badge className={roleColors[user.role as keyof typeof roleColors]}>
                            {user.role}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>{user.department}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {user.phone}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[user.status as keyof typeof statusColors]}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {user.lastLogin}
                        </div>
                      </TableCell>
                      <TableCell>{user.createdDate}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(user.id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(user.id)}
                            className={user.status === "活跃" ? "text-red-600" : "text-green-600"}
                          >
                            {user.status === "活跃" ? "停用" : "启用"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(user.id)}
                            className="text-red-600"
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