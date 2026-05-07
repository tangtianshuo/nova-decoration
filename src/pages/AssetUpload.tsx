import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Link as LinkIcon, Image, Film } from 'lucide-react';
import { useAppStore } from '@/store/app';
import { useAuthStore } from '@/store/auth';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { Asset } from '@/types';
import AssetQrModal from '@/components/AssetQrModal';

type TabType = 'upload' | 'bilibili';

export default function AssetUpload() {
  const [tab, setTab] = useState<TabType>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [assetType, setAssetType] = useState<'image' | 'video'>('image');
  const [title, setTitle] = useState('');
  const [bilibiliUrl, setBilibiliUrl] = useState('');
  const [bilibiliTitle, setBilibiliTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [qrAsset, setQrAsset] = useState<Asset | null>(null);
  const { addAsset } = useAppStore();
  const token = useAuthStore((state) => state.token);
  const navigate = useNavigate();

  const handleUpload = async () => {
    if (!file) {
      toast.error('请选择文件');
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      const signData = await api.post<{
        uploadUrl: string;
        objectKey: string;
        headers?: Record<string, string>;
      }>('/upload/sign', {
        assetType,
        fileName: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      });

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        });
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error('上传失败'));
        });
        xhr.addEventListener('error', () => reject(new Error('上传失败')));
        xhr.open('PUT', signData.data.uploadUrl);
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        Object.entries(signData.data.headers || {}).forEach(([k, v]) => xhr.setRequestHeader(k, v as string));
        xhr.send(file);
      });

      const completeData = await api.post<any>('/assets/complete', {
        objectKey: signData.data.objectKey,
        assetType,
        title: title || file.name,
      });
      const asset = completeData.data as Asset;
      addAsset(asset);
      toast.success('上传成功');
      setQrAsset(asset);
      setFile(null);
      setTitle('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '上传失败，请重试');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleBilibili = async () => {
    if (!bilibiliUrl) {
      toast.error('请输入Bilibili视频链接');
      return;
    }
    setUploading(true);
    try {
      const data = await api.post<any>('/assets/bilibili', {
        url: bilibiliUrl,
        title: bilibiliTitle,
      });
      const asset = data.data as Asset;
      addAsset(asset);
      toast.success('Bilibili视频已添加');
      setQrAsset(asset);
      setBilibiliUrl('');
      setBilibiliTitle('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '网络错误');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <AssetQrModal asset={qrAsset} open={!!qrAsset} onClose={() => setQrAsset(null)} />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">添加素材</h1>
        <p className="text-gray-500 mt-1">上传图片/视频或添加Bilibili外链</p>
      </div>
      <div className="flex justify-end">
        <button
          onClick={() => navigate('/assets')}
          className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline"
        >
          前往素材库查看卡片二维码
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTab('upload')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'upload' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Upload className="w-4 h-4" />文件上传
        </button>
        <button
          onClick={() => setTab('bilibili')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'bilibili' ? 'bg-pink-50 text-pink-700' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <LinkIcon className="w-4 h-4" />Bilibili外链
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {tab === 'upload' ? (
          <div className="space-y-5">
            <div className="flex gap-3">
              <button
                onClick={() => setAssetType('image')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  assetType === 'image'
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Image className="w-4 h-4" />图片
              </button>
              <button
                onClick={() => setAssetType('video')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  assetType === 'video'
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Film className="w-4 h-4" />视频
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">素材标题</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                placeholder="给素材起个名称"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">选择文件</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors">
                <input
                  type="file"
                  accept={assetType === 'image' ? 'image/*' : 'video/*'}
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="file-input"
                />
                <label htmlFor="file-input" className="cursor-pointer">
                  {file ? (
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-400 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">点击选择{assetType === 'image' ? '图片' : '视频'}文件</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {assetType === 'image' ? '支持 JPG、PNG、WebP' : '支持 MP4、WebM'}
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {uploading && (
              <div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1 text-center">{progress}%</p>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={uploading || !file}
              className="w-full py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? '上传中...' : '上传素材'}
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Bilibili视频链接</label>
              <input
                type="url"
                value={bilibiliUrl}
                onChange={(e) => setBilibiliUrl(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none text-sm"
                placeholder="https://www.bilibili.com/video/BV..."
              />
              <p className="text-xs text-gray-400 mt-1">支持 BV号链接或完整URL</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">视频标题</label>
              <input
                type="text"
                value={bilibiliTitle}
                onChange={(e) => setBilibiliTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none text-sm"
                placeholder="给视频起个名称"
              />
            </div>

            <button
              onClick={handleBilibili}
              disabled={uploading || !bilibiliUrl}
              className="w-full py-2.5 rounded-lg bg-pink-600 text-white text-sm font-medium hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? '添加中...' : '添加Bilibili视频'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
