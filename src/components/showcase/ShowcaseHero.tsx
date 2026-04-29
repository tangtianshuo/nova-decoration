import type { PublicPageData } from '@/types';

interface Props {
  block: PublicPageData['page']['blocks'][0];
  data: PublicPageData;
}

export default function ShowcaseHero({ block, data }: Props) {
  const content = block.contentJson ? JSON.parse(block.contentJson) : {};
  const imageUrl = content.imageUrl || '';
  const title = content.title || data.page.title;
  const subtitle = content.subtitle || data.page.summary;

  return (
    <section className="relative w-full h-[60vh] min-h-[400px] bg-gradient-to-br from-indigo-900 to-purple-900 overflow-hidden">
      {imageUrl && (
        <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      <div className="relative z-10 h-full flex flex-col items-center justify-end pb-12 px-6 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-white max-w-2xl">{title}</h1>
        {subtitle && <p className="text-lg text-white/80 mt-3 max-w-xl">{subtitle}</p>}
      </div>
    </section>
  );
}
