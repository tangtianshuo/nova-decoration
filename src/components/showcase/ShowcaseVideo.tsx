import { useState } from 'react';
import { Play, ExternalLink } from 'lucide-react';
import type { PublicPageData } from '@/types';

interface Props {
  block: PublicPageData['page']['blocks'][0];
  data: PublicPageData;
}

export default function ShowcaseVideo({ block, data }: Props) {
  const content = block.contentJson ? JSON.parse(block.contentJson) : {};
  const [playing, setPlaying] = useState(false);

  const bilibiliAsset = data.assets.find((a) => a.sourceType === 'bilibili');
  const videoAsset = data.assets.find((a) => a.assetType === 'video' && a.sourceType === 'upload');

  const bilibiliUrl = bilibiliAsset?.url || content.bilibiliUrl || '';
  const bilibiliBvid = bilibiliAsset?.bilibiliBvid || '';
  const videoUrl = videoAsset?.url || content.videoUrl || '';
  const coverUrl = videoAsset?.coverUrl || content.coverUrl || '';

  const getBilibiliEmbedUrl = (url: string) => {
    const match = url.match(/BV[\w]+/);
    if (match) return `https://player.bilibili.com/player.html?bvid=${match[0]}&autoplay=0`;
    return url;
  };

  return (
    <section className="py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">视频展示</h2>

        {bilibiliUrl && (
          <div className="space-y-4">
            <div className="aspect-video rounded-xl overflow-hidden bg-gray-100">
              {playing ? (
                <iframe
                  src={getBilibiliEmbedUrl(bilibiliUrl)}
                  className="w-full h-full border-0"
                  allowFullScreen
                  allow="autoplay; fullscreen"
                  title="Bilibili视频"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-50 to-blue-50 cursor-pointer relative"
                  onClick={() => setPlaying(true)}
                >
                  {coverUrl && (
                    <img src={coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
                  )}
                  <div className="relative z-10 text-center">
                    <div className="w-16 h-16 rounded-full bg-pink-600 flex items-center justify-center mx-auto mb-3 shadow-lg">
                      <Play className="w-7 h-7 text-white ml-1" />
                    </div>
                    <p className="text-sm text-gray-600">点击播放视频</p>
                    {bilibiliBvid && <p className="text-xs text-gray-400 mt-1">BV{bilibiliBvid}</p>}
                  </div>
                </div>
              )}
            </div>
            {!playing && (
              <div className="text-center">
                <a
                  href={bilibiliUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-pink-600 hover:text-pink-700"
                >
                  <ExternalLink className="w-4 h-4" />
                  在Bilibili中打开
                </a>
              </div>
            )}
          </div>
        )}

        {videoUrl && !bilibiliUrl && (
          <div className="aspect-video rounded-xl overflow-hidden bg-black">
            <video
              src={videoUrl}
              controls
              className="w-full h-full"
              poster={coverUrl || undefined}
              playsInline
              preload="metadata"
            >
              您的浏览器不支持视频播放
            </video>
          </div>
        )}

        {!bilibiliUrl && !videoUrl && (
          <div className="text-center py-8 text-gray-400 text-sm">暂无视频内容</div>
        )}
      </div>
    </section>
  );
}
