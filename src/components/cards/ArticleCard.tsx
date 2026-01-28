import { Link } from "react-router-dom";

export interface ArticleCardProps {
  id: string;
  title: string;
  excerpt?: string;
  slug: string;
  publishedAt: string;
  articleType: string;
  imageUrl?: string;
  featured?: boolean;
}

export function ArticleCard({
  title,
  excerpt,
  slug,
  publishedAt,
  articleType,
  imageUrl,
  featured = false,
}: ArticleCardProps) {
  const date = new Date(publishedAt);
  const timeAgo = getTimeAgo(date);

  if (featured) {
    return (
      <Link to={`/news/${slug}`} className="block group">
        <div className="relative h-48 md:h-56 rounded-xl overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: imageUrl
                ? `url(${imageUrl})`
                : "linear-gradient(135deg, #1E40AF 0%, #172554 100%)",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-900/90 via-ink-900/50 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-ink-300">{timeAgo}</span>
              <span className="text-xs text-ink-300">•</span>
              <span className="text-xs text-brand-300 font-medium capitalize">
                {articleType}
              </span>
            </div>
            <h3 className="font-bold text-white text-lg leading-tight group-hover:text-brand-200 transition-colors">
              {title}
            </h3>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/news/${slug}`} className="block group">
      <div className="flex gap-3 card-interactive p-3">
        {/* Thumbnail */}
        <div
          className="w-20 h-16 rounded-lg bg-cover bg-center shrink-0"
          style={{
            backgroundImage: imageUrl
              ? `url(${imageUrl})`
              : "linear-gradient(135deg, #1E40AF 0%, #172554 100%)",
          }}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-ink-900 text-sm leading-tight line-clamp-2 group-hover:text-brand-600 transition-colors">
            {title}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-ink-400">{timeAgo}</span>
            <span className="text-xs text-brand-600 font-medium capitalize">
              {articleType}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
