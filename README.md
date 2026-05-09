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
pnpm run lint
pnpm run test
pnpm run build
```

## 端到端测试（Playwright）

首次运行先安装浏览器：

```bash
pnpm run e2e:install
```

运行 E2E（默认无头）：

```bash
pnpm run e2e
```

可视化调试：

```bash
pnpm run e2e:headed
pnpm run e2e:ui
```

说明：
- Playwright 会自动启动 Vite（`--mode e2e`），并读取 `.env.e2e`。
- 当前用例使用 Mock 登录流程，不依赖 API 服务即可执行。

## 环境说明

- `wrangler.toml` 默认是本地开发配置。
- `env.staging` 和 `env.production` 仅保存非敏感变量。
- `JWT_SECRET` 等敏感配置请放入 Worker secrets（或 `.dev.vars`）。
- 计费回调验签密钥 `BILLING_WEBHOOK_SECRET` 请放入 Worker secrets（或 `.dev.vars`）。

## 商业化能力验证

执行 API 冒烟（需本地 API 服务已启动）：

```bash
node scripts/api-smoke.mjs
```

该脚本会覆盖：
- 平台租户管理与跨租户权限拦截
- 租户订阅查询与套餐变更
- 配额查询与基础用量读取
