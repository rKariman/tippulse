import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface PlayerTip {
  id: string;
  player_name: string;
  title: string;
  confidence: string;
  reasoning: string;
}

interface PlayerTipCardProps {
  tip: PlayerTip;
  fixtureId: string;
  baseUrl: string;
}

export function PlayerTipCard({ tip, fixtureId, baseUrl }: PlayerTipCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-ink-300" />
          <span className="font-medium text-ink-900">{tip.title}</span>
        </div>
        {expanded ? (
          <ChevronUp size={20} className="text-ink-400" />
        ) : (
          <ChevronDown size={20} className="text-ink-400" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 ml-5">
          <div className="bg-ink-50 border border-ink-200 rounded-lg p-3 mb-3">
            <p className="text-sm font-medium text-ink-700 mb-1">Reason for tip</p>
            <p className="text-sm text-ink-600">{tip.reasoning}</p>
          </div>
          <a
            href={`${baseUrl}?fixture=${fixtureId}&playerTip=${tip.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 py-1.5 rounded text-sm transition-colors"
          >
            PLACE BET
            <ChevronDown size={14} />
          </a>
        </div>
      )}
    </div>
  );
}
