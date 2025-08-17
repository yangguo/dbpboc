"use client";

import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {

  return (
    <header className={`flex h-16 items-center justify-between border-b border-border/50 glass-card px-6 relative overflow-hidden ${className}`}>
      {/* Decorative gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 pointer-events-none" />
      
      {/* Left side - Search and breadcrumbs */}
      <div className="flex items-center space-x-4 relative z-10">
        <div className="hidden md:flex items-center space-x-2 text-sm text-muted-foreground">
          <span className="px-2 py-1 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-md text-blue-600 dark:text-blue-400 font-medium">
            仪表板
          </span>
          <span>/</span>
          <span>概览</span>
        </div>
      </div>

      {/* Right side - notifications and theme toggle */}
      <div className="flex items-center space-x-3 relative z-10">
        {/* Quick stats */}
        <div className="hidden lg:flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="font-medium">在线</span>
          </div>
          <div className="text-muted-foreground">
            最后更新: 2分钟前
          </div>
        </div>

        {/* Notifications */}
        <Button variant="ghost" size="sm" className="relative hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-purple-500/10 transition-all duration-200">
          <Bell className="h-4 w-4" />
          <Badge 
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs gradient-destructive text-white animate-pulse"
          >
            3
          </Badge>
        </Button>

        {/* Theme toggle */}
        <ThemeToggle />

        {/* User avatar placeholder */}
        <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-sm font-bold animate-float">
          U
        </div>
      </div>
    </header>
  );
}