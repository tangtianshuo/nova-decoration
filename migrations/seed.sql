INSERT INTO tenants (id, name, status, created_at, updated_at)
VALUES
  ('0f1e2d3c-4b5a-4768-8a9b-0c1d2e3f4a5b', '星河装饰租户', 'active', '2024-01-15T10:00:00Z', '2026-04-26T10:00:00Z');

INSERT INTO companies (id, tenant_id, name, logo_url, intro, contact_phone, contact_wechat, contact_address, status, created_at, updated_at)
VALUES ('1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d', '0f1e2d3c-4b5a-4768-8a9b-0c1d2e3f4a5b', '星河装饰设计', '', '星河装饰设计成立于2015年，专注于家装与工装设计领域。我们拥有一支经验丰富的设计团队，为客户提供从方案设计到施工落地的一站式服务。', '400-888-6666', 'xinghe_design', '上海市浦东新区陆家嘴环路1000号', 'active', '2024-01-15T10:00:00Z', '2026-04-26T10:00:00Z');

-- 固定开发管理员账号：
-- email: admin@nova.local
-- password: 12345678
-- 注意：该 password_hash 仅基于明文密码（无 pepper）计算，不依赖 JWT_SECRET
INSERT INTO users (id, tenant_id, email, password_hash, role, status, created_at, updated_at)
VALUES
  ('2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e', '0f1e2d3c-4b5a-4768-8a9b-0c1d2e3f4a5b', 'admin@nova.local', 'ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f', 'tenant_admin', 'active', '2026-04-26T10:00:00Z', '2026-04-26T10:00:00Z'),
  ('3c4d5e6f-7a8b-4c9d-8e0f-2a3b4c5d6e7f', NULL, 'superadmin@nova.local', 'ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f', 'super_admin', 'active', '2026-04-26T10:00:00Z', '2026-04-26T10:00:00Z');

INSERT INTO assets (id, tenant_id, source_type, asset_type, url, cover_url, bilibili_bvid, title, size_bytes, duration_sec, status, created_at, updated_at)
VALUES
  ('4d5e6f70-8a9b-4d0e-8f1a-3b4c5d6e7f80', '0f1e2d3c-4b5a-4768-8a9b-0c1d2e3f4a5b', 'upload', 'image', 'https://picsum.photos/seed/living/800/450', '', '', '现代简约客厅', 280000, 0, 'ready', '2026-04-20T10:00:00Z', '2026-04-20T10:00:00Z'),
  ('5e6f7081-9a0b-4e1f-8a2b-4c5d6e7f8091', '0f1e2d3c-4b5a-4768-8a9b-0c1d2e3f4a5b', 'upload', 'image', 'https://picsum.photos/seed/bedroom/800/450', '', '', '轻奢卧室', 320000, 0, 'ready', '2026-04-21T10:00:00Z', '2026-04-21T10:00:00Z'),
  ('6f708192-0a1b-4f2a-8b3c-5d6e7f8091a2', '0f1e2d3c-4b5a-4768-8a9b-0c1d2e3f4a5b', 'bilibili', 'video', 'https://www.bilibili.com/video/BV1GJ411x7h7/', '', 'BV1GJ411x7h7', '样板间全景讲解', 0, 180, 'ready', '2026-04-22T10:00:00Z', '2026-04-22T10:00:00Z');

INSERT INTO pages (id, tenant_id, slug, title, summary, publish_status, published_at, created_at, updated_at)
VALUES
  ('708192a3-1b2c-403b-8c4d-6e7f8091a2b3', '0f1e2d3c-4b5a-4768-8a9b-0c1d2e3f4a5b', 'modern-living-room', '现代简约客厅案例', '180平米现代简约风格客厅设计方案', 'published', '2026-04-20T10:00:00Z', '2026-04-18T10:00:00Z', '2026-04-20T10:00:00Z'),
  ('8192a3b4-2c3d-414c-8d5e-7f8091a2b3c4', '0f1e2d3c-4b5a-4768-8a9b-0c1d2e3f4a5b', 'office-design', '科技企业办公室设计', '2000平米科技企业办公空间设计', 'draft', NULL, '2026-04-25T10:00:00Z', '2026-04-25T10:00:00Z');

INSERT INTO page_blocks (id, page_id, tenant_id, block_type, ref_asset_id, content_json, sort_order, created_at, updated_at)
VALUES
  ('92a3b4c5-3d4e-425d-8e6f-8091a2b3c4d5', '708192a3-1b2c-403b-8c4d-6e7f8091a2b3', '0f1e2d3c-4b5a-4768-8a9b-0c1d2e3f4a5b', 'hero', '', '{"title":"现代简约客厅案例","subtitle":"180㎡ 三室两厅 · 现代简约风格"}', 0, '2026-04-18T10:00:00Z', '2026-04-18T10:00:00Z'),
  ('a3b4c5d6-4e5f-436e-8f70-91a2b3c4d5e6', '708192a3-1b2c-403b-8c4d-6e7f8091a2b3', '0f1e2d3c-4b5a-4768-8a9b-0c1d2e3f4a5b', 'company_intro', '', '', 1, '2026-04-18T10:00:00Z', '2026-04-18T10:00:00Z'),
  ('b4c5d6e7-5f60-447f-8071-a2b3c4d5e6f7', '708192a3-1b2c-403b-8c4d-6e7f8091a2b3', '0f1e2d3c-4b5a-4768-8a9b-0c1d2e3f4a5b', 'product_intro', '', '{"title":"设计亮点","description":"本案以少即是多为设计理念","features":["全屋智能灯光系统","进口环保建材","定制收纳方案","免费3D效果图"]}', 2, '2026-04-18T10:00:00Z', '2026-04-18T10:00:00Z'),
  ('c5d6e7f8-6071-4580-8172-b3c4d5e6f708', '708192a3-1b2c-403b-8c4d-6e7f8091a2b3', '0f1e2d3c-4b5a-4768-8a9b-0c1d2e3f4a5b', 'gallery', '', '', 3, '2026-04-18T10:00:00Z', '2026-04-18T10:00:00Z'),
  ('d6e7f809-7182-4691-8273-c4d5e6f70819', '708192a3-1b2c-403b-8c4d-6e7f8091a2b3', '0f1e2d3c-4b5a-4768-8a9b-0c1d2e3f4a5b', 'video', '', '', 4, '2026-04-18T10:00:00Z', '2026-04-18T10:00:00Z'),
  ('e7f8091a-8293-47a2-8374-d5e6f708192a', '708192a3-1b2c-403b-8c4d-6e7f8091a2b3', '0f1e2d3c-4b5a-4768-8a9b-0c1d2e3f4a5b', 'contact', '', '', 5, '2026-04-18T10:00:00Z', '2026-04-18T10:00:00Z');

INSERT INTO share_links (id, tenant_id, page_id, code, status, expire_at, fallback_url, scan_count, created_at, updated_at)
VALUES ('f8091a2b-93a4-48b3-8475-e6f708192a3b', '0f1e2d3c-4b5a-4768-8a9b-0c1d2e3f4a5b', '708192a3-1b2c-403b-8c4d-6e7f8091a2b3', 'AB12CD', 'active', NULL, '', 0, '2026-04-20T10:00:00Z', '2026-04-26T10:00:00Z');
