import { useSearchParams, Link } from 'react-router-dom';
import { AlertCircle, Phone, Home, RefreshCw } from 'lucide-react';

const reasonMap: Record<string, { title: string; desc: string }> = {
  expired: {
    title: '链接已过期',
    desc: '该分享链接已超过有效期，请联系企业获取最新二维码。',
  },
  disabled: {
    title: '链接已停用',
    desc: '该分享链接已被停用，如有疑问请联系企业。',
  },
  notfound: {
    title: '链接不存在',
    desc: '您访问的链接不存在，请确认二维码是否正确。',
  },
  error: {
    title: '页面暂时无法访问',
    desc: '系统出现异常，请稍后重试或联系企业。',
  },
};

export default function Fallback() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code') || '';
  const reason = searchParams.get('reason') || 'notfound';
  const info = reasonMap[reason] || reasonMap.notfound;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-2xl bg-white shadow-lg flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-10 h-10 text-amber-500" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900">{info.title}</h1>
        <p className="text-gray-500 mt-3 leading-relaxed">{info.desc}</p>

        {code && (
          <p className="text-xs text-gray-400 mt-2 font-mono">链接代码：{code}</p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mt-8 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Home className="w-4 h-4" />
            返回首页
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            重新加载
          </button>
          <a
            href="tel:400-000-0000"
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-white transition-colors"
          >
            <Phone className="w-4 h-4" />
            联系客服
          </a>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-400">
            如果您通过二维码访问此页面，可能是链接已失效或内容已更新。
          </p>
          <p className="text-xs text-gray-400 mt-1">
            请联系对应企业或扫描最新的二维码获取最新内容。
          </p>
        </div>
      </div>
    </div>
  );
}
