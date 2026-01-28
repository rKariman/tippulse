import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { NewsletterWidget } from "@/components/widgets/NewsletterWidget";
import { mockArticles } from "@/lib/mockData";

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();

  const article = mockArticles.find((a) => a.slug === slug);

  if (!article) {
    return (
      <Layout>
        <div className="container py-12 text-center">
          <h1 className="text-2xl font-bold text-ink-900 mb-2">Article Not Found</h1>
          <p className="text-ink-500 mb-4">The article you're looking for doesn't exist.</p>
          <Link to="/news" className="btn-primary">
            View All News
          </Link>
        </div>
      </Layout>
    );
  }

  const publishDate = new Date(article.publishedAt).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Layout>
      <div className="container py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2">
            <article className="card-base p-6 md:p-8">
              {/* Header */}
              <header className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="badge-brand capitalize">{article.article_type}</span>
                  <span className="text-sm text-ink-400">{publishDate}</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-ink-900 mb-4">
                  {article.title}
                </h1>
                {article.excerpt && (
                  <p className="text-lg text-ink-600 leading-relaxed">{article.excerpt}</p>
                )}
              </header>

              {/* Body */}
              <div className="prose prose-ink max-w-none">
                <p className="text-ink-700 leading-relaxed">
                  {article.body || "Full article content coming soon. Check back for the complete story."}
                </p>

                {/* Placeholder content for demo */}
                <h2 className="text-xl font-bold text-ink-900 mt-8 mb-4">Key Highlights</h2>
                <ul className="list-disc list-inside space-y-2 text-ink-700">
                  <li>Expert analysis from our team of professional tipsters</li>
                  <li>In-depth statistics and form guides</li>
                  <li>Value picks with competitive odds</li>
                  <li>Responsible gambling guidance</li>
                </ul>

                <h2 className="text-xl font-bold text-ink-900 mt-8 mb-4">Our Verdict</h2>
                <p className="text-ink-700 leading-relaxed">
                  Based on our comprehensive analysis, we believe this selection offers excellent value. 
                  As always, please remember to bet responsibly and only stake what you can afford to lose.
                </p>
              </div>

              {/* Share / Actions */}
              <footer className="mt-8 pt-6 border-t border-ink-100">
                <div className="flex items-center justify-between">
                  <Link to="/news" className="link-brand text-sm">
                    ← Back to News
                  </Link>
                  <div className="flex gap-2">
                    <button className="btn-secondary text-sm">Share</button>
                  </div>
                </div>
              </footer>
            </article>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            <NewsletterWidget />

            {/* Related Articles */}
            <div className="card-base overflow-hidden">
              <div className="widget-header">Related Articles</div>
              <div className="divide-y divide-ink-100">
                {mockArticles
                  .filter((a) => a.id !== article.id)
                  .slice(0, 4)
                  .map((related) => (
                    <Link
                      key={related.id}
                      to={`/news/${related.slug}`}
                      className="block p-3 hover:bg-ink-50 transition-colors"
                    >
                      <p className="text-sm font-medium text-ink-900 line-clamp-2">
                        {related.title}
                      </p>
                      <span className="text-xs text-ink-400 mt-1 block capitalize">
                        {related.article_type}
                      </span>
                    </Link>
                  ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
