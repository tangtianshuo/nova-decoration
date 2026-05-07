import { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Download, ExternalLink, X } from 'lucide-react';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import type { Asset } from '@/types';

interface Props {
  asset: Asset | null;
  open: boolean;
  onClose: () => void;
}

function toAbsoluteUrl(url: string): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

export default function AssetQrModal({ asset, open, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrReady, setQrReady] = useState(false);

  const shareUrl = useMemo(() => toAbsoluteUrl(asset?.url || ''), [asset?.url]);

  useEffect(() => {
    if (!open || !shareUrl || !canvasRef.current) return;
    setQrReady(false);
    QRCode.toCanvas(canvasRef.current, shareUrl, {
      width: 240,
      margin: 2,
      color: { dark: '#1f2937', light: '#ffffff' },
    })
      .then(() => setQrReady(true))
      .catch(() => toast.error('二维码生成失败'));
  }, [open, shareUrl]);

  if (!open || !asset) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('素材链接已复制');
    } catch {
      toast.error('复制失败');
    }
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `asset_qr_${asset.id}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
    toast.success('二维码已下载');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-semibold text-gray-900">素材二维码</h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{asset.title || '未命名素材'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex justify-center">
            <canvas ref={canvasRef} className="rounded-lg border border-gray-100" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">素材地址</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-gray-50 rounded-lg text-xs text-gray-700 truncate">
                {shareUrl}
              </code>
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                title="打开素材"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleDownload}
              disabled={!qrReady}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              下载二维码
            </button>
            <button
              onClick={handleCopy}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
            >
              <Copy className="w-4 h-4" />
              复制链接
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
