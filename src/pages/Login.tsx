import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { useAppStore } from '@/store/app';
import { Building2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { LoginResponse } from '@/types';

const ENABLE_MOCK_AUTH = import.meta.env.VITE_ENABLE_MOCK_AUTH === 'true';

const mockCompany = {
  id: 'cp_demo001',
  name: '星河装饰设计',
  logoUrl: '',
  intro: '星河装饰设计成立于2015年，专注于家装与工装设计领域。\n\n我们拥有一支经验丰富的设计团队，为客户提供从方案设计到施工落地的一站式服务。业务涵盖住宅、别墅、办公室、商业空间等。',
  contactPhone: '400-888-6666',
  contactWechat: 'xinghe_design',
  contactAddress: '上海市浦东新区陆家嘴环路1000号',
  status: 'active' as const,
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2026-04-26T10:00:00Z',
};

const mockUser = {
  id: 'u_demo001',
  companyId: 'cp_demo001',
  email: 'admin@company.com',
  role: 'admin' as const,
  status: 'active' as const,
};

const mockAssets = [
  {
    id: 'as_001',
    companyId: 'cp_demo001',
    sourceType: 'upload' as const,
    assetType: 'image' as const,
    url: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=modern%20living%20room%20interior%20design%2C%20minimalist%20style%2C%20warm%20lighting%2C%20wooden%20floor%2C%20sofa&image_size=landscape_16_9',
    coverUrl: '',
    bilibiliBvid: '',
    title: '现代简约客厅',
    sizeBytes: 280000,
    durationSec: 0,
    status: 'ready' as const,
    createdAt: '2026-04-20T10:00:00Z',
    updatedAt: '2026-04-20T10:00:00Z',
  },
  {
    id: 'as_002',
    companyId: 'cp_demo001',
    sourceType: 'upload' as const,
    assetType: 'image' as const,
    url: 'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=luxury%20bedroom%20design%2C%20elegant%20style%2C%20soft%20colors%2C%20king%20size%20bed&image_size=landscape_16_9',
    coverUrl: '',
    bilibiliBvid: '',
    title: '轻奢卧室',
    sizeBytes: 320000,
    durationSec: 0,
    status: 'ready' as const,
    createdAt: '2026-04-21T10:00:00Z',
    updatedAt: '2026-04-21T10:00:00Z',
  },
  {
    id: 'as_003',
    companyId: 'cp_demo001',
    sourceType: 'bilibili' as const,
    assetType: 'video' as const,
    url: 'https://www.bilibili.com/video/BV1GJ411x7h7/',
    coverUrl: '',
    bilibiliBvid: 'BV1GJ411x7h7',
    title: '样板间全景讲解',
    sizeBytes: 0,
    durationSec: 180,
    status: 'ready' as const,
    createdAt: '2026-04-22T10:00:00Z',
    updatedAt: '2026-04-22T10:00:00Z',
  },
];

const mockPages = [
  {
    id: 'pg_001',
    companyId: 'cp_demo001',
    slug: 'modern-living-room',
    title: '现代简约客厅案例',
    summary: '180平米现代简约风格客厅设计方案，以白色和原木色为主调，打造温馨舒适的居住空间。',
    publishStatus: 'published' as const,
    publishedAt: '2026-04-20',
    blocks: [
      { id: 'blk_01', pageId: 'pg_001', blockType: 'hero' as const, refAssetId: '', contentJson: JSON.stringify({ title: '现代简约客厅案例', subtitle: '180㎡ 三室两厅 · 现代简约风格', imageUrl: '' }), sortOrder: 0 },
      { id: 'blk_02', pageId: 'pg_001', blockType: 'company_intro' as const, refAssetId: '', contentJson: '', sortOrder: 1 },
      { id: 'blk_03', pageId: 'pg_001', blockType: 'product_intro' as const, refAssetId: '', contentJson: JSON.stringify({ title: '设计亮点', description: '本案以"少即是多"为设计理念，通过简洁的线条和自然的材质，营造出现代而不失温度的居住空间。', features: ['全屋智能灯光系统', '进口环保建材', '定制收纳方案', '免费3D效果图'] }), sortOrder: 2 },
      { id: 'blk_04', pageId: 'pg_001', blockType: 'gallery' as const, refAssetId: '', contentJson: '', sortOrder: 3 },
      { id: 'blk_05', pageId: 'pg_001', blockType: 'video' as const, refAssetId: '', contentJson: '', sortOrder: 4 },
      { id: 'blk_06', pageId: 'pg_001', blockType: 'contact' as const, refAssetId: '', contentJson: '', sortOrder: 5 },
    ],
    createdAt: '2026-04-18T10:00:00Z',
    updatedAt: '2026-04-20T10:00:00Z',
  },
  {
    id: 'pg_002',
    companyId: 'cp_demo001',
    slug: 'office-design',
    title: '科技企业办公室设计',
    summary: '2000平米科技企业办公空间设计案例。',
    publishStatus: 'draft' as const,
    publishedAt: '',
    blocks: [],
    createdAt: '2026-04-25T10:00:00Z',
    updatedAt: '2026-04-25T10:00:00Z',
  },
];

const mockShareLinks = [
  {
    id: 'sl_001',
    companyId: 'cp_demo001',
    pageId: 'pg_001',
    code: 'AB12CD',
    status: 'active' as const,
    expireAt: '',
    fallbackUrl: '',
    scanCount: 42,
    createdAt: '2026-04-20T10:00:00Z',
    updatedAt: '2026-04-26T10:00:00Z',
  },
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const { setAssets, setPages, setShareLinks } = useAppStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('请输入邮箱和密码');
      return;
    }
    setLoading(true);

    if (ENABLE_MOCK_AUTH) {
      await new Promise((r) => setTimeout(r, 500));
      login('dev_mock_token_xxx', mockUser, mockCompany);
      setAssets(mockAssets);
      setPages(mockPages);
      setShareLinks(mockShareLinks);
      toast.success('登录成功（Mock 模式）');
      navigate('/dashboard');
      setLoading(false);
      return;
    }

    try {
      const data = await api.post<LoginResponse>('/auth/login', { email, password });
      login(data.data.token, data.data.user, data.data.company);
      toast.success('登录成功');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Nova 装饰展示平台</h1>
          <p className="text-gray-500 mt-2">家装/工装企业展示与二维码分享</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@company.com"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">密码</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '登录中...' : '登录'}
          </button>
          {ENABLE_MOCK_AUTH && (
            <p className="text-center text-xs text-amber-600 bg-amber-50 rounded-lg py-2">
              Mock 模式：输入任意邮箱和密码即可登录
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
