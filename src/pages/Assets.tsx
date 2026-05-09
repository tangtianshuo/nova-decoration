import { Link } from 'react-router-dom';
import { useAppStore } from '@/store/app';
import { Plus, Image, Film, ExternalLink, QrCode, Trash2, RefreshCw } from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';
import type { Asset } from '@/types';
import AssetQrModal from '@/components/AssetQrModal';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { toast } from 'sonner';

export default function Assets() {
  const { assets, removeAsset, updateAsset } = useAppStore();
  const token = useAuthStore((state) => state.token);
  const [qrAsset, setQrAsset] = useState<Asset | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<Asset | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDelete = async (asset: Asset) => {
    if (!window.confirm(`确认删除素材「${asset.title || '未命名素材'}」？`)) return;
    setDeletingId(asset.id);
    try {
      await api.delete(`/assets/${asset.id}`);
      removeAsset(asset.id);
      toast.success('素材已删除');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败');
    } finally {
      setDeletingId(null);
    }
  };

  const openReplace = (asset: Asset) => {
    if (asset.sourceType === 'bilibili') return;
    setReplaceTarget(asset);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleReplaceBilibili = async (asset: Asset) => {
    const url = window.prompt('请输入新的 Bilibili 链接', asset.url || '');
    if (!url) return;
    const title = window.prompt('请输入素材标题（可选）', asset.title || '') || asset.title;
    setReplacingId(asset.id);
    try {
      const data = await api.post<Asset>(`/assets/${asset.id}/replace`, { url, title });
      updateAsset(data.data);
      toast.success('Bilibili 素材已替换');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '替换失败');
    } finally {
      setReplacingId(null);
    }
  };

  const handleReplaceFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const target = replaceTarget;
    if (!file || !target) return;

    setReplacingId(target.id);
    try {
      const signData = await api.post<{
        uploadUrl: string;
        objectKey: string;
        headers?: Record<string, string>;
      }>('/upload/sign', {
        assetType: target.assetType,
        fileName: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      });

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error('替换上传失败'));
        });
        xhr.addEventListener('error', () => reject(new Error('替换上传失败')));
        xhr.open('PUT', signData.data.uploadUrl);
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        Object.entries(signData.data.headers || {}).forEach(([k, v]) => xhr.setRequestHeader(k, v as string));
        xhr.send(file);
      });

      const replaced = await api.post<Asset>(`/assets/${target.id}/replace`, {
        objectKey: signData.data.objectKey,
        title: target.title || file.name,
      });
      updateAsset(replaced.data);
      toast.success('素材已替换');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '替换失败');
    } finally {
      setReplacingId(null);
      setReplaceTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <AssetQrModal asset={qrAsset} open={!!qrAsset} onClose={() => setQrAsset(null)} />
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={replaceTarget?.assetType === 'image' ? 'image/*' : 'video/*'}
        onChange={handleReplaceFileChange}
      />
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
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="text-xs text-gray-400">
                    {asset.sourceType === 'bilibili' ? 'Bilibili' : asset.assetType === 'image' ? '图片' : '视频'}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQrAsset(asset)}
                      className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      二维码
                    </button>
                    <button
                      onClick={() => (asset.sourceType === 'bilibili' ? handleReplaceBilibili(asset) : openReplace(asset))}
                      disabled={replacingId === asset.id}
                      className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 disabled:opacity-50"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      {replacingId === asset.id ? '替换中...' : '替换'}
                    </button>
                    <button
                      onClick={() => handleDelete(asset)}
                      disabled={deletingId === asset.id}
                      className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {deletingId === asset.id ? '删除中...' : '删除'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
