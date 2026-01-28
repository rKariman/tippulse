import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function NewsletterWidget() {
  const [email, setEmail] = useState("");
  const [isOver18, setIsOver18] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !isOver18) {
      setErrorMessage("Please enter a valid email and confirm you are over 18");
      setStatus("error");
      return;
    }

    setStatus("loading");
    
    try {
      const { error } = await supabase
        .from("subscribers")
        .insert({ email, consent: isOver18, source: "widget" });

      if (error) {
        if (error.code === "23505") {
          setErrorMessage("This email is already subscribed");
        } else {
          setErrorMessage("Something went wrong. Please try again.");
        }
        setStatus("error");
        return;
      }

      setStatus("success");
      setEmail("");
      setIsOver18(false);
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
      setStatus("error");
    }
  };

  return (
    <div className="card-base overflow-hidden">
      <div className="widget-header">
        Sign Up For Our Free Weekly Betting Emails
      </div>
      <div className="p-4">
        {status === "success" ? (
          <div className="text-center py-4">
            <p className="text-success-700 font-medium">Thanks for subscribing!</p>
            <p className="text-sm text-ink-500 mt-1">Check your inbox for the latest tips.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <input
                type="email"
                placeholder="Please enter a valid email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 border border-ink-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                required
              />
            </div>
            
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="over18"
                checked={isOver18}
                onChange={(e) => setIsOver18(e.target.checked)}
                className="mt-1 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
              />
              <label htmlFor="over18" className="text-sm text-ink-600">
                You must be over 18 <span className="text-danger-500">*</span>
              </label>
            </div>

            {status === "error" && (
              <p className="text-sm text-danger-500">{errorMessage}</p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full btn-cta disabled:opacity-50"
            >
              {status === "loading" ? "Signing up..." : "Sign Up"}
            </button>

            <p className="text-xs text-ink-500 text-center">
              By signing up you agree to our{" "}
              <a href="/terms" className="link-brand">terms</a> and{" "}
              <a href="/privacy" className="link-brand">privacy policy</a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
