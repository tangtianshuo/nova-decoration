import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import type { PublicPageData } from '@/types';
import ShowcaseHero from '@/components/showcase/ShowcaseHero';
import ShowcaseCompanyIntro from '@/components/showcase/ShowcaseCompanyIntro';
import ShowcaseProductIntro from '@/components/showcase/ShowcaseProductIntro';
import ShowcaseGallery from '@/components/showcase/ShowcaseGallery';
import ShowcaseVideo from '@/components/showcase/ShowcaseVideo';
import ShowcaseContact from '@/components/showcase/ShowcaseContact';
import ShowcaseText from '@/components/showcase/ShowcaseText';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

export default function Showcase() {
  const { pageId } = useParams<{ pageId: string }>();
  const [data, setData] = useState<PublicPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pageId) return;
    setLoading(true);
    api
      .get<PublicPageData>(`/public/pages-by-id/${pageId}`)
      .then((res) => {
        setData(res.data);
        setError(null);
      })
      .catch((error) => {
        setError(error instanceof Error ? error.message : '加载失败');
      })
      .finally(() => setLoading(false));
  }, [pageId]);

  useEffect(() => {
    if (data) {
      document.title = `${data.page.title} - ${data.company.name}`;
    }
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-gray-500 mt-3 text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500">{error || '页面不存在'}</p>
          <a href="/fallback" className="mt-4 inline-block text-indigo-600 text-sm hover:underline">
            返回首页
          </a>
        </div>
      </div>
    );
  }

  const blockRenderer: Record<string, React.FC<{ block: PublicPageData['page']['blocks'][0]; data: PublicPageData }>> = {
    hero: ShowcaseHero,
    company_intro: ShowcaseCompanyIntro,
    product_intro: ShowcaseProductIntro,
    gallery: ShowcaseGallery,
    video: ShowcaseVideo,
    contact: ShowcaseContact,
    text: ShowcaseText,
  };

  return (
    <div className="min-h-screen bg-white">
      {data.page.blocks
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((block) => {
          const Component = blockRenderer[block.blockType];
          if (!Component) return null;
          return <Component key={block.id} block={block} data={data} />;
        })}
      <footer className="py-6 text-center text-xs text-gray-400 border-t border-gray-100">
        <p>由 {data.company.name} 提供</p>
      </footer>
    </div>
  );
}
