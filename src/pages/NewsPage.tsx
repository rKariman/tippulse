import { Layout } from "@/components/layout/Layout";
import { ArticleCard } from "@/components/cards/ArticleCard";
import { NewsletterWidget } from "@/components/widgets/NewsletterWidget";
import { useState } from "react";
import { mockArticles } from "@/lib/mockData";

export default function NewsPage() {
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const filteredArticles = categoryFilter
    ? mockArticles.filter((a) => a.article_type === categoryFilter)
    : mockArticles;

  const featuredArticles = filteredArticles.filter((a) => a.is_featured);
  const regularArticles = filteredArticles.filter((a) => !a.is_featured);

  return (
    <Layout>
      <div className="container py-6">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-ink-900 mb-2">News Articles</h1>
          <p className="text-ink-500 text-sm max-w-2xl">
            Stay up to date with the latest football news, betting tips, and expert analysis.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Category filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setCategoryFilter(null)}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                  categoryFilter === null
                    ? "bg-brand-600 text-white"
                    : "bg-ink-100 text-ink-600 hover:bg-ink-200"
                }`}
              >
                All Articles
              </button>
              <button
                onClick={() => setCategoryFilter("news")}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                  categoryFilter === "news"
                    ? "bg-brand-600 text-white"
                    : "bg-ink-100 text-ink-600 hover:bg-ink-200"
                }`}
              >
                Latest News
              </button>
              <button
                onClick={() => setCategoryFilter("academy")}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                  categoryFilter === "academy"
                    ? "bg-brand-600 text-white"
                    : "bg-ink-100 text-ink-600 hover:bg-ink-200"
                }`}
              >
                Betting Academy
              </button>
            </div>

            {/* Featured articles */}
            {featuredArticles.length > 0 && (
              <section>
                <h2 className="section-title mb-4">Latest News</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {featuredArticles.slice(0, 2).map((article) => (
                    <ArticleCard
                      key={article.id}
                      id={article.id}
                      title={article.title}
                      excerpt={article.excerpt}
                      slug={article.slug}
                      publishedAt={article.publishedAt}
                      articleType={article.article_type}
                      featured
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Regular articles */}
            <section>
              <div className="space-y-3">
                {regularArticles.map((article) => (
                  <ArticleCard
                    key={article.id}
                    id={article.id}
                    title={article.title}
                    excerpt={article.excerpt}
                    slug={article.slug}
                    publishedAt={article.publishedAt}
                    articleType={article.article_type}
                  />
                ))}
              </div>
            </section>

            {filteredArticles.length === 0 && (
              <div className="text-center py-12 bg-surface border border-ink-200 rounded-xl">
                <p className="text-ink-500">No articles available.</p>
              </div>
            )}

            {/* Load more */}
            {filteredArticles.length > 0 && (
              <div className="text-center">
                <button className="btn-secondary">Load More Articles</button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            <NewsletterWidget />

            {/* Most Read */}
            <div className="card-base overflow-hidden">
              <div className="widget-header">Most Read</div>
              <div className="divide-y divide-ink-100">
                {mockArticles.slice(0, 5).map((article, index) => (
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

            {/* Categories */}
            <div className="card-base overflow-hidden">
              <div className="widget-header">Most Popular Categories</div>
              <div className="p-4 space-y-2">
                <a
                  href="/news?category=news"
                  className="flex items-center justify-between py-2 px-3 text-sm text-ink-700 hover:bg-ink-50 rounded-lg transition-colors"
                >
                  <span>Big Wins</span>
                  <span className="text-ink-400">›</span>
                </a>
                <a
                  href="/news?category=tips"
                  className="flex items-center justify-between py-2 px-3 text-sm text-ink-700 hover:bg-ink-50 rounded-lg transition-colors"
                >
                  <span>Free Tips</span>
                  <span className="text-ink-400">›</span>
                </a>
                <a
                  href="/news?category=academy"
                  className="flex items-center justify-between py-2 px-3 text-sm text-ink-700 hover:bg-ink-50 rounded-lg transition-colors"
                >
                  <span>Betting Academy</span>
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
