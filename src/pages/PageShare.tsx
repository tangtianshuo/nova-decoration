import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '@/store/app';
import { ArrowLeft, Download, Copy, QrCode, ExternalLink } from 'lucide-react';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export default function PageShare() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { pages, shareLinks, addShareLink } = useAppStore();
  const page = pages.find((p) => p.id === id);
  const existingLink = shareLinks.find((l) => l.pageId === id);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [qrGenerated, setQrGenerated] = useState(false);
  const [creating, setCreating] = useState(false);

  const baseUrl = import.meta.env.VITE_WEB_BASE || window.location.origin;
  const shareUrl = existingLink ? `${baseUrl}/q/${existingLink.code}` : '';
  const displayUrl = existingLink ? `${baseUrl}/s/${page?.slug}` : '';

  useEffect(() => {
    if (existingLink && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, shareUrl, {
        width: 256,
        margin: 2,
        color: { dark: '#1e1b4b', light: '#ffffff' },
      }).then(() => setQrGenerated(true));
    }
  }, [existingLink, shareUrl]);

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

  const handleCreate = async () => {
    setCreating(true);
    try {
      const data = await api.post<any>('/share-links', { pageId: id, expireAt: null });
      addShareLink(data.data);
      toast.success('分享链接已创建');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '网络错误');
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `qrcode_${page.slug}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
    toast.success('二维码已下载');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('链接已复制');
    } catch {
      toast.error('复制失败');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/pages')} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">分享与二维码</h1>
          <p className="text-gray-500 text-sm">{page.title}</p>
        </div>
      </div>

      {!existingLink ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center space-y-4">
          <QrCode className="w-16 h-16 text-gray-300 mx-auto" />
          <p className="text-gray-500">尚未生成分享链接</p>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <QrCode className="w-4 h-4" />
            {creating ? '创建中...' : '生成二维码'}
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center">
            <canvas ref={canvasRef} className="rounded-lg" />
            <p className="text-sm text-gray-500 mt-4">扫码查看展示页</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">短链地址</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700 truncate">{shareUrl}</code>
                <button onClick={handleCopy} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors" title="复制链接">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">展示页地址</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700 truncate">{displayUrl}</code>
                <Link to={`/s/${page.slug}`} target="_blank" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors" title="预览">
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">状态</label>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                existingLink.status === 'active' ? 'bg-green-50 text-green-700' :
                existingLink.status === 'disabled' ? 'bg-red-50 text-red-600' :
                'bg-yellow-50 text-yellow-700'
              }`}>
                {existingLink.status === 'active' ? '正常' : existingLink.status === 'disabled' ? '已停用' : '已过期'}
              </span>
              {existingLink.scanCount > 0 && (
                <span className="text-xs text-gray-400 ml-3">已扫码 {existingLink.scanCount} 次</span>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleDownload}
              disabled={!qrGenerated}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              下载二维码
            </button>
            <button
              onClick={handleCopy}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Copy className="w-4 h-4" />
              复制链接
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
