# 案例搜索（Netlify 版本）

轻量的 Next.js 应用，适配 Web 与手机浏览器，一键部署到 Netlify。

## 本地开发

- 安装依赖：
  - `cd netlify && npm install`
- 配置环境变量：复制 `.env.example` 为 `.env.local` 并填写：
  - `MONGODB_URL`：MongoDB 连接串
  - `MONGODB_DB`：数据库名
  - `MONGODB_COLLECTION`：集合名（可选，默认 `pbocdtl`）
- 启动：
  - `npm run dev`，打开 `http://localhost:3000`

## 部署到 Netlify

### 方式 1: Netlify CLI (推荐)
1. 安装 Netlify CLI：`npm install -g netlify-cli`
2. 在项目根目录运行：`netlify login`
3. 链接到 Netlify：`netlify link` 或 `netlify init`
4. 设置环境变量：
   ```bash
   netlify env:set MONGODB_URL "your_mongodb_connection_string"
   netlify env:set MONGODB_DB "your_database_name"
   netlify env:set MONGODB_COLLECTION "pbocdtl"
   ```
5. 部署：`netlify deploy --build --prod`

### 方式 2: Git 部署
1. 在 Netlify 控制台导入 GitHub 仓库
2. 设置构建设置：
   - Base directory: `netlify/`
   - Build command: `npm run build`
   - Publish directory: `.next`
3. 在 Site Settings → Environment Variables 中设置：
   - `MONGODB_URL`
   - `MONGODB_DB`
   - `MONGODB_COLLECTION`（可选）
4. 直接 Deploy 即可。

## 路由说明

- 页面：根路径 `/`
- API：`/api/mongodb-search`（Netlify Functions，直连 MongoDB）
- 数据导出：`/api/mongodb-export`（支持 CSV/JSON 格式）

## 注意

- 该版本对 `_id` 做了投影删除（不返回），并在 UI 中去除重复字段；`null/undefined` 显示为空。
- 若你的数据的“企业名称”字段不同（如 `company_name`、`org_name` 等），标题会自动回退匹配这些别名；可在 `src/app/mongodb-search/page.tsx` 的 `getTitle` 中扩展。
- API 路由将自动转换为 Netlify Functions，支持无服务器部署。

## 与 Vercel 版本的区别

- 使用 Netlify Functions 替代 Vercel Edge Functions
- 配置文件使用 `netlify.toml` 替代 `vercel.json`
- 环境变量配置方式略有不同
- 支持 Netlify CLI 进行部署和管理
