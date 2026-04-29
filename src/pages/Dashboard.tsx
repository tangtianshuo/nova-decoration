import { useAuthStore } from '@/store/auth';
import { useAppStore } from '@/store/app';
import { Link } from 'react-router-dom';
import { FileText, Image, QrCode, TrendingUp } from 'lucide-react';

const stats = [
  { label: '展示页', key: 'pages' as const, icon: FileText, color: 'bg-blue-50 text-blue-600' },
  { label: '素材', key: 'assets' as const, icon: Image, color: 'bg-green-50 text-green-600' },
  { label: '分享链接', key: 'shareLinks' as const, icon: QrCode, color: 'bg-purple-50 text-purple-600' },
  { label: '总扫码量', key: 'scans' as const, icon: TrendingUp, color: 'bg-orange-50 text-orange-600' },
];

export default function Dashboard() {
  const { company } = useAuthStore();
  const { pages, assets, shareLinks } = useAppStore();

  const counts = {
    pages: pages.length,
    assets: assets.length,
    shareLinks: shareLinks.length,
    scans: shareLinks.reduce((sum, l) => sum + l.scanCount, 0),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">欢迎回来，{company?.name || '管理员'}</h1>
        <p className="text-gray-500 mt-1">管理您的展示页、素材和分享二维码</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.key} className="bg-white rounded-xl p-5 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{counts[stat.key]}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">快捷操作</h2>
          <div className="space-y-3">
            <Link
              to="/pages/new"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-700"
            >
              <FileText className="w-5 h-5 text-indigo-500" />
              创建新展示页
            </Link>
            <Link
              to="/assets/upload"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-700"
            >
              <Image className="w-5 h-5 text-green-500" />
              上传素材
            </Link>
            <Link
              to="/pages"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-700"
            >
              <QrCode className="w-5 h-5 text-purple-500" />
              管理分享链接
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">最近发布的展示页</h2>
          {pages.filter((p) => p.publishStatus === 'published').length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">暂无已发布的展示页</p>
          ) : (
            <div className="space-y-3">
              {pages
                .filter((p) => p.publishStatus === 'published')
                .slice(0, 5)
                .map((page) => (
                  <Link
                    key={page.id}
                    to={`/pages/${page.id}/edit`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm text-gray-700">{page.title}</span>
                    <span className="text-xs text-gray-400">{page.publishedAt}</span>
                  </Link>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
