import { Link } from 'react-router-dom';
import { useAppStore } from '@/store/app';
import { Plus, QrCode, Eye, Edit3, MoreVertical } from 'lucide-react';
import { useState } from 'react';

export default function Pages() {
  const { pages } = useAppStore();
  const [filter, setFilter] = useState<'all' | 'published' | 'draft' | 'offline'>('all');

  const filtered = filter === 'all' ? pages : pages.filter((p) => p.publishStatus === filter);

  const statusMap: Record<string, { label: string; color: string }> = {
    published: { label: '已发布', color: 'bg-green-50 text-green-700' },
    draft: { label: '草稿', color: 'bg-gray-100 text-gray-600' },
    offline: { label: '已下线', color: 'bg-red-50 text-red-600' },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">展示页管理</h1>
          <p className="text-gray-500 mt-1">创建和管理您的展示页面</p>
        </div>
        <Link
          to="/pages/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          创建展示页
        </Link>
      </div>

      <div className="flex gap-2">
        {(['all', 'published', 'draft', 'offline'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {f === 'all' ? '全部' : f === 'published' ? '已发布' : f === 'draft' ? '草稿' : '已下线'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <QrCode className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">暂无展示页</p>
          <Link
            to="/pages/new"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            创建第一个展示页
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((page) => {
            const status = statusMap[page.publishStatus] || statusMap.draft;
            return (
              <div key={page.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-semibold text-gray-900 truncate">{page.title}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1 truncate">{page.summary || '暂无摘要'}</p>
                  <p className="text-xs text-gray-400 mt-1">/{page.slug}</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {page.publishStatus === 'published' && (
                    <Link
                      to={`/pages/${page.id}/share`}
                      className="p-2 rounded-lg hover:bg-purple-50 text-purple-600 transition-colors"
                      title="分享与二维码"
                    >
                      <QrCode className="w-5 h-5" />
                    </Link>
                  )}
                  <Link
                    to={`/s/${page.slug}`}
                    target="_blank"
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                    title="预览"
                  >
                    <Eye className="w-5 h-5" />
                  </Link>
                  <Link
                    to={`/pages/${page.id}/edit`}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                    title="编辑"
                  >
                    <Edit3 className="w-5 h-5" />
                  </Link>
                  <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
