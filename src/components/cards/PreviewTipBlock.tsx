import { Star } from "lucide-react";
import { useState } from "react";
import { PLACE_BET_URL } from "@/config/betting";

export interface PreviewTipBlockProps {
  title: string;
  selection: string;
  odds: number;
  stars?: number;
  reasoning?: string;
  bookmakers: {
    id: string;
    name: string;
    offerSlug: string;
    returnAmount?: number;
  }[];
}

export function PreviewTipBlock({
  title,
  selection,
  odds,
  stars = 3,
  reasoning,
  bookmakers,
}: PreviewTipBlockProps) {
  const [stake, setStake] = useState(10);
  const [showReasoning, setShowReasoning] = useState(false);
  const potentialReturn = (stake * odds).toFixed(2);

  return (
    <div className="card-base overflow-hidden">
      {/* Header */}
      <div className="bg-brand-800 text-white px-4 py-3 flex items-center gap-2">
        <span className="badge-brand text-xs bg-brand-100 text-brand-800">TipPulse</span>
        <span className="font-semibold text-sm">TIPS</span>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-bold text-ink-900 text-lg mb-2">{selection}</h3>
        <p className="text-sm text-ink-600 mb-2">{title}</p>

        {/* Stars */}
        <div className="flex items-center gap-1 mb-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              size={16}
              className={i < stars ? "fill-warning-500 text-warning-500" : "text-ink-200"}
            />
          ))}
        </div>

        {/* Reasoning toggle */}
        {reasoning && (
          <div className="mb-4">
            <button
              onClick={() => setShowReasoning(!showReasoning)}
              className="text-sm link-brand"
            >
              {showReasoning ? "Hide reasoning" : "Show reasoning"} →
            </button>
            {showReasoning && (
              <div className="mt-2 bg-ink-50 border border-ink-200 rounded-lg p-3 animate-fade-in">
                <p className="text-sm text-ink-600">{reasoning}</p>
              </div>
            )}
          </div>
        )}

        {/* Odds and stake calculator */}
        <div className="flex items-center justify-between py-3 border-t border-b border-ink-100">
          <div className="flex items-center gap-2">
            <span className="odds-display">{odds.toFixed(2)}</span>
            <span className="text-xs text-ink-400">odds when tipped</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-500">Stake £</span>
            <input
              type="number"
              value={stake}
              onChange={(e) => setStake(Number(e.target.value))}
              className="w-16 px-2 py-1 border border-ink-200 rounded text-sm text-center"
              min={1}
            />
            <span className="text-sm font-semibold text-success-600">
              = £{potentialReturn}
            </span>
          </div>
        </div>

        {/* Bookmaker CTAs */}
        <div className="mt-4 space-y-2">
          <div className="grid grid-cols-4 gap-2 text-xs text-ink-500 font-medium px-2">
            <span>Bookie</span>
            <span>£{stake} Returns</span>
            <span>Bet Tip</span>
            <span>Sign Up</span>
          </div>
          {bookmakers.map((bookie) => (
            <div
              key={bookie.id}
              className="grid grid-cols-4 gap-2 items-center p-2 bg-ink-50 rounded-lg"
            >
              <span className="font-semibold text-sm text-ink-700">{bookie.name}</span>
              <span className="font-bold text-ink-900">
                £{(stake * odds).toFixed(2)}
              </span>
              <a
                href={PLACE_BET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-cta text-xs py-1.5 text-center"
              >
                BET HERE
              </a>
              <a
                href={PLACE_BET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-xs py-1.5 text-center"
              >
                Claim Bonus
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
