import { useEffect } from "react";

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  ogType?: string;
  noindex?: boolean;
}

const SITE_NAME = "TipPulse";
const BASE_URL = "https://tippulse.com";

export function SEO({ title, description, canonical, ogType = "website", noindex = false }: SEOProps) {
  useEffect(() => {
    // Title
    const fullTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`;
    document.title = fullTitle;

    // Meta helpers
    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    // Description
    setMeta("name", "description", description);

    // Robots
    setMeta("name", "robots", noindex ? "noindex, nofollow" : "index, follow");

    // Open Graph
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", description);
    setMeta("property", "og:type", ogType);
    setMeta("property", "og:site_name", SITE_NAME);

    // Twitter
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", description);

    // Canonical
    const canonicalUrl = canonical ? `${BASE_URL}${canonical}` : undefined;
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (canonicalUrl) {
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.setAttribute("href", canonicalUrl);
    } else if (link) {
      link.remove();
    }

    setMeta("property", "og:url", canonicalUrl || BASE_URL);
  }, [title, description, canonical, ogType, noindex]);

  return null;
}
