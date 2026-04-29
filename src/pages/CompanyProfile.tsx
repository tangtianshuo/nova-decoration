import { useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { Building2, Phone, MapPin, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export default function CompanyProfile() {
  const { company, updateCompany } = useAuthStore();
  const [form, setForm] = useState({
    name: company?.name || '',
    intro: company?.intro || '',
    contactPhone: company?.contactPhone || '',
    contactWechat: company?.contactWechat || '',
    contactAddress: company?.contactAddress || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await api.put<any>('/company/me', form);
      updateCompany(data.data);
      toast.success('公司资料已保存');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '网络错误');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">公司资料</h1>
        <p className="text-gray-500 mt-1">完善公司信息，展示页将自动同步显示</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-xl bg-indigo-50 flex items-center justify-center">
            {company?.logoUrl ? (
              <img src={company.logoUrl} alt="" className="w-20 h-20 rounded-xl object-cover" />
            ) : (
              <Building2 className="w-8 h-8 text-indigo-400" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">公司 Logo</p>
            <p className="text-xs text-gray-400 mt-0.5">上传公司Logo图片（功能开发中）</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">公司名称</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">公司简介</label>
          <textarea
            value={form.intro}
            onChange={(e) => setForm({ ...form, intro: e.target.value })}
            rows={4}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm resize-none"
            placeholder="介绍公司的业务范围、优势、服务理念..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Phone className="w-4 h-4 inline mr-1" />联系电话
            </label>
            <input
              type="tel"
              value={form.contactPhone}
              onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
              placeholder="400-xxx-xxxx"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <MessageCircle className="w-4 h-4 inline mr-1" />微信号
            </label>
            <input
              type="text"
              value={form.contactWechat}
              onChange={(e) => setForm({ ...form, contactWechat: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
              placeholder="企业微信号"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <MapPin className="w-4 h-4 inline mr-1" />公司地址
          </label>
          <input
            type="text"
            value={form.contactAddress}
            onChange={(e) => setForm({ ...form, contactAddress: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
            placeholder="公司详细地址"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? '保存中...' : '保存资料'}
          </button>
        </div>
      </form>
    </div>
  );
}
