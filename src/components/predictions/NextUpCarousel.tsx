import { Link } from "react-router-dom";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { TeamLogo } from "@/components/TeamLogo";
import { CountdownBadge } from "@/components/predictions/CountdownBadge";
import { useRef, useState, useEffect } from "react";

interface NextUpFixture {
  id: string;
  slug: string;
  kickoff_at: string;
  home_team?: { name: string; logo_url?: string | null } | null;
  away_team?: { name: string; logo_url?: string | null } | null;
  league?: { name: string; slug: string } | null;
}

interface NextUpCarouselProps {
  fixtures: NextUpFixture[];
  previewMap: Map<string, string>;
}

export function NextUpCarousel({ fixtures, previewMap }: NextUpCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) el.addEventListener("scroll", checkScroll, { passive: true });
    return () => el?.removeEventListener("scroll", checkScroll);
  }, [fixtures]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = 260;
    el.scrollBy({ left: dir === "left" ? -cardWidth : cardWidth, behavior: "smooth" });
  };

  if (fixtures.length === 0) return null;

  const kickoffTime = (iso: string) =>
    new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  return (
    <section className="relative">
      {/* Section header */}
      <div className="flex items-center justify-between mb-fluid-sm">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full bg-brand-500" />
          <h2 className="text-fluid-lg font-bold text-ink-900">Next Up</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-ink-200 text-ink-500 hover:bg-ink-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-ink-200 text-ink-500 hover:bg-ink-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Scrollable card track */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1"
      >
        {fixtures.map((fixture) => (
          <Link
            key={fixture.id}
            to={`/match/${previewMap.get(fixture.id) || fixture.slug}`}
            className="group flex-shrink-0 w-[240px] xs:w-[260px] bg-surface border border-ink-200 rounded-xl overflow-hidden shadow-soft hover:shadow-lift hover:-translate-y-0.5 transition-all duration-200"
          >
            {/* League label bar */}
            <div className="bg-brand-800 px-3 py-1.5 flex items-center justify-between">
              <span className="text-brand-200 text-fluid-xs font-medium truncate">
                {fixture.league?.name || "Match"}
              </span>
              <CountdownBadge kickoffAt={fixture.kickoff_at} />
            </div>

            {/* Card body */}
            <div className="p-4 flex flex-col items-center gap-3">
              {/* Teams row */}
              <div className="flex items-center justify-center gap-4 w-full">
                {/* Home */}
                <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                  <TeamLogo
                    logoUrl={fixture.home_team?.logo_url}
                    teamName={fixture.home_team?.name || "Home"}
                    size="md"
                  />
                  <span className="text-fluid-xs font-semibold text-ink-800 text-center truncate w-full leading-tight">
                    {fixture.home_team?.name || "TBD"}
                  </span>
                </div>

                {/* VS divider */}
                <div className="flex flex-col items-center shrink-0">
                  <span className="text-fluid-xs font-bold text-ink-400 uppercase">vs</span>
                </div>

                {/* Away */}
                <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                  <TeamLogo
                    logoUrl={fixture.away_team?.logo_url}
                    teamName={fixture.away_team?.name || "Away"}
                    size="md"
                  />
                  <span className="text-fluid-xs font-semibold text-ink-800 text-center truncate w-full leading-tight">
                    {fixture.away_team?.name || "TBD"}
                  </span>
                </div>
              </div>

              {/* Kickoff time */}
              <div className="flex items-center gap-2 text-ink-500 text-fluid-xs">
                <span>Kick-off</span>
                <span className="font-semibold text-ink-700">{kickoffTime(fixture.kickoff_at)}</span>
              </div>

              {/* CTA */}
              <div className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg bg-brand-50 text-brand-600 text-fluid-xs font-semibold group-hover:bg-brand-100 transition-colors">
                View Prediction
                <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
