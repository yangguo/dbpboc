import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";

// Use system fonts instead of Google Fonts to avoid network issues
const systemFonts = {
  variable: "--font-inter",
};

const systemMono = {
  variable: "--font-system-mono",
};

export const metadata: Metadata = {
  title: "PBOC 案例管理系统",
  description: "中国人民银行案例管理和文档处理系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${systemFonts.variable} ${systemMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
