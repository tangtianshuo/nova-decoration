import type { PublicPageData } from '@/types';

interface Props {
  block: PublicPageData['page']['blocks'][0];
  data: PublicPageData;
}

export default function ShowcaseCompanyIntro({ data }: Props) {
  const { company } = data;
  if (!company.intro) return null;

  return (
    <section className="py-12 px-6 bg-gray-50">
      <div className="max-w-3xl mx-auto text-center">
        {company.logoUrl && (
          <img src={company.logoUrl} alt={company.name} className="w-16 h-16 rounded-xl object-cover mx-auto mb-4" />
        )}
        <h2 className="text-2xl font-bold text-gray-900">{company.name}</h2>
        <p className="text-gray-600 mt-4 leading-relaxed whitespace-pre-line">{company.intro}</p>
      </div>
    </section>
  );
}
