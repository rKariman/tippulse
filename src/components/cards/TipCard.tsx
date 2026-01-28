import { Link } from "react-router-dom";
import { Star, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

export interface TipCardProps {
  id: string;
  title: string;
  fixture: {
    homeTeam: string;
    awayTeam: string;
    kickoffAt: string;
    league: string;
  };
  selection: string;
  odds: number;
  stars?: number;
  reasoningShort?: string;
  reasoningLong?: string;
  previewSlug?: string;
}

export function TipCard({
  title,
  fixture,
  selection,
  odds,
  stars = 3,
  reasoningShort,
  reasoningLong,
  previewSlug,
}: TipCardProps) {
  const [expanded, setExpanded] = useState(false);

  const kickoffTime = new Date(fixture.kickoffAt).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="card-base">
      {/* Header strip */}
      <div className="bg-brand-800 text-white px-4 py-3 flex items-center justify-between">
        <span className="font-semibold text-sm">{title}</span>
        <span className="badge-brand text-xs">TipPulse</span>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Match info */}
        <div className="flex items-start gap-3 mb-3">
          <div className="text-center">
            <div className="text-sm font-semibold text-ink-700">{kickoffTime}</div>
            <div className="text-xs text-ink-400 mt-0.5">{fixture.league}</div>
          </div>
          <div className="flex-1">
            <div className="font-semibold text-ink-900">{selection}</div>
            <div className="text-sm text-ink-500">
              vs {fixture.homeTeam} - {fixture.awayTeam}
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700"
          >
            {expanded ? (
              <>
                <span>Hide</span>
                <ChevronUp size={16} />
              </>
            ) : (
              <>
                <span>Details</span>
                <ChevronDown size={16} />
              </>
            )}
          </button>
        </div>

        {/* Expanded reasoning */}
        {expanded && (reasoningShort || reasoningLong) && (
          <div className="bg-ink-50 border border-ink-200 rounded-lg p-3 mb-3 animate-fade-in">
            <div className="text-sm font-medium text-ink-700 mb-2">Reason for tip</div>
            <p className="text-sm text-ink-600">
              {reasoningLong || reasoningShort}
            </p>
            {previewSlug && (
              <Link
                to={`/match/${previewSlug}`}
                className="inline-block mt-2 text-sm link-brand"
              >
                View Full Preview →
              </Link>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-ink-100">
          <div className="flex items-center gap-2">
            <span className="odds-display">{odds.toFixed(2)}</span>
            <span className="text-xs text-ink-400">odds when tipped</span>
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={14}
                className={i < stars ? "fill-warning-500 text-warning-500" : "text-ink-200"}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
