import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/app';
import { Plus, QrCode, Eye, Edit3, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function Pages() {
  const navigate = useNavigate();
  const { pages, shareLinks, removePage, updatePage, addShareLink } = useAppStore();
  const [filter, setFilter] = useState<'all' | 'published' | 'draft' | 'offline'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null);

  const filtered = filter === 'all' ? pages : pages.filter((p) => p.publishStatus === filter);

  const statusMap: Record<string, { label: string; color: string }> = {
    published: { label: '已发布', color: 'bg-green-50 text-green-700' },
    draft: { label: '草稿', color: 'bg-gray-100 text-gray-600' },
    offline: { label: '已下线', color: 'bg-red-50 text-red-600' },
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await api.delete(`/pages/${id}`);
      removePage(id);
      toast.success('展示页已删除');
      setPendingDelete(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败');
    } finally {
      setDeletingId(null);
    }
  };

  const handlePublishAndCreateQr = async (id: string) => {
    setPublishingId(id);
    try {
      const published = await api.post<any>(`/pages/${id}/publish`);
      updatePage(published.data);
      const share = await api.post<any>('/share-links', { pageId: id, expireAt: null });
      if (!shareLinks.find((item) => item.id === share.data.id)) {
        addShareLink(share.data);
      }
      toast.success('已发布并生成二维码');
      navigate(`/pages/${id}/share`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '发布失败');
    } finally {
      setPublishingId(null);
    }
  };

  const pendingLinkCount = pendingDelete
    ? shareLinks.filter((link) => link.pageId === pendingDelete.id && link.status === 'active').length
    : 0;

  useEffect(() => {
    if (!pendingDelete) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (deletingId === pendingDelete.id) return;
      setPendingDelete(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pendingDelete, deletingId]);

  return (
    <div className="space-y-6">
      {pendingDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => {
            if (deletingId === pendingDelete.id) return;
            setPendingDelete(null);
          }}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900">确认删除展示页？</h3>
            <p className="text-sm text-gray-600">
              即将删除「{pendingDelete.title}」，该操作不可撤销。
            </p>
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
              删除后该页面关联的分享二维码将失效，用户扫码会进入兜底页。
              {pendingLinkCount > 0 ? ` 当前有 ${pendingLinkCount} 个生效中的分享链接。` : ''}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setPendingDelete(null)}
                disabled={deletingId === pendingDelete.id}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(pendingDelete.id)}
                disabled={deletingId === pendingDelete.id}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50"
              >
                {deletingId === pendingDelete.id ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
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
                  {page.publishStatus === 'draft' && (
                    <button
                      onClick={() => handlePublishAndCreateQr(page.id)}
                      disabled={publishingId === page.id}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
                      title="发布并生成二维码"
                    >
                      {publishingId === page.id ? '发布中...' : '发布并生成二维码'}
                    </button>
                  )}
                  <Link
                    to={`/s/${page.id}`}
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
                  <button
                    onClick={() => setPendingDelete({ id: page.id, title: page.title })}
                    disabled={deletingId === page.id}
                    className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                    title="删除"
                  >
                    <Trash2 className="w-5 h-5" />
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
