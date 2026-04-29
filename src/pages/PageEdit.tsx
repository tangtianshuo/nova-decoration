import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/app';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export default function PageEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { pages, updatePage } = useAppStore();
  const page = pages.find((p) => p.id === id);

  const [title, setTitle] = useState(page?.title || '');
  const [summary, setSummary] = useState(page?.summary || '');
  const [saving, setSaving] = useState(false);

  if (!page) {
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
      const data = await api.put<any>(`/pages/${id}`, { title, summary });
      updatePage(data.data);
      toast.success('保存成功');
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
            page.publishStatus === 'published' ? 'bg-green-50 text-green-700' :
            page.publishStatus === 'draft' ? 'bg-gray-100 text-gray-600' :
            'bg-red-50 text-red-600'
          }`}>
            {page.publishStatus === 'published' ? '已发布' : page.publishStatus === 'draft' ? '草稿' : '已下线'}
          </span>
        </div>
      </div>
    </div>
  );
}
