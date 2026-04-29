INSERT INTO companies (id, name, logo_url, intro, contact_phone, contact_wechat, contact_address, status, created_at, updated_at)
VALUES ('cp_demo001', '星河装饰设计', '', '星河装饰设计成立于2015年，专注于家装与工装设计领域。我们拥有一支经验丰富的设计团队，为客户提供从方案设计到施工落地的一站式服务。', '400-888-6666', 'xinghe_design', '上海市浦东新区陆家嘴环路1000号', 'active', '2024-01-15T10:00:00Z', '2026-04-26T10:00:00Z');

INSERT INTO assets (id, company_id, source_type, asset_type, url, cover_url, bilibili_bvid, title, size_bytes, duration_sec, status, created_at, updated_at)
VALUES
  ('as_001', 'cp_demo001', 'upload', 'image', 'https://picsum.photos/seed/living/800/450', '', '', '现代简约客厅', 280000, 0, 'ready', '2026-04-20T10:00:00Z', '2026-04-20T10:00:00Z'),
  ('as_002', 'cp_demo001', 'upload', 'image', 'https://picsum.photos/seed/bedroom/800/450', '', '', '轻奢卧室', 320000, 0, 'ready', '2026-04-21T10:00:00Z', '2026-04-21T10:00:00Z'),
  ('as_003', 'cp_demo001', 'bilibili', 'video', 'https://www.bilibili.com/video/BV1GJ411x7h7/', '', 'BV1GJ411x7h7', '样板间全景讲解', 0, 180, 'ready', '2026-04-22T10:00:00Z', '2026-04-22T10:00:00Z');

INSERT INTO pages (id, company_id, slug, title, summary, publish_status, published_at, created_at, updated_at)
VALUES
  ('pg_001', 'cp_demo001', 'modern-living-room', '现代简约客厅案例', '180平米现代简约风格客厅设计方案', 'published', '2026-04-20T10:00:00Z', '2026-04-18T10:00:00Z', '2026-04-20T10:00:00Z'),
  ('pg_002', 'cp_demo001', 'office-design', '科技企业办公室设计', '2000平米科技企业办公空间设计', 'draft', NULL, '2026-04-25T10:00:00Z', '2026-04-25T10:00:00Z');

INSERT INTO page_blocks (id, page_id, company_id, block_type, ref_asset_id, content_json, sort_order, created_at, updated_at)
VALUES
  ('blk_01', 'pg_001', 'cp_demo001', 'hero', '', '{"title":"现代简约客厅案例","subtitle":"180㎡ 三室两厅 · 现代简约风格"}', 0, '2026-04-18T10:00:00Z', '2026-04-18T10:00:00Z'),
  ('blk_02', 'pg_001', 'cp_demo001', 'company_intro', '', '', 1, '2026-04-18T10:00:00Z', '2026-04-18T10:00:00Z'),
  ('blk_03', 'pg_001', 'cp_demo001', 'product_intro', '', '{"title":"设计亮点","description":"本案以少即是多为设计理念","features":["全屋智能灯光系统","进口环保建材","定制收纳方案","免费3D效果图"]}', 2, '2026-04-18T10:00:00Z', '2026-04-18T10:00:00Z'),
  ('blk_04', 'pg_001', 'cp_demo001', 'gallery', '', '', 3, '2026-04-18T10:00:00Z', '2026-04-18T10:00:00Z'),
  ('blk_05', 'pg_001', 'cp_demo001', 'video', '', '', 4, '2026-04-18T10:00:00Z', '2026-04-18T10:00:00Z'),
  ('blk_06', 'pg_001', 'cp_demo001', 'contact', '', '', 5, '2026-04-18T10:00:00Z', '2026-04-18T10:00:00Z');

INSERT INTO share_links (id, company_id, page_id, code, status, expire_at, fallback_url, scan_count, created_at, updated_at)
VALUES ('sl_001', 'cp_demo001', 'pg_001', 'AB12CD', 'active', NULL, '', 0, '2026-04-20T10:00:00Z', '2026-04-26T10:00:00Z');
