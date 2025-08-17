"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, FileText, TrendingUp, Sparkles } from "lucide-react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard after a short delay to show the loading animation
    const timer = setTimeout(() => {
      router.push("/dashboard");
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-purple-900/20 dark:to-slate-900" />
      
      {/* Animated background elements */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-400/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-pink-400/20 rounded-full blur-2xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
      
      {/* Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen">
        <div className="text-center space-y-8 max-w-md mx-auto px-6">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center animate-float shadow-2xl shadow-blue-500/30">
                <BarChart3 className="h-10 w-10 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-pulse">
                <Sparkles className="h-3 w-3 text-white" />
              </div>
            </div>
          </div>
          
          {/* Title */}
          <div className="space-y-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-gradient">
              PBOC 案例管理系统
            </h1>
            <p className="text-lg text-muted-foreground">
              中国人民银行案例管理和文档处理系统
            </p>
          </div>
          
          {/* Features */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            <div className="text-center space-y-2 p-4 rounded-xl glass-card hover:scale-105 transition-all duration-300">
              <div className="w-12 h-12 mx-auto rounded-lg gradient-info flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <p className="text-sm font-medium">案例管理</p>
            </div>
            <div className="text-center space-y-2 p-4 rounded-xl glass-card hover:scale-105 transition-all duration-300" style={{ animationDelay: '0.2s' }}>
              <div className="w-12 h-12 mx-auto rounded-lg gradient-success flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <p className="text-sm font-medium">数据分析</p>
            </div>
            <div className="text-center space-y-2 p-4 rounded-xl glass-card hover:scale-105 transition-all duration-300" style={{ animationDelay: '0.4s' }}>
              <div className="w-12 h-12 mx-auto rounded-lg gradient-accent flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <p className="text-sm font-medium">智能报告</p>
            </div>
          </div>
          
          {/* Loading */}
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="flex space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" />
                <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
            <p className="text-muted-foreground animate-pulse">正在加载系统...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
