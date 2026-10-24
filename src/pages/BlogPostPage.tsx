import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User, RefreshCw } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { blogAPI, SiteContent } from '../lib/blogApi';
import { getPrerenderedBlogPost } from '../lib/prerenderedBlogPost';
import NotFoundPage from './NotFoundPage';
import { ROUTES, blogPostPath } from '../lib/routes';

interface BlogPostPageProps {
  siteLogoUrl: string | null;
}

const SITE_ORIGIN = 'https://equitytakeaway.com';

// Normalise internal hrefs to a trailing slash so links inside blog post bodies
// never 301. External links, assets, query strings and hashes are left alone.
function normalizeHref(href: string): string {
  if (!href) return href;
  const url = href.trim();
  const isOrigin = url.startsWith(SITE_ORIGIN);
  const isRoot = url.startsWith('/');
  if (!isOrigin && !isRoot) return href;
  let path = isOrigin ? url.slice(SITE_ORIGIN.length) : url;
  if (path.includes('?') || path.includes('#')) return href;
  if (path === '/') return href;
  if (/\.[a-zA-Z0-9]{1,8}$/.test(path)) return href;
  if (path.endsWith('/')) return href;
  const normalized = path + '/';
  return isOrigin ? SITE_ORIGIN + normalized : normalized;
}

function renderMarkdown(md: string): string {
  if (!md) return '';
  let text = String(md);

  const htmlTokens: string[] = [];
  text = text.replace(/<[^>]+>/g, (m) => {
    const normalised = m.replace(/href="([^"]*)"/g, (_, href: string) => `href="${normalizeHref(href)}"`);
    htmlTokens.push(normalised);
    return `\x00HTML${htmlTokens.length - 1}\x00`;
  });

  text = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, linkText, url: string) => {
    return `<a href="${normalizeHref(url)}">${linkText}</a>`;
  });

  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  text = text.replace(/(^|[^*])\*([^*\n]+)\*(?![*])/g, '$1<em>$2</em>');
  text = text.replace(/(^|[^_])_([^_\n]+)_(?!_)/g, '$1<em>$2</em>');

  text = text.replace(/\x00HTML(\d+)\x00/g, (_, i) => htmlTokens[Number(i)]);

  const lines = text.split('\n');
  const result: string[] = [];
  let inList = false;
  let listType: 'ul' | 'ol' | null = null;
  let inParagraph: string[] = [];

  const flushParagraph = () => {
    if (inParagraph.length > 0) {
      result.push(`<p>${inParagraph.join(' ')}</p>`);
      inParagraph = [];
    }
  };
  const closeList = () => {
    if (inList && listType) {
      result.push(`</${listType}>`);
      inList = false;
      listType = null;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    const hMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (hMatch) {
      flushParagraph();
      closeList();
      const level = hMatch[1].length;
      result.push(`<h${level}>${hMatch[2]}</h${level}>`);
      continue;
    }

    if (/^[-*+]\s+/.test(trimmed)) {
      flushParagraph();
      if (!inList || listType !== 'ul') {
        closeList();
        inList = true;
        listType = 'ul';
        result.push('<ul>');
      }
      result.push(`<li>${trimmed.replace(/^[-*+]\s+/, '')}</li>`);
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      flushParagraph();
      if (!inList || listType !== 'ol') {
        closeList();
        inList = true;
        listType = 'ol';
        result.push('<ol>');
      }
      result.push(`<li>${trimmed.replace(/^\d+\.\s+/, '')}</li>`);
      continue;
    }

    if (trimmed === '') {
      flushParagraph();
      closeList();
      continue;
    }

    closeList();
    inParagraph.push(trimmed);
  }

  flushParagraph();
  closeList();

  return result.join('\n');
}

