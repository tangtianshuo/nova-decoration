import type { PublicPageData } from '@/types';

interface Props {
  block: PublicPageData['page']['blocks'][0];
  data: PublicPageData;
}

export default function ShowcaseHero({ block, data }: Props) {
  const content = block.contentJson ? JSON.parse(block.contentJson) : {};
  const selectedAsset = block.refAssetId
    ? data.assets.find((asset) => asset.id === block.refAssetId && asset.assetType === 'image')
    : null;
  const imageUrl = content.imageUrl || selectedAsset?.url || '';
  const fallbackWhiteImage =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><rect width="100%" height="100%" fill="white"/></svg>';
  const heroImage = imageUrl || fallbackWhiteImage;
  const titleClass = imageUrl ? 'text-white' : 'text-gray-900';
  const subtitleClass = imageUrl ? 'text-white/80' : 'text-gray-600';
  const title = content.title || data.page.title;
  const subtitle = content.subtitle || data.page.summary;

  return (
    <section className="relative w-full h-[60vh] min-h-[400px] bg-white overflow-hidden">
      <img
        src={heroImage}
        alt={imageUrl ? `${title} 封面图` : '纯白底占位图'}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="relative z-10 h-full flex flex-col items-center justify-end pb-12 px-6 text-center">
        <h1 className={`text-3xl md:text-4xl font-bold max-w-2xl ${titleClass}`}>{title}</h1>
        {subtitle && <p className={`text-lg mt-3 max-w-xl ${subtitleClass}`}>{subtitle}</p>}
      </div>
    </section>
  );
}
