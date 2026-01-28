import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { NewsletterWidget } from "@/components/widgets/NewsletterWidget";
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

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: article, isLoading, error } = useQuery({
    queryKey: ["news_posts", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_posts")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      return data as NewsPost | null;
    },
    enabled: !!slug,
  });

  const { data: relatedArticles } = useQuery({
    queryKey: ["news_posts", "related", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_posts")
        .select("id, title, slug, created_at")
        .eq("published", true)
        .neq("slug", slug)
        .order("created_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-12 flex justify-center">
          <Loader2 size={32} className="animate-spin text-brand-600" />
        </div>
      </Layout>
    );
  }

  if (error || !article) {
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

  const publishDate = new Date(article.created_at).toLocaleDateString("en-GB", {
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
                  <span className="badge-brand">News</span>
                  <span className="text-sm text-ink-400">{publishDate}</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-ink-900 mb-4">
                  {article.title}
                </h1>
                {article.excerpt && (
                  <p className="text-lg text-ink-600 leading-relaxed">{article.excerpt}</p>
                )}
              </header>

              {/* Cover image */}
              {article.cover_image_url && (
                <div className="mb-6">
                  <img
                    src={article.cover_image_url}
                    alt={article.title}
                    className="w-full rounded-lg"
                  />
                </div>
              )}

              {/* Body */}
              <div className="prose prose-ink max-w-none">
                <div className="text-ink-700 leading-relaxed whitespace-pre-wrap">
                  {article.content}
                </div>
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
            {relatedArticles && relatedArticles.length > 0 && (
              <div className="card-base overflow-hidden">
                <div className="widget-header">Related Articles</div>
                <div className="divide-y divide-ink-100">
                  {relatedArticles.map((related) => (
                    <Link
                      key={related.id}
                      to={`/news/${related.slug}`}
                      className="block p-3 hover:bg-ink-50 transition-colors"
                    >
                      <p className="text-sm font-medium text-ink-900 line-clamp-2">
                        {related.title}
                      </p>
                      <span className="text-xs text-ink-400 mt-1 block">
                        {new Date(related.created_at).toLocaleDateString("en-GB")}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </Layout>
  );
}