const BlogPostPage: React.FC<BlogPostPageProps> = ({ siteLogoUrl }) => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<SiteContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const [attemptedRetry, setAttemptedRetry] = useState(false);
  const refreshRef = React.useRef(false);

  // On slug change: try to read embedded prerendered data before any fetch.
  // If embedded data exists and matches the requested slug, render it
  // immediately (no spinner) and refresh from Supabase in the background.
  // If no embedded data (post published after last build, or served from the
  // neutral fallback), fall back to the original loading-then-fetch flow.
  useEffect(() => {
    refreshRef.current = false;
    if (!slug) return;

    if (slug.startsWith('-')) {
      const cleanSlug = slug.replace(/^-+/, '');
      navigate(blogPostPath(cleanSlug), { replace: true });
      return;
    }

    let embedded: Partial<SiteContent> | null = null;
    try {
      embedded = getPrerenderedBlogPost();
    } catch {
      // Corrupt or missing embedded data — fall back to fetch.
    }

    if (embedded && embedded.slug === slug && embedded.is_published) {
      // We have valid embedded data for this slug. Render immediately.
      setPost(embedded as SiteContent);
      setNotFound(false);
      setNetworkError(false);
      setLoading(false);
      // Background refresh: fetch the latest version from Supabase. If it
      // succeeds and the post was updated, swap in the fresh data. If it
      // fails, the embedded content stays — a transient outage does not
      // become a 404 or an error page.
      refreshRef.current = true;
      void refreshPost(slug, embedded as SiteContent);
    } else {
      // No embedded data (or slug mismatch) — use the original fetch flow.
      loadPost(slug, false);
    }
  }, [slug]);

  const refreshPost = async (postSlug: string, currentPost: SiteContent) => {
    try {
      const freshData = await blogAPI.getBlogPostBySlug(postSlug);
      if (freshData && freshData.is_published) {
        // Only update if the fetched version is newer or different.
        if (!currentPost.updated_at || !freshData.updated_at || freshData.updated_at > currentPost.updated_at) {
          setPost(freshData);
        }
      }
      // If Supabase says the post doesn't exist or isn't published, keep
      // showing the embedded version — it was published at prerender time
      // and a Supabase discrepancy should not blank the page.
    } catch {
      // Network error during refresh — silently keep the embedded content.
    }
  };

  const loadPost = async (postSlug: string, isRetry: boolean) => {
    setLoading(true);
    setNotFound(false);
    setNetworkError(false);
    if (isRetry) setAttemptedRetry(true);
    try {
      const postData = await blogAPI.getBlogPostBySlug(postSlug);
      if (postData && postData.is_published) {
        setPost(postData);
      } else {
        setNotFound(true);
      }
    } catch (error) {
      console.error('Error loading blog post:', error);
      setNetworkError(true);
      if (!isRetry) {
        setAttemptedRetry(true);
        void loadPost(postSlug, true);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not published';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading) {
    // Do NOT render a Helmet here. Rendering one would let react-helmet-async
    // overwrite the valid prerendered <title>, canonical, and robots tags with
    // a transient loading title, which can leak to crawlers. By rendering no
    // Helmet, the prerendered metadata stays intact until the real post loads.
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading post...</p>
        </div>
      </div>
    );
  }

  if (networkError && !loading) {
    // Temporary network/database error — the post may well exist. Do NOT set
    // noindex and do NOT render a Helmet that would overwrite the valid
    // prerendered canonical and robots tags. A transient outage must not turn
    // a real, indexable post into a noindexed page. Only a confirmed
    // not-found result (handled below) renders the noindex NotFoundPage.
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-2xl font-bold text-slate-900 mb-3">Couldn't load this post</h1>
          <p className="text-slate-600 mb-6">We couldn't reach the server to load this article. Your connection may be interrupted.</p>
          <button
            onClick={() => slug && loadPost(slug, true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors"
          >
            <RefreshCw size={16} />
            Retry
          </button>
          <p className="mt-6">
            <Link to={ROUTES.blog} className="text-slate-500 hover:text-slate-800 underline">Back to blog</Link>
          </p>
        </div>
      </div>
    );
  }

  if (notFound || !post) {
    return <NotFoundPage siteLogoUrl={siteLogoUrl} />;
  }

  const canonicalUrl = `https://equitytakeaway.com/blog/${post.slug}/`;

  const metaDescription = post.meta_description || post.excerpt || `${post.title} — read on EquityTake.`;

  return (
    <div className="min-h-screen bg-slate-50">
      <Helmet>
        <title>{post.title} | EquityTake</title>
        <meta name="description" content={metaDescription} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={canonicalUrl} />

        {/* Open Graph tags for social sharing */}
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="article" />
        {post.featured_image_url && (
          <meta property="og:image" content={post.featured_image_url} />
        )}

        {/* Twitter Card tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={metaDescription} />
        {post.featured_image_url && (
          <meta name="twitter:image" content={post.featured_image_url} />
        )}

        {/* Structured data for search engines */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": post.title,
            "description": metaDescription,
            "image": post.featured_image_url,
            "datePublished": post.published_at,
            "dateModified": post.updated_at,
            "author": {
              "@type": "Organization",
              "name": "EquityTake"
            },
            "publisher": {
              "@type": "Organization",
              "name": "EquityTake"
            }
          })}
        </script>
      </Helmet>

      <header className="bg-white border-b border-slate-200 py-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 flex items-center gap-4">
          <Link
            to={ROUTES.blog}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Back to Blog</span>
          </Link>
          {siteLogoUrl && (
            <Link to={ROUTES.home} className="ml-auto">
              <img
                src={siteLogoUrl}
                alt="EquityTake Logo"
                className="h-12 object-contain"
              />
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <article className="bg-white rounded-xl shadow-sm p-8">
          {post.featured_image_url && (
            <img
              src={post.featured_image_url}
              alt={post.title}
              className="w-full h-96 object-cover rounded-lg mb-8"
            />
          )}

          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            {post.title}
          </h1>

          <div className="flex items-center gap-6 text-sm text-slate-600 mb-8 pb-6 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Calendar size={16} />
              <span>{formatDate(post.published_at)}</span>
            </div>
            <div className="flex items-center gap-2">
              <User size={16} />
              <span>EquityTake Team</span>
            </div>
          </div>

          <div className="prose prose-slate max-w-none">
            <div
              dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content_body) }}
              className="text-slate-700 leading-relaxed [&_a]:text-blue-600 [&_a]:underline [&_a:hover]:text-blue-800 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-5 [&_h2]:mb-3 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-4 [&_li]:mb-2 [&_strong]:font-semibold"
            />
          </div>
        </article>
      </main>
    </div>
  );
};

export default BlogPostPage;
