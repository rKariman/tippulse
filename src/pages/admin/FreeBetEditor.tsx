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

export default function FreeBetEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [bookmaker, setBookmaker] = useState("");
  const [description, setDescription] = useState("");
  const [terms, setTerms] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [region, setRegion] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [published, setPublished] = useState(true);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Fetch existing offer
  const { data: offer, isLoading } = useQuery({
    queryKey: ["admin", "free_bets", id],
    queryFn: async () => {
      if (isNew) return null;
      const { data, error } = await supabase
        .from("free_bets")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !isNew,
  });

  // Load offer data
  useEffect(() => {
    if (offer) {
      setTitle(offer.title);
      setSlug(offer.slug);
      setBookmaker(offer.bookmaker || "");
      setDescription(offer.description);
      setTerms(offer.terms || "");
      setTargetUrl(offer.target_url);
      setRegion(offer.region || "");
      setIsFeatured(offer.is_featured);
      setValidFrom(offer.valid_from ? offer.valid_from.slice(0, 10) : "");
      setValidTo(offer.valid_to ? offer.valid_to.slice(0, 10) : "");
      setPublished(offer.published);
      setSlugManuallyEdited(true);
    }
  }, [offer]);

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
        .from("free_bets")
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
        bookmaker: bookmaker || null,
        description,
        terms: terms || null,
        target_url: targetUrl,
        region: region || null,
        is_featured: isFeatured,
        valid_from: validFrom ? new Date(validFrom).toISOString() : null,
        valid_to: validTo ? new Date(validTo).toISOString() : null,
        published,
      };

      if (isNew) {
        const { error } = await supabase.from("free_bets").insert(data);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("free_bets").update(data).eq("id", id);
        if (error) throw error;
      }
      
      return uniqueSlug;
    },
    onSuccess: (uniqueSlug) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "free_bets"] });
      toast.success(isNew ? "Free bet created!" : "Free bet updated!");
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
            {isNew ? "Create Free Bet Offer" : "Edit Free Bet Offer"}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="card-base p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Bet £10 Get £30"
                required
              />
            </div>

            <div>
              <Label htmlFor="bookmaker">Bookmaker</Label>
              <Input
                id="bookmaker"
                value={bookmaker}
                onChange={(e) => setBookmaker(e.target.value)}
                placeholder="e.g., Bet365"
              />
            </div>
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
              placeholder="offer-url-slug"
              required
            />
            <p className="text-xs text-ink-400 mt-1">URL: /free-bets (shown in list)</p>
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the offer..."
              rows={3}
              required
            />
          </div>

          <div>
            <Label htmlFor="terms">Terms & Conditions</Label>
            <Textarea
              id="terms"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="18+ T&Cs Apply..."
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="targetUrl">Target URL *</Label>
            <Input
              id="targetUrl"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://affiliate.example.com/offer"
              required
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="region">Region</Label>
              <Input
                id="region"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="e.g., UK, Ireland"
              />
            </div>

            <div className="flex items-center gap-4 pt-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="featured"
                  checked={isFeatured}
                  onCheckedChange={setIsFeatured}
                />
                <Label htmlFor="featured">Featured</Label>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="validFrom">Valid From</Label>
              <Input
                id="validFrom"
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="validTo">Valid To</Label>
              <Input
                id="validTo"
                type="date"
                value={validTo}
                onChange={(e) => setValidTo(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
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
              {isNew ? "Create Offer" : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
