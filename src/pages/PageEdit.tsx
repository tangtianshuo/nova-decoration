import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/app';
import { ArrowLeft, Save, GripVertical, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { PageBlock, ShowcasePage } from '@/types';

type BlockType = PageBlock['blockType'];

const blockTemplates: { type: BlockType; label: string; desc: string }[] = [
  { type: 'hero', label: '封面模块', desc: '封面图 + 标题 + 简介' },
  { type: 'company_intro', label: '公司介绍', desc: '展示公司简介信息' },
  { type: 'product_intro', label: '产品介绍', desc: '展示产品/服务说明' },
  { type: 'gallery', label: '图片轮播', desc: '多张图片轮播展示' },
  { type: 'video', label: '视频播放', desc: '上传视频或Bilibili外链' },
  { type: 'contact', label: '联系方式', desc: '电话、微信、地址' },
  { type: 'text', label: '自定义文本', desc: '自由编辑文本内容' },
];

function safeParse(raw: string) {
  if (!raw) return {};
  let current: unknown = raw;
  for (let i = 0; i < 2; i++) {
    if (typeof current !== 'string') break;
    try {
      current = JSON.parse(current);
    } catch {
      break;
    }
  }
  if (current && typeof current === 'object') {
    return current as Record<string, any>;
  }
  try {
    return JSON.parse(raw) as Record<string, any>;
  } catch {
    return {};
  }
}

function defaultContentByType(type: BlockType): string {
  if (type === 'hero') return JSON.stringify({ title: '', subtitle: '' });
  if (type === 'product_intro') return JSON.stringify({ title: '产品介绍', description: '', features: [] });
  if (type === 'gallery') return JSON.stringify({ assetIds: [] });
  if (type === 'video') return JSON.stringify({ assetId: '' });
  if (type === 'text') return JSON.stringify({ text: '' });
  return '';
}

export default function PageEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { pages, assets, updatePage } = useAppStore();
  const pageInStore = pages.find((p) => p.id === id);
  const [pageData, setPageData] = useState<ShowcasePage | null>(pageInStore || null);

  const [title, setTitle] = useState(pageInStore?.title || '');
  const [summary, setSummary] = useState(pageInStore?.summary || '');
  const [blocks, setBlocks] = useState<PageBlock[]>(pageInStore?.blocks || []);
  const [saving, setSaving] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(true);

  const imageAssets = useMemo(() => assets.filter((a) => a.assetType === 'image'), [assets]);
  const videoAssets = useMemo(() => assets.filter((a) => a.assetType === 'video'), [assets]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const loadPageDetail = async () => {
      setLoadingDetail(true);
      try {
        const resp = await api.get<ShowcasePage>(`/pages/${id}`);
        if (cancelled) return;
        const fullPage = resp.data;
        setPageData(fullPage);
        setTitle(fullPage.title || '');
        setSummary(fullPage.summary || '');
        setBlocks(fullPage.blocks || []);
        updatePage(fullPage);
      } catch {
        if (cancelled) return;
        setPageData(null);
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    };

    loadPageDetail();

    return () => {
      cancelled = true;
    };
  }, [id, updatePage]);

  if (loadingDetail) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">页面加载中...</p>
      </div>
    );
  }

  if (!pageData) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">页面不存在</p>
        <button onClick={() => navigate('/pages')} className="mt-4 text-indigo-600 text-sm hover:underline">
          返回列表
        </button>
      </div>
    );
  }

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('请输入页面标题');
      return;
    }
    setSaving(true);
    try {
      const data = await api.put<any>(`/pages/${id}`, {
        title,
        summary,
        blocks: blocks.map((b, index) => ({
          blockType: b.blockType,
          refAssetId: b.refAssetId || '',
          contentJson: b.contentJson,
          sortOrder: index,
        })),
      });
      updatePage(data.data);
      toast.success('保存成功');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '网络错误');
    } finally {
      setSaving(false);
    }
  };

  const addBlock = (type: BlockType) => {
    const block: PageBlock = {
      id: crypto.randomUUID(),
      pageId: id || '',
      blockType: type,
      refAssetId: '',
      contentJson: defaultContentByType(type),
      sortOrder: blocks.length,
    };
    setBlocks((prev) => [...prev, block]);
  };

  const removeBlock = (blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId).map((b, index) => ({ ...b, sortOrder: index })));
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const next = [...blocks];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setBlocks(next.map((b, i) => ({ ...b, sortOrder: i })));
  };

  const updateBlock = (blockId: string, updater: (block: PageBlock) => PageBlock) => {
    setBlocks((prev) => prev.map((b) => (b.id === blockId ? updater(b) : b)));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/pages')} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">编辑展示页</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? '保存中...' : '保存'}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">页面标题</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">页面摘要</label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">页面状态</label>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
            pageData.publishStatus === 'published' ? 'bg-green-50 text-green-700' :
            pageData.publishStatus === 'draft' ? 'bg-gray-100 text-gray-600' :
            'bg-red-50 text-red-600'
          }`}>
            {pageData.publishStatus === 'published' ? '已发布' : pageData.publishStatus === 'draft' ? '草稿' : '已下线'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">页面模块</h3>
          {blocks.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
              <p className="text-gray-400 text-sm">点击右侧模块添加内容</p>
            </div>
          ) : (
            blocks.map((block, index) => (
              <div key={block.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
                <div className="flex flex-col gap-1 pt-1">
                  <button onClick={() => moveBlock(index, 'up')} className="text-gray-400 hover:text-gray-600 disabled:opacity-30" disabled={index === 0}>
                    <GripVertical className="w-4 h-4 rotate-180" />
                  </button>
                  <button onClick={() => moveBlock(index, 'down')} className="text-gray-400 hover:text-gray-600 disabled:opacity-30" disabled={index === blocks.length - 1}>
                    <GripVertical className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {blockTemplates.find((t) => t.type === block.blockType)?.label || block.blockType}
                  </p>
                  <p className="text-xs text-gray-400">
                    {blockTemplates.find((t) => t.type === block.blockType)?.desc}
                  </p>

                  {block.blockType === 'hero' && (
                    <div className="mt-3 space-y-2">
                      <select
                        value={block.refAssetId || ''}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          const selectedAsset = imageAssets.find((asset) => asset.id === selectedId);
                          const content = safeParse(block.contentJson);
                          content.imageUrl = selectedAsset?.url || '';
                          updateBlock(block.id, (b) => ({
                            ...b,
                            refAssetId: selectedId,
                            contentJson: JSON.stringify(content),
                          }));
                        }}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      >
                        <option value="">封面图：不选择</option>
                        {imageAssets.map((asset) => (
                          <option key={asset.id} value={asset.id}>
                            {asset.title || asset.url}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={safeParse(block.contentJson).title || ''}
                        onChange={(e) => {
                          const content = safeParse(block.contentJson);
                          content.title = e.target.value;
                          updateBlock(block.id, (b) => ({ ...b, contentJson: JSON.stringify(content) }));
                        }}
                        placeholder="封面标题（可选）"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                      <input
                        type="text"
                        value={safeParse(block.contentJson).subtitle || ''}
                        onChange={(e) => {
                          const content = safeParse(block.contentJson);
                          content.subtitle = e.target.value;
                          updateBlock(block.id, (b) => ({ ...b, contentJson: JSON.stringify(content) }));
                        }}
                        placeholder="封面副标题（可选）"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                  )}

                  {block.blockType === 'company_intro' && (
                    <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
                      自动带入公司资料中的公司介绍内容。
                    </div>
                  )}

                  {block.blockType === 'product_intro' && (
                    <div className="mt-3 space-y-2">
                      <input
                        type="text"
                        value={safeParse(block.contentJson).title || ''}
                        onChange={(e) => {
                          const content = safeParse(block.contentJson);
                          content.title = e.target.value;
                          updateBlock(block.id, (b) => ({ ...b, contentJson: JSON.stringify(content) }));
                        }}
                        placeholder="模块标题"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                      <textarea
                        value={safeParse(block.contentJson).description || ''}
                        onChange={(e) => {
                          const content = safeParse(block.contentJson);
                          content.description = e.target.value;
                          updateBlock(block.id, (b) => ({ ...b, contentJson: JSON.stringify(content) }));
                        }}
                        placeholder="产品介绍描述"
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none"
                      />
                      <div className="space-y-2">
                        {(Array.isArray(safeParse(block.contentJson).features) &&
                        safeParse(block.contentJson).features.length > 0
                          ? safeParse(block.contentJson).features
                          : (Array.isArray(safeParse(block.contentJson).introItems)
                            ? safeParse(block.contentJson).introItems
                            : [])
                        ).map((item: string, idx: number) => (
                          <div key={`${block.id}-feature-${idx}`} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={item}
                              onChange={(e) => {
                                const content = safeParse(block.contentJson);
                                const current = (
                                  Array.isArray(content.features) && content.features.length > 0
                                    ? content.features
                                    : (Array.isArray(content.introItems) ? content.introItems : [])
                                ) as string[];
                                const next = [...current];
                                next[idx] = e.target.value;
                                content.features = next;
                                delete content.introItems;
                                updateBlock(block.id, (b) => ({ ...b, contentJson: JSON.stringify(content) }));
                              }}
                              placeholder={`卖点 ${idx + 1}`}
                              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            />
                            <button
                              onClick={() => {
                                const content = safeParse(block.contentJson);
                                const current = (
                                  Array.isArray(content.features) && content.features.length > 0
                                    ? content.features
                                    : (Array.isArray(content.introItems) ? content.introItems : [])
                                ) as string[];
                                const next = current.filter((_: string, i: number) => i !== idx);
                                content.features = next;
                                delete content.introItems;
                                updateBlock(block.id, (b) => ({ ...b, contentJson: JSON.stringify(content) }));
                              }}
                              className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-red-500 hover:bg-red-50"
                              title="删除卖点"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const content = safeParse(block.contentJson);
                            const current = (
                              Array.isArray(content.features) && content.features.length > 0
                                ? content.features
                                : (Array.isArray(content.introItems) ? content.introItems : [])
                            ) as string[];
                            content.features = [...current, ''];
                            delete content.introItems;
                            updateBlock(block.id, (b) => ({ ...b, contentJson: JSON.stringify(content) }));
                          }}
                          className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          新增卖点
                        </button>
                      </div>
                    </div>
                  )}

                  {block.blockType === 'gallery' && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-gray-500">勾选要展示在轮播中的图片素材</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {imageAssets.map((asset) => {
                          const content = safeParse(block.contentJson);
                          const selected: string[] = content.assetIds || [];
                          const checked = selected.includes(asset.id);
                          return (
                            <label
                              key={asset.id}
                              className="flex items-center gap-2 rounded-lg border border-gray-200 px-2.5 py-2 text-xs"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const next = e.target.checked
                                    ? [...selected, asset.id]
                                    : selected.filter((currentId: string) => currentId !== asset.id);
                                  content.assetIds = next;
                                  updateBlock(block.id, (b) => ({ ...b, contentJson: JSON.stringify(content) }));
                                }}
                              />
                              <span className="truncate">{asset.title || asset.url}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {block.blockType === 'video' && (
                    <div className="mt-3 space-y-2">
                      <select
                        value={safeParse(block.contentJson).assetId || block.refAssetId || ''}
                        onChange={(e) => {
                          const content = safeParse(block.contentJson);
                          content.assetId = e.target.value;
                          updateBlock(block.id, (b) => ({
                            ...b,
                            refAssetId: e.target.value,
                            contentJson: JSON.stringify(content),
                          }));
                        }}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      >
                        <option value="">视频：不选择</option>
                        {videoAssets.map((asset) => (
                          <option key={asset.id} value={asset.id}>
                            {asset.title || asset.url}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {block.blockType === 'text' && (
                    <div className="mt-3">
                      <textarea
                        value={safeParse(block.contentJson).text || ''}
                        onChange={(e) => {
                          const content = safeParse(block.contentJson);
                          content.text = e.target.value;
                          updateBlock(block.id, (b) => ({ ...b, contentJson: JSON.stringify(content) }));
                        }}
                        placeholder="输入要展示的自定义文本"
                        rows={4}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none"
                      />
                    </div>
                  )}
                </div>
                <button onClick={() => removeBlock(block.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">添加模块</h3>
          {blockTemplates.map((tpl) => (
            <button
              key={tpl.type}
              onClick={() => addBlock(tpl.type)}
              className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-medium text-gray-900">{tpl.label}</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5 ml-6">{tpl.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
