import { Layout } from "@/components/layout/Layout";
import { OfferCard } from "@/components/cards/OfferCard";
import { NewsletterWidget } from "@/components/widgets/NewsletterWidget";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface FreeBet {
  id: string;
  title: string;
  slug: string;
  bookmaker: string | null;
  description: string;
  terms: string | null;
  target_url: string;
  is_featured: boolean;
}

export default function FreeBetsPage() {
  const { data: freeBets, isLoading, error } = useQuery({
    queryKey: ["free_bets", "published"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("free_bets")
        .select("id, title, slug, bookmaker, description, terms, target_url, is_featured")
        .eq("published", true)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as FreeBet[];
    },
  });

  return (
    <Layout>
      <div className="container py-6">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-ink-900 mb-2">Free Bets & Betting Offers</h1>
          <p className="text-ink-500 text-sm max-w-2xl">
            The best free bet offers and sign-up bonuses from top UK bookmakers. All offers are for new customers only.
          </p>
        </div>

        {/* 18+ Warning */}
        <div className="bg-warning-50 border border-warning-500 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="inline-flex items-center justify-center w-8 h-8 bg-warning-500 text-white rounded-full text-sm font-bold shrink-0">
              18+
            </span>
            <div>
              <p className="font-semibold text-warning-700 mb-1">Responsible Gambling</p>
              <p className="text-sm text-warning-700">
                All offers are for new customers aged 18+. Please gamble responsibly. 
                BeGambleAware.org. Terms and conditions apply to all offers.
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 size={32} className="animate-spin text-brand-600 mx-auto mb-3" />
                <p className="text-ink-500">Loading offers...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12 bg-surface border border-ink-200 rounded-xl">
                <p className="text-ink-500">Failed to load offers. Please try again later.</p>
              </div>
            ) : freeBets && freeBets.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {freeBets.map((offer) => (
                  <OfferCard
                    key={offer.id}
                    id={offer.id}
                    title={offer.title}
                    description={offer.description}
                    bookmaker={{ name: offer.bookmaker || "Bookmaker" }}
                    targetUrl={offer.target_url}
                    slug={offer.slug}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-surface border border-ink-200 rounded-xl">
                <p className="text-ink-500">No offers available at the moment.</p>
                <p className="text-sm text-ink-400 mt-1">Check back later for new promotions.</p>
              </div>
            )}

            {/* Additional info */}
            <div className="card-base p-6">
              <h2 className="text-lg font-bold text-ink-900 mb-4">How Free Bets Work</h2>
              <div className="space-y-4 text-sm text-ink-600">
                <p>
                  Free bets are promotional offers from bookmakers that allow you to place a bet without 
                  risking your own money. They're typically offered to new customers as a sign-up bonus.
                </p>
                <h3 className="font-semibold text-ink-900">Key Terms to Know:</h3>
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>Wagering Requirements:</strong> Most free bets need to be wagered a certain number of times before you can withdraw winnings.</li>
                  <li><strong>Minimum Odds:</strong> Many offers require you to place bets at minimum odds (e.g., 1/2 or 1.50).</li>
                  <li><strong>Time Limits:</strong> Free bets usually expire after a set period (often 7-30 days).</li>
                  <li><strong>Stake Not Returned:</strong> With most free bets, only the winnings are paid out, not the original stake.</li>
                </ul>
                <p className="text-ink-500">
                  Always read the full terms and conditions before claiming any offer. If you need help 
                  with gambling-related issues, visit BeGambleAware.org or call 0808 8020 133.
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            <NewsletterWidget />

            {/* Quick Tips */}
            <div className="card-base overflow-hidden">
              <div className="widget-header">Claiming Tips</div>
              <div className="p-4 space-y-3 text-sm text-ink-600">
                <p>✓ Compare multiple offers before signing up</p>
                <p>✓ Read terms and conditions carefully</p>
                <p>✓ Check wagering requirements</p>
                <p>✓ Note minimum odds requirements</p>
                <p>✓ Be aware of time limits</p>
              </div>
            </div>

            {/* Responsible Gambling */}
            <div className="card-base overflow-hidden">
              <div className="bg-ink-900 text-white px-4 py-3 font-semibold text-sm">
                Responsible Gambling
              </div>
              <div className="p-4 space-y-3 text-sm text-ink-600">
                <p>
                  Set deposit limits, take breaks, and never chase losses. 
                  Gambling should be fun, not a way to make money.
                </p>
                <a
                  href="https://www.begambleaware.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block btn-secondary text-center"
                >
                  BeGambleAware.org
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
