import { useState } from "react";
import { ChevronDown, ChevronUp, Star } from "lucide-react";

interface MatchTip {
  id: string;
  tip_type: string;
  title: string;
  confidence: string;
  odds: string | null;
  reasoning: string;
}

interface MatchTipCardProps {
  tip: MatchTip;
  fixtureId: string;
  baseUrl: string;
}

export function MatchTipCard({ tip, fixtureId, baseUrl }: MatchTipCardProps) {
  const [expanded, setExpanded] = useState(false);

  const getStars = (confidence: string) => {
    switch (confidence) {
      case "high":
        return 3;
      case "medium":
        return 2;
      case "low":
        return 1;
      default:
        return 2;
    }
  };

  const stars = getStars(tip.confidence);

  return (
    <div className="p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-semibold text-ink-900">{tip.title}</h3>
          <div className="flex items-center gap-1 mt-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <Star
                key={i}
                size={14}
                className={i < stars ? "fill-warning-500 text-warning-500" : "text-ink-200"}
              />
            ))}
            <span className="text-xs text-ink-400 ml-1 capitalize">{tip.confidence} confidence</span>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700"
        >
          Reasoning
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {expanded && (
        <div className="bg-ink-50 border border-ink-200 rounded-lg p-3 mb-3 text-sm text-ink-600">
          <p className="font-medium text-ink-700 mb-1">Reason for tip</p>
          <p>{tip.reasoning}</p>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          {tip.odds && (
            <>
              <span className="text-lg font-bold text-brand-800 border border-ink-200 px-3 py-1 rounded">
                {tip.odds}
              </span>
              <span className="text-sm text-ink-500">odds when tipped</span>
            </>
          )}
        </div>
        <a
          href={`${baseUrl}?fixture=${fixtureId}&tip=${tip.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-2 rounded flex items-center gap-1 transition-colors"
        >
          PLACE BET
          <ChevronDown size={16} />
        </a>
      </div>
    </div>
  );
}
