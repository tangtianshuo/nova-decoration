import { Phone, MessageCircle, MapPin } from 'lucide-react';
import type { PublicPageData } from '@/types';

interface Props {
  block: PublicPageData['page']['blocks'][0];
  data: PublicPageData;
}

export default function ShowcaseContact({ data }: Props) {
  const { company } = data;
  const hasContact = company.contactPhone || company.contactWechat || company.contactAddress;
  if (!hasContact) return null;

  return (
    <section className="py-12 px-6 bg-indigo-900 text-white">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-2xl font-bold">联系我们</h2>
        <p className="text-indigo-200 mt-2">欢迎来电咨询或到店参观</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8">
          {company.contactPhone && (
            <a
              href={`tel:${company.contactPhone}`}
              className="bg-white/10 backdrop-blur rounded-xl p-5 hover:bg-white/20 transition-colors"
            >
              <Phone className="w-6 h-6 mx-auto text-indigo-300" />
              <p className="text-sm font-medium mt-3">电话咨询</p>
              <p className="text-indigo-200 text-sm mt-1">{company.contactPhone}</p>
            </a>
          )}
          {company.contactWechat && (
            <div className="bg-white/10 backdrop-blur rounded-xl p-5">
              <MessageCircle className="w-6 h-6 mx-auto text-indigo-300" />
              <p className="text-sm font-medium mt-3">微信</p>
              <p className="text-indigo-200 text-sm mt-1">{company.contactWechat}</p>
            </div>
          )}
          {company.contactAddress && (
            <div className="bg-white/10 backdrop-blur rounded-xl p-5">
              <MapPin className="w-6 h-6 mx-auto text-indigo-300" />
              <p className="text-sm font-medium mt-3">地址</p>
              <p className="text-indigo-200 text-sm mt-1">{company.contactAddress}</p>
            </div>
          )}
        </div>

        {company.contactPhone && (
          <a
            href={`tel:${company.contactPhone}`}
            className="inline-flex items-center gap-2 mt-8 px-8 py-3 rounded-full bg-white text-indigo-900 font-semibold text-sm hover:bg-indigo-50 transition-colors"
          >
            <Phone className="w-4 h-4" />
            立即拨打电话
          </a>
        )}
      </div>
    </section>
  );
}
