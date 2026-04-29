import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/app';
import { useAuthStore } from '@/store/auth';
import { ArrowLeft, Plus, GripVertical, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { PageBlock } from '@/types';
import { api } from '@/lib/api';

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

export default function PageEditor() {
  const navigate = useNavigate();
  const { addPage } = useAppStore();
  const { company } = useAuthStore();
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [blocks, setBlocks] = useState<PageBlock[]>([]);
  const [saving, setSaving] = useState(false);

  const addBlock = (type: BlockType) => {
    const block: PageBlock = {
      id: `blk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      pageId: '',
      blockType: type,
      refAssetId: '',
      contentJson: '',
      sortOrder: blocks.length,
    };
    setBlocks([...blocks, block]);
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter((b) => b.id !== id).map((b, i) => ({ ...b, sortOrder: i })));
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const newBlocks = [...blocks];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= newBlocks.length) return;
    [newBlocks[index], newBlocks[target]] = [newBlocks[target], newBlocks[index]];
    setBlocks(newBlocks.map((b, i) => ({ ...b, sortOrder: i })));
  };

  const handleSave = async (publishStatus: 'draft' | 'published') => {
    if (!title.trim()) {
      toast.error('请输入页面标题');
      return;
    }
    setSaving(true);
    try {
      const data = await api.post<any>('/pages', {
        title,
        summary,
        publishStatus,
        blocks: blocks.map((b) => ({
          blockType: b.blockType,
          contentJson: b.contentJson,
          sortOrder: b.sortOrder,
        })),
      });
      addPage(data.data);
      toast.success(publishStatus === 'published' ? '发布成功' : '已保存为草稿');
      navigate('/pages');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '网络错误');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/pages')} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">创建展示页</h1>
            <p className="text-gray-500 text-sm">{company?.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleSave('draft')}
            disabled={saving}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            保存草稿
          </button>
          <button
            onClick={() => handleSave('published')}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? '保存中...' : '发布页面'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">页面标题</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                placeholder="例如：现代简约客厅案例"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">页面摘要</label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm resize-none"
                placeholder="简要描述这个展示页的内容..."
              />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">页面模块</h3>
            {blocks.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
                <p className="text-gray-400 text-sm">点击右侧模块添加内容</p>
              </div>
            ) : (
              blocks.map((block, index) => (
                <div key={block.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                  <div className="flex flex-col gap-1">
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
                  </div>
                  <button onClick={() => removeBlock(block.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
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
