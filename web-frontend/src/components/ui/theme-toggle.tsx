"use client"

import * as React from "react"
import { Moon, Sun, Users } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ThemeToggle() {
  const { setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative overflow-hidden hover:bg-gradient-to-r hover:from-yellow-500/10 hover:to-blue-500/10 transition-all duration-200">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-yellow-500" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-blue-400" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass-card border-0 shadow-xl">
        <DropdownMenuItem onClick={() => setTheme("light")} className="hover:bg-gradient-to-r hover:from-yellow-500/10 hover:to-orange-500/10">
          <Sun className="mr-2 h-4 w-4 text-yellow-500" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className="hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-purple-500/10">
          <Moon className="mr-2 h-4 w-4 text-blue-400" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")} className="hover:bg-gradient-to-r hover:from-green-500/10 hover:to-blue-500/10">
          <Users className="mr-2 h-4 w-4 text-green-500" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}