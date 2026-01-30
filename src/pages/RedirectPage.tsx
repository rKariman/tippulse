import { useParams, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { isValidRedirectUrl } from "@/lib/urlValidation";

export default function RedirectPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState(false);

  // Fetch the free bet by slug from Supabase
  const { data: offer, isLoading } = useQuery({
    queryKey: ["free_bet", "redirect", id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from("free_bets")
        .select("id, slug, bookmaker, target_url")
        .eq("slug", id)
        .eq("published", true)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    async function handleRedirect() {
      if (isLoading) return;
      
      if (!offer) {
        setError(true);
        return;
      }

      // Validate URL scheme to prevent XSS via javascript: or data: URLs
      if (!isValidRedirectUrl(offer.target_url)) {
        console.error("Invalid redirect URL scheme:", offer.target_url);
        setError(true);
        return;
      }

      try {
        // Log the click
        await supabase.from("outbound_clicks").insert({
          route: searchParams.get("from") || document.referrer,
          offer_slug: offer.slug,
          bookmaker_slug: offer.bookmaker || null,
          target_url: offer.target_url,
          referrer: document.referrer,
          user_agent: navigator.userAgent,
        });
      } catch (err) {
        console.error("Failed to log click:", err);
        // Continue with redirect even if logging fails
      }

      // Redirect to target URL
      window.location.href = offer.target_url;
    }

    handleRedirect();
  }, [offer, isLoading, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-ink-900 mb-2">Offer Not Found</h1>
          <p className="text-ink-500 mb-4">The offer you're looking for doesn't exist or has expired.</p>
          <a href="/free-bets" className="btn-primary">
            View All Offers
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-50">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-ink-500">Redirecting to offer...</p>
      </div>
    </div>
  );
}
