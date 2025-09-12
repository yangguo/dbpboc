export const metadata = {
  title: '案例搜索（Vercel 版）',
  description: '适用于 Web 和手机浏览器的案例搜索 UI，可直接部署到 Vercel',
}

import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body>
        <div className="container">
          {children}
        </div>
      </body>
    </html>
  )
}

