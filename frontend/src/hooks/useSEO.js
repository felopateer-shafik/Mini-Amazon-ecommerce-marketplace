import { useEffect } from "react";

/**
 * Dynamically manage <head> meta tags for SEO.
 *
 * @param {Object} opts
 * @param {string} opts.title       – page title (appended with " | SiteName")
 * @param {string} opts.description – meta description
 * @param {string} [opts.canonical] – canonical URL path (e.g. "/products")
 * @param {string} [opts.ogImage]   – Open Graph image URL
 * @param {string} [opts.ogType]    – Open Graph type (default "website")
 * @param {string} [opts.noindex]   – if true, sets robots to "noindex, nofollow"
 */
export function useSEO({
  title,
  description,
  canonical,
  ogImage,
  ogType = "website",
  noindex = false,
} = {}) {
  useEffect(() => {
    if (!title && !description) return;

    const setMeta = (attr, key, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    // Description
    if (description) {
      setMeta("name", "description", description);
      setMeta("property", "og:description", description);
      setMeta("name", "twitter:description", description);
    }

    // Title
    if (title) {
      setMeta("property", "og:title", title);
      setMeta("name", "twitter:title", title);
    }

    // OG type
    setMeta("property", "og:type", ogType);

    // OG image
    if (ogImage) {
      setMeta("property", "og:image", ogImage);
      setMeta("name", "twitter:image", ogImage);
    }

    // Canonical
    if (canonical) {
      let link = document.querySelector("link[rel='canonical']");
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.setAttribute("href", canonical);
    }

    // Robots
    if (noindex) {
      setMeta("name", "robots", "noindex, nofollow");
    } else {
      setMeta("name", "robots", "index, follow");
    }
  }, [title, description, canonical, ogImage, ogType, noindex]);
}
