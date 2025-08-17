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
    <header className={`flex h-16 items-center justify-between border-b bg-background px-6 ${className}`}>
      {/* Left side - could add breadcrumbs or page title here */}
      <div className="flex items-center space-x-4">
        {/* Page title or breadcrumbs can go here */}
      </div>

      {/* Right side - notifications and theme toggle */}
      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
          >
            3
          </Badge>
        </Button>

        {/* Theme toggle */}
        <ThemeToggle />
      </div>
    </header>
  );
}