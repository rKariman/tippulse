import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export default function NewsEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [published, setPublished] = useState(true);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Fetch existing post
  const { data: post, isLoading } = useQuery({
    queryKey: ["admin", "news_posts", id],
    queryFn: async () => {
      if (isNew) return null;
      const { data, error } = await supabase
        .from("news_posts")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !isNew,
  });

  // Load post data
  useEffect(() => {
    if (post) {
      setTitle(post.title);
      setSlug(post.slug);
      setExcerpt(post.excerpt || "");
      setContent(post.content);
      setCoverImageUrl(post.cover_image_url || "");
      setPublished(post.published);
      setSlugManuallyEdited(true);
    }
  }, [post]);

  // Auto-generate slug from title
  useEffect(() => {
    if (!slugManuallyEdited && title) {
      setSlug(generateSlug(title));
    }
  }, [title, slugManuallyEdited]);

  // Check slug uniqueness
  const checkSlugUnique = async (testSlug: string, excludeId?: string): Promise<string> => {
    let finalSlug = testSlug;
    let counter = 1;
    
    while (true) {
      let query = supabase
        .from("news_posts")
        .select("id")
        .eq("slug", finalSlug);
      
      if (excludeId) {
        query = query.neq("id", excludeId);
      }
      
      const { data } = await query.maybeSingle();
      
      if (!data) break;
      
      counter++;
      finalSlug = `${testSlug}-${counter}`;
    }
    
    return finalSlug;
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const uniqueSlug = await checkSlugUnique(slug, isNew ? undefined : id);
      
      const data = {
        title,
        slug: uniqueSlug,
        excerpt: excerpt || null,
        content,
        cover_image_url: coverImageUrl || null,
        published,
      };

      if (isNew) {
        const { error } = await supabase.from("news_posts").insert(data);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("news_posts").update(data).eq("id", id);
        if (error) throw error;
      }
      
      return uniqueSlug;
    },
    onSuccess: (uniqueSlug) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "news_posts"] });
      toast.success(isNew ? "News post created!" : "News post updated!");
      if (slug !== uniqueSlug) {
        toast.info(`Slug changed to "${uniqueSlug}" to ensure uniqueness`);
      }
      navigate("/admin");
    },
    onError: (err) => {
      toast.error("Failed to save: " + (err as Error).message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  if (!isNew && isLoading) {
    return (
      <Layout>
        <div className="container py-12 flex justify-center">
          <Loader2 size={32} className="animate-spin text-brand-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-6 max-w-3xl">
        <div className="mb-6">
          <Link to="/admin" className="inline-flex items-center text-sm text-ink-500 hover:text-ink-700 mb-4">
            <ArrowLeft size={16} className="mr-1" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-ink-900">
            {isNew ? "Create News Post" : "Edit News Post"}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="card-base p-6 space-y-6">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter post title"
              required
            />
          </div>

          <div>
            <Label htmlFor="slug">Slug *</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugManuallyEdited(true);
              }}
              placeholder="post-url-slug"
              required
            />
            <p className="text-xs text-ink-400 mt-1">URL: /news/{slug}</p>
          </div>

          <div>
            <Label htmlFor="excerpt">Excerpt</Label>
            <Textarea
              id="excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Brief summary of the post..."
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your post content here... (Markdown supported)"
              rows={12}
              required
            />
          </div>

          <div>
            <Label htmlFor="coverImage">Cover Image URL</Label>
            <Input
              id="coverImage"
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                id="published"
                checked={published}
                onCheckedChange={setPublished}
              />
              <Label htmlFor="published">Published</Label>
            </div>
            
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <Loader2 size={16} className="animate-spin mr-2" />
              ) : (
                <Save size={16} className="mr-2" />
              )}
              {isNew ? "Create Post" : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
