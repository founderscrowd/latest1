import type { SiteContent } from './blogApi';

let cached: Partial<SiteContent> | null = null;
let parsed = false;

export function getPrerenderedBlogPost(): Partial<SiteContent> | null {
  if (parsed) return cached;
  parsed = true;
  try {
    const el = document.getElementById('prerendered-blog-post');
    if (el && el.textContent) {
      cached = JSON.parse(el.textContent) as Partial<SiteContent>;
    }
  } catch {
    cached = null;
  }
  return cached;
}

export function clearPrerenderedBlogPost(): void {
  cached = null;
  parsed = false;
}
