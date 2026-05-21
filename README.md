# CreatorIntel 游戏博主智能检索平台

这是一个可部署的 Next.js 原型站点，主生产页面位于 `app/page.tsx`。`preview.html` 仅作为静态备用预览，不参与生产构建。

## 本地运行

先创建 `.env.local`：

```bash
YOUTUBE_API_KEY=your_youtube_data_api_v3_key_here
```

该密钥用于 `app/api/youtube-search/route.ts` 调用 YouTube Data API v3。

```bash
npm install
npm run dev
```

打开本地开发地址：

```text
http://localhost:3000
```

## 生产构建

```bash
npm run build
npm run start
```

## Vercel 部署

1. 将项目推送到 GitHub、GitLab 或 Bitbucket。
2. 在 Vercel 中选择 `New Project`，导入该仓库。
3. Framework Preset 选择 `Next.js`。
4. 保持默认命令即可：
   - Install Command: `npm install`
   - Build Command: `npm run build`
   - Output Directory: `.next`
5. 在 Vercel 的 Environment Variables 中添加：
   - `YOUTUBE_API_KEY`
6. 点击 `Deploy`。

Vercel 会使用 `app/page.tsx` 作为主页面进行构建和部署。
