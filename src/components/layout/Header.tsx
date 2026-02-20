import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const mainNavItems = [
  { label: "Football Tips", href: "/tips/bet-of-the-day" },
  { label: "Predictions", href: "/predictions" },
  { label: "News", href: "/news" },
  { label: "Free Bets", href: "/free-bets" },
];

const tipCategories = [
  { label: "All Football Tips", href: "/tips/bet-of-the-day" },
  { label: "Accumulator Tips", href: "/tips/acca" },
  { label: "BTTS Tips", href: "/tips/btts" },
  { label: "Correct Score", href: "/tips/correct-score" },
  { label: "Over/Under", href: "/tips/over-under" },
  { label: "Double Chance", href: "/tips/double-chance" },
];

export function Header() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (href: string) => location.pathname.startsWith(href);
  const isTipsPage = location.pathname.startsWith("/tips");

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface shadow-soft w-full">
      {/* Top bar */}
      <div className="header-strip">
        <div className="container flex items-center justify-between" style={{ height: 'clamp(3rem, 2.5rem + 2vw, 3.5rem)' }}>
          <Link to="/" className="flex items-center gap-2">
            <span className="font-bold tracking-tight text-fluid-xl">
              <span className="text-brand-300">Tip</span>
              <span className="text-white">Pulse</span>
            </span>
          </Link>
          
          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-fluid-md">
            {mainNavItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`text-fluid-sm font-medium transition-colors whitespace-nowrap ${
                  isActive(item.href)
                    ? "text-white"
                    : "text-brand-200 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/free-bets"
              className="bg-success-500 hover:bg-success-700 text-white px-fluid-md py-2 rounded-lg text-fluid-sm font-semibold transition-colors whitespace-nowrap"
            >
              Free Bets
            </Link>
          </nav>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-white p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Secondary nav - tip categories */}
      {isTipsPage && (
        <div className="bg-surface border-b border-ink-200">
          <div className="container">
            <nav className="flex items-center gap-1 overflow-x-auto py-2 -mx-4 px-4 scrollbar-hide">
              {tipCategories.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`whitespace-nowrap px-3 py-2 text-fluid-sm font-medium rounded-lg transition-colors ${
                    location.pathname === item.href
                      ? "text-brand-600 bg-brand-50"
                      : "text-ink-600 hover:text-brand-600 hover:bg-ink-50"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-surface border-b border-ink-200 animate-fade-in">
          <nav className="container py-4 space-y-2">
            {mainNavItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="block px-4 py-2 text-ink-700 hover:bg-ink-50 rounded-lg font-medium text-fluid-sm"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-ink-200 mt-2">
              <Link
                to="/free-bets"
                className="block bg-success-500 text-white text-center py-3 rounded-lg font-semibold text-fluid-sm"
                onClick={() => setMobileMenuOpen(false)}
              >
                Free Bets
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
