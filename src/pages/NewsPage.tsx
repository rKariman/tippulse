import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { ArticleCard } from "@/components/cards/ArticleCard";
import { NewsletterWidget } from "@/components/widgets/NewsletterWidget";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface NewsPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  created_at: string;
}

export default function NewsPage() {
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const { data: articles, isLoading, error } = useQuery({
    queryKey: ["news_posts", "published"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_posts")
        .select("id, title, slug, excerpt, content, cover_image_url, created_at")
        .eq("published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as NewsPost[];
    },
  });

  // Note: The news_posts table doesn't have article_type, so we'll skip category filtering for now
  // If needed, we can add an article_type column later
  const filteredArticles = articles || [];

  return (
    <Layout>
      <SEO
        title="Football Betting News & Expert Analysis"
        description="Latest football news, transfer updates, and expert betting analysis. Stay informed with TipPulse's sports news coverage."
        canonical="/news"
      />
      <div className="container py-fluid-lg">
        {/* Page header */}
        <div className="mb-fluid-lg">
          <h1 className="text-fluid-2xl font-bold text-ink-900 mb-2">News & Articles</h1>
          <p className="text-ink-500 text-fluid-sm max-w-2xl leading-relaxed">
            Stay up to date with the latest football news, betting tips, and expert analysis.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-fluid-lg">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-fluid-lg">
            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 size={32} className="animate-spin text-brand-600 mx-auto mb-3" />
                <p className="text-ink-500">Loading articles...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12 bg-surface border border-ink-200 rounded-xl">
                <p className="text-ink-500">Failed to load articles. Please try again later.</p>
              </div>
            ) : filteredArticles.length > 0 ? (
              <>
                {/* Featured articles (first 2) */}
                {filteredArticles.length >= 2 && (
                  <section className="mb-fluid-lg">
                    <h2 className="section-title mb-fluid-md">Latest News</h2>
                    <div className="grid md:grid-cols-2 gap-fluid-md">
                      {filteredArticles.slice(0, 2).map((article) => (
                        <ArticleCard
                          key={article.id}
                          id={article.id}
                          title={article.title}
                          excerpt={article.excerpt || article.content.slice(0, 150) + "..."}
                          slug={article.slug}
                          publishedAt={article.created_at}
                          articleType="news"
                          featured
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Regular articles */}
                <section>
                  <div className="space-y-fluid-sm">
                    {filteredArticles.slice(2).map((article) => (
                      <ArticleCard
                        key={article.id}
                        id={article.id}
                        title={article.title}
                        excerpt={article.excerpt || article.content.slice(0, 150) + "..."}
                        slug={article.slug}
                        publishedAt={article.created_at}
                        articleType="news"
                      />
                    ))}
                  </div>
                </section>
              </>
            ) : (
              <div className="text-center py-12 bg-surface border border-ink-200 rounded-xl">
                <p className="text-ink-500">No articles available.</p>
                <p className="text-sm text-ink-400 mt-1">Check back later for new content.</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-fluid-lg">
            <NewsletterWidget />

            {/* Most Read */}
            {filteredArticles.length > 0 && (
              <div className="card-base overflow-hidden">
                <div className="widget-header">Most Read</div>
                <div className="divide-y divide-ink-100">
                  {filteredArticles.slice(0, 5).map((article, index) => (
                    <a
                      key={article.id}
                      href={`/news/${article.slug}`}
                      className="flex items-start gap-3 p-3 hover:bg-ink-50 transition-colors"
                    >
                      <span className="text-lg font-bold text-brand-600">{index + 1}.</span>
                      <span className="text-sm text-ink-700 leading-tight line-clamp-2">
                        {article.title}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Categories */}
            <div className="card-base overflow-hidden">
              <div className="widget-header">Popular Topics</div>
              <div className="p-fluid-md space-y-2">
                <a
                  href="/tips/bet-of-the-day"
                  className="flex items-center justify-between py-2 px-3 text-sm text-ink-700 hover:bg-ink-50 rounded-lg transition-colors"
                >
                  <span>Football Tips</span>
                  <span className="text-ink-400">›</span>
                </a>
                <a
                  href="/predictions"
                  className="flex items-center justify-between py-2 px-3 text-sm text-ink-700 hover:bg-ink-50 rounded-lg transition-colors"
                >
                  <span>Match Predictions</span>
                  <span className="text-ink-400">›</span>
                </a>
                <a
                  href="/free-bets"
                  className="flex items-center justify-between py-2 px-3 text-sm text-ink-700 hover:bg-ink-50 rounded-lg transition-colors"
                >
                  <span>Free Bets</span>
                  <span className="text-ink-400">›</span>
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
