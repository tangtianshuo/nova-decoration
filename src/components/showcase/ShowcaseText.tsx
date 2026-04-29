import type { PublicPageData } from '@/types';

interface Props {
  block: PublicPageData['page']['blocks'][0];
  data: PublicPageData;
}

export default function ShowcaseText({ block }: Props) {
  const content = block.contentJson ? JSON.parse(block.contentJson) : {};
  const text = content.text || '';

  if (!text) return null;

  return (
    <section className="py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-gray-700 leading-relaxed whitespace-pre-line">{text}</div>
      </div>
    </section>
  );
}
