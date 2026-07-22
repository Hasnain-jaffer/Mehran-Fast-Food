/**
 * Sets the document title and meta description for the current page.
 *
 * WHY not react-helmet-async: this is a single-page app with a handful of
 * routes and no server-side rendering — a full head-management library is
 * more dependency than this needs. A tiny effect hook gives every page a
 * distinct, accurate <title> (bookmarks, browser tabs, search engine
 * result snippets) and description without adding a new package.
 *
 * Note: since this is a client-rendered SPA (no SSR), search engines that
 * don't execute JavaScript will still only see index.html's default
 * title/description. For full SEO benefit (rich search snippets per
 * page), a future move to a framework with SSR/static generation (e.g.
 * Next.js) would be the real fix — flagged here rather than overclaiming
 * what a client-only title change achieves.
 */
import { useEffect } from 'react';

const SITE_NAME = 'Mehran Fast Food';

export function useDocumentTitle(title, description, options = {}) {
  const { noIndex = false } = options;

  useEffect(() => {
    const previousTitle = document.title;
    document.title = title ? `${title} | ${SITE_NAME}` : SITE_NAME;

    let metaDescription = document.querySelector('meta[name="description"]');
    let previousDescription = metaDescription?.getAttribute('content');
    if (description) {
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.setAttribute('name', 'description');
        document.head.appendChild(metaDescription);
      }
      metaDescription.setAttribute('content', description);
    }

    // Admin/staff pages have no business being indexed by search engines
    // or showing up in results — they're not public content.
    let metaRobots = document.querySelector('meta[name="robots"]');
    const previousRobots = metaRobots?.getAttribute('content');
    if (noIndex && metaRobots) {
      metaRobots.setAttribute('content', 'noindex, nofollow');
    }

    return () => {
      document.title = previousTitle;
      if (metaDescription && previousDescription !== undefined) {
        metaDescription.setAttribute('content', previousDescription);
      }
      if (noIndex && metaRobots && previousRobots !== undefined) {
        metaRobots.setAttribute('content', previousRobots);
      }
    };
  }, [title, description, noIndex]);
}
