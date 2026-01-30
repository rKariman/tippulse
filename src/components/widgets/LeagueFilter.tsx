interface League {
  id: string;
  name: string;
  slug: string;
}

interface LeagueFilterProps {
  leagues: League[];
  selected: string | null;
  onChange: (slug: string | null) => void;
}

export function LeagueFilter({ leagues, selected, onChange }: LeagueFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
      <button
        onClick={() => onChange(null)}
        className={`whitespace-nowrap px-fluid-md py-2 text-fluid-sm font-medium rounded-full transition-colors ${
          selected === null
            ? "bg-brand-600 text-white"
            : "bg-ink-100 text-ink-600 hover:bg-ink-200"
        }`}
      >
        All Leagues
      </button>
      {leagues.map((league) => (
        <button
          key={league.id}
          onClick={() => onChange(league.slug)}
          className={`whitespace-nowrap px-fluid-md py-2 text-fluid-sm font-medium rounded-full transition-colors ${
            selected === league.slug
              ? "bg-brand-600 text-white"
              : "bg-ink-100 text-ink-600 hover:bg-ink-200"
          }`}
        >
          {league.name}
        </button>
      ))}
    </div>
  );
}
