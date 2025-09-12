# 案例搜索（Vercel 版本）

轻量的 Next.js 应用，适配 Web 与手机浏览器，一键部署到 Vercel。

## 本地开发

- 安装依赖：
  - `cd vercel && npm install`
- 配置环境变量：复制 `.env.example` 为 `.env.local` 并填写：
  - `MONGODB_URL`：MongoDB 连接串
  - `MONGODB_DB`：数据库名
  - `MONGODB_COLLECTION`：集合名（可选，默认 `pbocdtl`）
- 启动：
  - `npm run dev`，打开 `http://localhost:3000`

## 部署到 Vercel

- 在 Vercel 上导入该子目录作为项目根（`vercel/`）
- 在 Project Settings → Environment Variables 中设置：
  - `MONGODB_URL`
  - `MONGODB_DB`
  - `MONGODB_COLLECTION`（可选）
- 直接 Deploy 即可。

## 路由说明

- 页面：根路径 `/`
- API：`/api/mongodb-search`（Node.js Runtime，直连 MongoDB）

## 注意

- 该版本对 `_id` 做了投影删除（不返回），并在 UI 中去除重复字段；`null/undefined` 显示为空。
- 若你的数据的“企业名称”字段不同（如 `company_name`、`org_name` 等），标题会自动回退匹配这些别名；可在 `src/app/mongodb-search/page.tsx` 的 `getTitle` 中扩展。
