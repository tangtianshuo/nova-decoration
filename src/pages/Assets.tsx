import { Link } from 'react-router-dom';
import { useAppStore } from '@/store/app';
import { Plus, Image, Film, ExternalLink } from 'lucide-react';

export default function Assets() {
  const { assets } = useAppStore();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">素材管理</h1>
          <p className="text-gray-500 mt-1">管理图片、视频和Bilibili外链素材</p>
        </div>
        <Link
          to="/assets/upload"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          上传素材
        </Link>
      </div>

      <div className="flex gap-3">
        <button className="px-4 py-2 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-medium">全部</button>
        <button className="px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-600 text-sm font-medium transition-colors">图片</button>
        <button className="px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-600 text-sm font-medium transition-colors">视频</button>
        <button className="px-4 py-2 rounded-lg hover:bg-gray-100 text-gray-600 text-sm font-medium transition-colors">Bilibili</button>
      </div>

      {assets.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Image className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">暂无素材</p>
          <p className="text-gray-400 text-sm mt-1">上传图片或视频，或添加Bilibili外链</p>
          <Link
            to="/assets/upload"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            上传素材
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {assets.map((asset) => (
            <div key={asset.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden group">
              <div className="aspect-video bg-gray-100 relative">
                {asset.assetType === 'image' ? (
                  <img src={asset.url} alt={asset.title} className="w-full h-full object-cover" />
                ) : asset.sourceType === 'bilibili' ? (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-50 to-blue-50">
                    <ExternalLink className="w-8 h-8 text-pink-400" />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50">
                    <Film className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                {asset.assetType === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center">
                      <div className="w-0 h-0 border-l-[12px] border-l-white border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent ml-1" />
                    </div>
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-gray-900 truncate">{asset.title || '未命名素材'}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {asset.sourceType === 'bilibili' ? 'Bilibili' : asset.assetType === 'image' ? '图片' : '视频'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
