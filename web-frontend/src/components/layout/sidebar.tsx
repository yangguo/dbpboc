"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Search,
  FileText,
  Settings,
  Menu,
  X,
  BarChart3,
  Upload,
  RefreshCw
} from "lucide-react";

const navigation = [
  {
    name: "仪表板",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "案例搜索",
    href: "/cases",
    icon: Search,
  },
  {
    name: "案例更新",
    href: "/update",
    icon: RefreshCw,
    children: [
      {
        name: "批量更新",
        href: "/update",
      },
      {
        name: "选择性更新",
        href: "/update/pending",
      },
    ],
  },
  {
    name: "文档管理",
    href: "/documents",
    icon: FileText,
  },
  {
    name: "文档上传",
    href: "/upload",
    icon: Upload,
  },
  {
    name: "数据分析",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    name: "设置",
    href: "/settings",
    icon: Settings,
  },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <div
      className={cn(
        "flex h-full flex-col glass-sidebar transition-all duration-300 relative overflow-hidden",
        isCollapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-transparent pointer-events-none" />
      
      {/* Header */}
      <div className="relative flex h-16 items-center justify-between px-4 border-b border-white/10">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center animate-pulse-slow">
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              PBOC 案例管理
            </h1>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8 p-0 hover:bg-white/10 text-sidebar-foreground"
        >
          {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="relative flex-1 space-y-2 p-3">
        {navigation.map((item, index) => {
          const isActive = pathname === item.href || (item.children && item.children.some(child => pathname === child.href));
          const hasChildren = item.children && item.children.length > 0;
          
          return (
            <div key={item.name} className="relative">
              <Link href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start relative overflow-hidden transition-all duration-200 hover:scale-105",
                    isCollapsed ? "px-2" : "px-3",
                    isActive 
                      ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-blue-400/30 shadow-lg shadow-blue-500/20" 
                      : "hover:bg-white/10 text-sidebar-foreground hover:text-white"
                  )}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 animate-pulse" />
                  )}
                  <item.icon className={cn(
                    "h-4 w-4 relative z-10 transition-colors",
                    isActive ? "text-blue-300" : "",
                    !isCollapsed && "mr-3"
                  )} />
                  {!isCollapsed && (
                    <span className="relative z-10 font-medium">{item.name}</span>
                  )}
                  {isActive && !isCollapsed && (
                    <div className="absolute right-2 w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                  )}
                </Button>
              </Link>
              
              {/* Sub-navigation */}
              {hasChildren && !isCollapsed && (
                <div className="ml-6 mt-2 space-y-1 border-l border-white/10 pl-3">
                  {item.children.map((child) => {
                    const isChildActive = pathname === child.href;
                    return (
                      <Link key={child.name} href={child.href}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "w-full justify-start text-sm transition-all duration-200",
                            isChildActive 
                              ? "bg-gradient-to-r from-blue-500/15 to-purple-500/15 text-blue-300 border-l-2 border-blue-400" 
                              : "hover:bg-white/5 text-sidebar-foreground/80 hover:text-white hover:border-l-2 hover:border-white/30"
                          )}
                        >
                          <div className="w-2 h-2 rounded-full bg-current opacity-50 mr-2" />
                          {child.name}
                        </Button>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="relative border-t border-white/10 p-4">
        {!isCollapsed && (
          <div className="text-xs text-sidebar-foreground/60 space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <p className="font-medium">系统运行正常</p>
            </div>
            <p>版本 1.0.0</p>
            <div className="mt-2 pt-2 border-t border-white/10">
              <p className="text-xs opacity-75">© 2024 PBOC 案例管理</p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="flex justify-center">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
}