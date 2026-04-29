# Nova Decoration

装修企业设计与产品展示平台，支持：
- 企业素材上传（图片/视频）
- Bilibili 外链接入
- 展示页发布与短链二维码分享
- 二维码失效兜底页

技术栈：
- 前端：React + Vite + TypeScript
- API：Cloudflare Workers + Hono
- 数据：D1
- 存储：R2

## 本地开发

1. 安装依赖

```bash
pnpm install
```

2. 配置环境变量

- 复制 `.env.example` 为 `.env`
- 复制 `.dev.vars.example` 为 `.dev.vars`

3. 初始化本地数据库

```bash
pnpm run db:init
pnpm run db:seed
```

4. 启动服务

```bash
pnpm run dev:api
pnpm run dev
```

## 质量检查

```bash
pnpm run check
pnpm run build
```

## 环境说明

- `wrangler.toml` 默认是本地开发配置。
- `env.staging` 和 `env.production` 仅保存非敏感变量。
- `JWT_SECRET` 等敏感配置请放入 Worker secrets（或 `.dev.vars`）。
