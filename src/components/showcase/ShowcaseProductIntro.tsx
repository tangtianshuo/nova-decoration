import type { PublicPageData } from '@/types';

interface Props {
  block: PublicPageData['page']['blocks'][0];
  data: PublicPageData;
}

export default function ShowcaseProductIntro({ block }: Props) {
  const content = block.contentJson ? JSON.parse(block.contentJson) : {};
  const title = content.title || '产品介绍';
  const description = content.description || '';
  const features: string[] = content.features || [];

  return (
    <section className="py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 text-center">{title}</h2>
        {description && (
          <p className="text-gray-600 mt-4 text-center leading-relaxed">{description}</p>
        )}
        {features.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-indigo-50 rounded-xl p-5">
                <p className="text-sm font-medium text-indigo-900">{feature}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
