import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="bg-ink-900 text-ink-300 mt-12">
      {/* Responsible gambling section */}
      <div className="border-b border-ink-800">
        <div className="container py-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="inline-flex items-center justify-center w-10 h-10 bg-ink-800 rounded-full text-white font-bold text-sm">
              18+
            </span>
            <span className="text-lg font-semibold text-white">GambleAware</span>
          </div>
          <p className="text-sm max-w-2xl mx-auto mb-4">
            GambleAware.org aims to promote responsibility in gambling. They provide information to help you make informed decisions about your gambling.
          </p>
          <p className="text-sm text-ink-400 mb-2">
            Call the National Gambling Helpline: <span className="text-white">0808 8020 133</span> 8am to midnight, 7 days a week.
          </p>
          <p className="text-sm font-medium text-white mt-4">
            You must be 18 years old or over to use this site. Please bet responsibly.
          </p>
        </div>
      </div>

      {/* Links and copyright */}
      <div className="container py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">
              <span className="text-brand-400">Tip</span>
              <span className="text-white">Pulse</span>
            </span>
          </div>
          
          <nav className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <Link to="/terms" className="hover:text-white transition-colors">
              Terms & Conditions
            </Link>
            <span className="text-ink-700">|</span>
            <Link to="/about" className="hover:text-white transition-colors">
              About Us
            </Link>
            <span className="text-ink-700">|</span>
            <Link to="/disclaimer" className="hover:text-white transition-colors">
              Disclaimer
            </Link>
            <span className="text-ink-700">|</span>
            <Link to="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
          </nav>
          
          <p className="text-sm text-ink-500">
            © {new Date().getFullYear()} TipPulse
          </p>
        </div>
      </div>
    </footer>
  );
}
