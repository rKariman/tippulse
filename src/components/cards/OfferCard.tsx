import { Link } from "react-router-dom";

export interface OfferCardProps {
  id: string;
  title: string;
  description?: string;
  bookmaker: {
    name: string;
    logoUrl?: string;
  };
  targetUrl: string;
  slug: string;
}

export function OfferCard({
  title,
  description,
  bookmaker,
  slug,
}: OfferCardProps) {
  return (
    <div className="card-interactive p-4">
      <div className="flex items-start gap-3">
        {/* Bookmaker logo placeholder */}
        <div className="w-16 h-12 bg-ink-100 rounded-lg flex items-center justify-center shrink-0">
          {bookmaker.logoUrl ? (
            <img
              src={bookmaker.logoUrl}
              alt={bookmaker.name}
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <span className="text-xs font-bold text-ink-500 text-center px-1">
              {bookmaker.name}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-ink-900 text-sm leading-tight">
            {title}
          </h3>
          {description && (
            <p className="text-xs text-ink-500 mt-1 line-clamp-2">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-3 flex gap-2">
        <Link
          to={`/r/${slug}`}
          className="flex-1 btn-cta text-center text-sm py-2"
        >
          Claim Offer
        </Link>
        <Link
          to={`/free-bets`}
          className="btn-secondary text-center text-sm py-2 px-3"
        >
          Details
        </Link>
      </div>

      <p className="text-xs text-ink-400 mt-2 text-center">18+ T&Cs Apply</p>
    </div>
  );
}
