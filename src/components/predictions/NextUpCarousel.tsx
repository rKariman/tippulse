import { Link } from "react-router-dom";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { TeamLogo } from "@/components/TeamLogo";
import { CountdownBadge } from "@/components/predictions/CountdownBadge";
import { useLiveMinute, type MatchPhase } from "@/hooks/useLiveMinute";
import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface NextUpFixture {
  id: string;
  slug: string;
  kickoff_at: string;
  home_team?: { name: string; logo_url?: string | null } | null;
  away_team?: { name: string; logo_url?: string | null } | null;
  league?: { name: string; slug: string } | null;
  home_score?: number | null;
  away_score?: number | null;
  phase?: string | null;
  phase_started_at?: string | null;
  base_minute?: number | null;
}

interface NextUpCarouselProps {
  fixtures: NextUpFixture[];
  previewMap: Map<string, string>;
}

/** Compact status pill for the league bar */
function StatusPill({ fixture }: { fixture: NextUpFixture }) {
  const { displayMinute, isLive, isHalfTime, isFinished, isPenalties } = useLiveMinute({
    phase: fixture.phase as MatchPhase,
    phaseStartedAt: fixture.phase_started_at ?? null,
    baseMinute: fixture.base_minute ?? null,
    kickoffAt: fixture.kickoff_at,
  });

  const isActive = isLive || isPenalties;
  const isBreak = isHalfTime;
  const isDone = isFinished;

  if (!isActive && !isBreak && !isDone) {
    // Scheduled — show countdown
    return <CountdownBadge kickoffAt={fixture.kickoff_at} />;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-fluid-xs font-semibold",
        isActive && "bg-danger-500 text-surface",
        isBreak && "bg-warning-500 text-ink-900",
        isDone && "bg-ink-600 text-ink-200"
      )}
    >
      {isActive && (
        <span className="w-1.5 h-1.5 rounded-full bg-surface animate-pulse" />
      )}
      {displayMinute}
    </span>
  );
}

/** Score or VS center block */
function ScoreCenter({ fixture }: { fixture: NextUpFixture }) {
  const phase = (fixture.phase as MatchPhase) || "scheduled";
  const isInProgress = ["live", "2h", "et1", "et2", "ht", "et_ht", "pens", "finished"].includes(phase);

  if (!isInProgress) {
    return <span className="text-fluid-xs font-bold text-ink-400 uppercase">vs</span>;
  }

  const home = fixture.home_score ?? 0;
  const away = fixture.away_score ?? 0;

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-fluid-lg font-extrabold text-ink-900 tabular-nums leading-none">
        {home} – {away}
      </span>
    </div>
  );
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

  const isScheduled = (f: NextUpFixture) => {
    const phase = f.phase || "scheduled";
    return phase === "scheduled";
  };

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
              <StatusPill fixture={fixture} />
            </div>

            {/* Card body */}
            <div className="p-4 flex flex-col items-center gap-3">
              {/* Teams row */}
              <div className="flex items-center justify-center gap-3 w-full">
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

                {/* Score or VS */}
                <div className="flex flex-col items-center shrink-0 min-w-[40px]">
                  <ScoreCenter fixture={fixture} />
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

              {/* Kickoff time — only for scheduled matches */}
              {isScheduled(fixture) && (
                <div className="flex items-center gap-2 text-ink-500 text-fluid-xs">
                  <span>Kick-off</span>
                  <span className="font-semibold text-ink-700">{kickoffTime(fixture.kickoff_at)}</span>
                </div>
              )}

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
