# API 接口规范（Cloudflare Workers）

## 1. 通用约定

- Base URL：`https://api.yourdomain.com`
- 认证：`Authorization: Bearer <JWT>`
- 返回格式：

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

- 错误码建议：
  - `4001` 参数错误
  - `4003` 鉴权失败
  - `4004` 资源不存在
  - `4090` 资源冲突
  - `5000` 系统异常

## 2. 鉴权接口

### 2.1 登录

- `POST /api/auth/login`
- 请求体：

```json
{
  "email": "admin@demo.com",
  "password": "******"
}
```

- 响应：JWT、用户信息、公司信息摘要

## 3. 公司与页面管理

### 3.1 获取公司信息

- `GET /api/company/me`

### 3.2 更新公司信息

- `PUT /api/company/me`

### 3.3 创建页面

- `POST /api/pages`

### 3.4 更新页面

- `PUT /api/pages/:id`

### 3.5 发布页面

- `POST /api/pages/:id/publish`

## 4. 素材与上传

### 4.1 获取上传签名

- `POST /api/upload/sign`
- 请求体：

```json
{
  "assetType": "image",
  "fileName": "cover.jpg",
  "contentType": "image/jpeg",
  "sizeBytes": 280000
}
```

- 响应体：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "uploadUrl": "https://...",
    "objectKey": "company/cp_xxx/2026/04/cover.jpg",
    "headers": {
      "Content-Type": "image/jpeg"
    },
    "expireAt": "2026-04-26T12:00:00Z"
  }
}
```

### 4.2 上传完成回写

- `POST /api/assets/complete`
- 请求体：

```json
{
  "objectKey": "company/cp_xxx/2026/04/cover.jpg",
  "assetType": "image",
  "title": "客厅效果图"
}
```

### 4.3 录入 Bilibili 外链

- `POST /api/assets/bilibili`
- 请求体：

```json
{
  "url": "https://www.bilibili.com/video/BV1xx411c7mD/",
  "title": "样板间讲解"
}
```

## 5. 短链与二维码

### 5.1 创建短链

- `POST /api/share-links`
- 请求体：

```json
{
  "pageId": "pg_xxx",
  "expireAt": null,
  "fallbackUrl": "https://www.yourdomain.com/fallback"
}
```

### 5.2 获取二维码信息

- `GET /api/share-links/:id/qrcode`
- 返回：短链 URL、二维码图片 URL（或 base64）

### 5.3 访问短链（公开）

- `GET /q/:code`
- 逻辑：
  - code 不存在 -> 302 到兜底页
  - status 非 active -> 302 到兜底页
  - 已过期 -> 302 到兜底页
  - 正常 -> 302 到展示页并记录 scan 事件

## 6. 公开展示接口

### 6.1 获取展示页数据（公开）

- `GET /api/public/pages-by-id/:id`
- 响应包含：
  - 公司信息
  - 展示模块（图文/视频/B 站链接）
  - 联系方式

## 7. 统计接口

### 7.1 事件上报

- `POST /api/events`
- 请求体：

```json
{
  "eventType": "play",
  "pageId": "pg_xxx",
  "shareLinkId": "sl_xxx",
  "eventData": {
    "assetId": "as_xxx"
  }
}
```

## 8. 安全与限流建议

- 登录接口：IP + 账号双维度限流
- 上传签名：按公司配额控制（次数/文件大小/类型）
- 公开接口：防刷限流 + 缓存
- 所有写接口：JWT 必须校验 `company_id`
