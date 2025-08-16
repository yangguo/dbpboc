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
        "flex h-full flex-col border-r bg-background transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b">
        {!isCollapsed && (
          <h1 className="text-xl font-bold text-primary">PBOC 案例管理</h1>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8 p-0"
        >
          {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.children && item.children.some(child => pathname === child.href));
          const hasChildren = item.children && item.children.length > 0;
          
          return (
            <div key={item.name}>
              <Link href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    isCollapsed ? "px-2" : "px-3",
                    isActive && "bg-secondary text-secondary-foreground"
                  )}
                >
                  <item.icon className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
                  {!isCollapsed && <span>{item.name}</span>}
                </Button>
              </Link>
              
              {/* Sub-navigation */}
              {hasChildren && !isCollapsed && (
                <div className="ml-6 mt-1 space-y-1">
                  {item.children.map((child) => {
                    const isChildActive = pathname === child.href;
                    return (
                      <Link key={child.name} href={child.href}>
                        <Button
                          variant={isChildActive ? "secondary" : "ghost"}
                          size="sm"
                          className={cn(
                            "w-full justify-start text-sm",
                            isChildActive && "bg-secondary text-secondary-foreground"
                          )}
                        >
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
      <div className="border-t p-4">
        {!isCollapsed && (
          <div className="text-xs text-muted-foreground">
            <p>PBOC 案例管理系统</p>
            <p>版本 1.0.0</p>
          </div>
        )}
      </div>
    </div>
  );
}