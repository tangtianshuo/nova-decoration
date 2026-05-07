import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PublicPageData } from '@/types';

interface Props {
  block: PublicPageData['page']['blocks'][0];
  data: PublicPageData;
}

export default function ShowcaseGallery({ block, data }: Props) {
  const content = block.contentJson ? JSON.parse(block.contentJson) : {};
  const selectedIds: string[] = Array.isArray(content.assetIds) ? content.assetIds : [];
  const imageUrls: string[] = content.imageUrls || [];
  const allTenantImageAssets = data.assets.filter((a) => a.assetType === 'image' && a.sourceType === 'upload');
  const images = selectedIds.length > 0
    ? allTenantImageAssets.filter((asset) => selectedIds.includes(asset.id))
    : allTenantImageAssets;
  const mappedImages = images.map((asset) => ({ url: asset.url, title: asset.title }));
  const allImages = [...mappedImages, ...imageUrls.map((url, i) => ({ url, title: `图片 ${i + 1}` }))];

  const [current, setCurrent] = useState(0);

  if (allImages.length === 0) return null;

  useEffect(() => {
    if (allImages.length <= 1) return;
    const timer = window.setInterval(() => {
      setCurrent((c) => (c === allImages.length - 1 ? 0 : c + 1));
    }, 3500);
    return () => window.clearInterval(timer);
  }, [allImages.length]);

  const prev = () => setCurrent((c) => (c === 0 ? allImages.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === allImages.length - 1 ? 0 : c + 1));

  return (
    <section className="py-12 px-6 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">案例展示</h2>
        <div className="relative">
          <div className="aspect-[16/10] rounded-xl overflow-hidden bg-gray-200">
            <img
              src={allImages[current].url}
              alt={allImages[current].title}
              className="w-full h-full object-cover"
            />
          </div>
          {allImages.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-700" />
              </button>
              <button
                onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-700" />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {allImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i === current ? 'bg-white' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
        <p className="text-center text-sm text-gray-500 mt-3">{allImages[current].title}</p>
      </div>
    </section>
  );
}
