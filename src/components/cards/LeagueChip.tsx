import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

interface LeagueChipProps {
  name: string;
  slug: string;
  matchCount?: number;
}

export function LeagueChip({ name, slug, matchCount }: LeagueChipProps) {
  return (
    <Link
      to={`/predictions?league=${slug}`}
      className="inline-flex items-center gap-2 px-4 py-2 bg-surface border border-ink-200 rounded-full hover:border-brand-300 hover:bg-brand-50 transition-colors group"
    >
      <span className="font-medium text-sm text-ink-700 group-hover:text-brand-700">
        {name}
      </span>
      {matchCount !== undefined && (
        <span className="text-xs text-ink-400 group-hover:text-brand-500">
          {matchCount} matches
        </span>
      )}
      <ChevronRight size={14} className="text-ink-300 group-hover:text-brand-500" />
    </Link>
  );
}
