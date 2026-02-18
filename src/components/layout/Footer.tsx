import { Link } from "react-router-dom";
import { Twitter, Send, Instagram, Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-ink-900 text-ink-300 mt-12">
      {/* Responsible gambling section */}
      <div className="border-b border-ink-800">
        <div className="container py-fluid-lg text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="inline-flex items-center justify-center w-10 h-10 bg-ink-800 rounded-full text-white font-bold text-fluid-sm">
              18+
            </span>
            <span className="text-fluid-lg font-semibold text-white">GambleAware</span>
          </div>
          <p className="text-fluid-sm max-w-2xl mx-auto mb-4">
            GambleAware.org aims to promote responsibility in gambling. They provide information to help you make
            informed decisions about your gambling.
          </p>
          <p className="text-fluid-sm text-ink-400 mb-2">
            Call the National Gambling Helpline: <span className="text-white">0808 8020 133</span> 8am to midnight, 7
            days a week.
          </p>
          <p className="text-fluid-sm font-medium text-white mt-4">
            You must be 18 years old or over to use this site. Please bet responsibly.
          </p>

          {/* Divider */}
          <div className="w-24 h-px mx-auto mt-5 mb-4" style={{ backgroundColor: "rgb(100 116 139)" }} />

          {/* Social icons */}
          <div className="flex items-center justify-center gap-4">
            <a
              href="https://www.x.com/TipPulse"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-ink-800 text-ink-400 hover:text-white hover:bg-brand-600 transition-all duration-200"
              aria-label="Twitter"
            >
              <Twitter size={16} />
            </a>
            <a
              href="https://www.Tip_Pulse.t.me"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-ink-800 text-ink-400 hover:text-white hover:bg-brand-600 transition-all duration-200"
              aria-label="Telegram"
            >
              <Send size={16} />
            </a>
            <a
              href="https://www.instagram.com/TipPulse"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-ink-800 text-ink-400 hover:text-white hover:bg-brand-600 transition-all duration-200"
              aria-label="Instagram"
            >
              <Instagram size={16} />
            </a>
            <a
              href="mailto:TipPulse@gmail.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-ink-800 text-ink-400 hover:text-white hover:bg-brand-600 transition-all duration-200"
              aria-label="Email"
            >
              <Mail size={16} />
            </a>
          </div>
        </div>
      </div>

      {/* Links and copyright */}
      <div className="container py-fluid-lg">
        <div className="flex flex-col gap-4 items-center text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-center gap-2">
            <span className="text-fluid-lg font-bold">
              <span className="text-brand-400">Tip</span>
              <span className="text-white">Pulse</span>
            </span>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-fluid-sm">
            <Link to="/terms" className="hover:text-white transition-colors">
              Terms & Conditions
            </Link>
            <span className="text-ink-700 hidden sm:inline">|</span>
            <Link to="/about" className="hover:text-white transition-colors">
              About Us
            </Link>
            <span className="text-ink-700 hidden sm:inline">|</span>
            <Link to="/disclaimer" className="hover:text-white transition-colors">
              Disclaimer
            </Link>
            <span className="text-ink-700 hidden sm:inline">|</span>
            <Link to="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
          </nav>

          <p className="text-fluid-sm text-ink-500">© {new Date().getFullYear()} TipPulse</p>
        </div>
      </div>
    </footer>
  );
}
