/**
 * Build-time prerender script.
 * Generates unique HTML files under dist/ for every public route and
 * every published blog post, so crawlers see real content in View Source
 * without needing JavaScript. The React SPA still hydrates and takes over
 * after load.
 *
 * SEO guarantees:
 *  - <meta charset="utf-8"> is the first element in <head>.
 *  - Every internal href uses a trailing slash (matches hosting 301s).
 *  - Canonical and og:url are absolute https URLs with trailing slash.
 *  - Per-blog-post og:image / twitter:image from the post's featured image.
 *  - Blog post bodies are never truncated — full markdown rendered.
 *  - Blog fetch errors fail the build loudly (with retry); a genuinely
 *    missing slug is the only case that writes a 404/noindex page.
 *  - Homepage raw HTML includes crawlable <a href> links to all key pages,
 *    plus a visible header nav and footer.
 *
 * Usage: node scripts/prerender.mjs
 * Must run AFTER `vite build` so dist/ exists.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';

// Load env from .env file (Vite env vars aren't in process.env for Node scripts)
const envPath = join(process.cwd(), '.env');
let envSupabaseUrl = '';
let envSupabaseKey = '';
try {
  const envContent = readFileSync(envPath, 'utf8');
  const urlMatch = envContent.match(/^VITE_SUPABASE_URL=(.+)$/m);
  const keyMatch = envContent.match(/^VITE_SUPABASE_ANON_KEY=(.+)$/m);
  if (urlMatch) envSupabaseUrl = urlMatch[1].trim();
  if (keyMatch) envSupabaseKey = keyMatch[1].trim();
} catch {
  // .env might not exist in some environments
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || envSupabaseUrl || 'https://jdpugmeoocezzxqegmsu.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || envSupabaseKey || '';
const SITE_ORIGIN = 'https://equitytakeaway.com';
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/social-share-default.jpg`;
const TODAY = new Date().toISOString().slice(0, 10);

// ---------- HTML escaping helpers ----------
function esc(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text, maxLen) {
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1).trim() + '…';
}

// Normalise a path to a trailing-slash absolute site URL.
// Homepage stays "/" (no double slash).
function canonicalUrl(path) {
  let p = path || '/';
  if (p !== '/' && !p.endsWith('/')) p += '/';
  return `${SITE_ORIGIN}${p}`;
}

// Absolute-ise an image URL. Storage URLs may already be absolute; relative
// paths are joined to the site origin.
function absoluteImageUrl(src) {
  if (!src) return '';
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith('/')) return `${SITE_ORIGIN}${src}`;
  return `${SITE_ORIGIN}/${src}`;
}

// ---------- Build the static <head> + <body> for a route ----------
// Set omitCanonical = true to skip the <link rel="canonical"> tag (used by the
// neutral blog fallback, which must not claim a canonical URL before the
// article's existence is confirmed by React). Set omitRobots = true to skip
// the <meta name="robots"> tag for the same reason.
function buildHtml({
  path,
  title,
  description,
  h1,
  bodyHtml,
  canonical,
  ogType = 'website',
  robots = 'index, follow',
  ogImage = DEFAULT_OG_IMAGE,
  ogImageAlt = '',
  omitCanonical = false,
  omitRobots = false,
  omitOgUrl = false,
  headExtra = '',
}) {
  const url = canonicalUrl(path);
  const canon = canonical ? canonicalUrl(canonical) : url;
  const img = absoluteImageUrl(ogImage) || DEFAULT_OG_IMAGE;

  const robotsTag = omitRobots ? '' : `<meta name="robots" data-rh="true" content="${esc(robots)}" />`;
  const canonicalTag = omitCanonical ? '' : `<link rel="canonical" data-rh="true" href="${esc(canon)}" />`;
  const ogUrlTag = omitOgUrl ? '' : `<meta property="og:url" data-rh="true" content="${esc(url)}" />`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title data-rh="true">${esc(title)}</title>
    <meta name="description" data-rh="true" content="${esc(description)}" />
    ${robotsTag}
    ${canonicalTag}
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="apple-touch-icon" href="/favicon.svg" />
    <meta name="theme-color" content="#0a1e2e" />

    <!-- Open Graph / Social sharing -->
    <meta property="og:title" data-rh="true" content="${esc(title)}" />
    <meta property="og:description" data-rh="true" content="${esc(description)}" />
    ${ogUrlTag}
    <meta property="og:type" data-rh="true" content="${esc(ogType)}" />
    <meta property="og:site_name" content="EquityTake" />
    <meta property="og:image" data-rh="true" content="${esc(img)}" />
    ${ogImageAlt ? `<meta property="og:image:alt" data-rh="true" content="${esc(ogImageAlt)}" />` : ''}
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />

    <!-- Twitter Card -->
    <meta name="twitter:card" data-rh="true" content="summary_large_image" />
    <meta name="twitter:title" data-rh="true" content="${esc(title)}" />
    <meta name="twitter:description" data-rh="true" content="${esc(description)}" />
    <meta name="twitter:image" data-rh="true" content="${esc(img)}" />

    <!-- Prerendered blog post data (outside #root so React doesn't replace it) -->
    ${headExtra}

    <!-- Google Consent Mode v2: default consent state must be set BEFORE any
         Google tags load. All optional categories default to denied until the
         visitor grants permission via the cookie banner. This snippet only
         initialises dataLayer + gtag and pushes the consent default; it does
         NOT load the gtag.js library script (that remains consent-gated and is
         loaded by the React app via ensureGoogleTagLoaded). -->
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){window.dataLayer.push(arguments);}
      window.gtag = gtag;
      gtag('consent', 'default', {
        'analytics_storage': 'denied',
        'ad_storage': 'denied',
        'ad_user_data': 'denied',
        'ad_personalization': 'denied',
        'wait_for_update': 500
      });
      try {
        var stored = localStorage.getItem('cookieConsent');
        if (stored) {
          var parsed = JSON.parse(stored);
          if (parsed && parsed.version === 'v1') {
            gtag('consent', 'update', {
              'analytics_storage': parsed.analytics === true ? 'granted' : 'denied',
              'ad_storage': parsed.marketing === true ? 'granted' : 'denied',
              'ad_user_data': parsed.marketing === true ? 'granted' : 'denied',
              'ad_personalization': parsed.marketing === true ? 'granted' : 'denied'
            });
          }
        }
      } catch (e) { /* storage unavailable */ }
    </script>

    <script type="module" crossorigin src="/assets/index-6dIil5pz.js"></script>
    <link rel="stylesheet" href="/assets/index-B5vig-LC.css" />
  </head>
  <body>
    <div id="root">${bodyHtml}</div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
}

// ---------- Supabase fetch with retry and hard failure ----------
async function fetchJsonWithRetry(url, label, attempts = 3) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(15000),
      });
      if (res.status === 404) return { status: 404, data: null };
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        lastErr = new Error(`${label} fetch returned ${res.status}: ${body.slice(0, 200)}`);
        console.warn(`   ${label} fetch attempt ${i}/${attempts} failed: ${lastErr.message}`);
        continue;
      }
      const data = await res.json();
      return { status: 200, data };
    } catch (e) {
      lastErr = e;
      console.warn(`   ${label} fetch attempt ${i}/${attempts} error: ${e.message}`);
    }
  }
  throw lastErr || new Error(`${label} fetch failed`);
}

async function fetchPublishedBlogPosts() {
  const url = `${SUPABASE_URL}/rest/v1/site_content?content_type=eq.blog_post&is_published=eq.true&order=published_at.desc`;
  const { status, data } = await fetchJsonWithRetry(url, 'Blog posts');
  if (status !== 200) return [];
  return Array.isArray(data) ? data : [];
}

async function fetchPublicGroups() {
  // Fetch all public, active, non-deleted groups so every one gets its own
  // prerendered page. limit=500 is well above expected group count; if the
  // project ever exceeds it, raise the limit or add pagination.
  const url = `${SUPABASE_URL}/rest/v1/groups?is_public=eq.true&status=eq.active&deleted_at=is.null&order=created_at.desc&limit=500`;
  const { status, data } = await fetchJsonWithRetry(url, 'Groups');
  if (status !== 200) return [];
  return Array.isArray(data) ? data : [];
}

// Fetch a single blog post by slug. Throws on network error (so the build
// fails loudly). Returns null only when Supabase confirms the slug doesn't
// exist (404 or empty result).
async function fetchBlogPostBySlug(slug) {
  const url = `${SUPABASE_URL}/rest/v1/site_content?content_type=eq.blog_post&is_published=eq.true&slug=eq.${encodeURIComponent(slug)}`;
  const { status, data } = await fetchJsonWithRetry(url, `Blog post "${slug}"`);
  if (status === 404) return null;
  if (!Array.isArray(data) || data.length === 0) return null;
  return data[0];
}

// ---------- Shared header + footer (crawlable <a href> links) ----------
// Rendered into every prerendered page so crawlers see the same nav/footer
// the hydrated React app shows. All hrefs use trailing slashes.
function headerHtml() {
  return `<header style="background:#fff;border-bottom:1px solid #e2e8f0;padding:12px 0;position:sticky;top:0;z-index:50;">
  <nav style="max-width:1152px;margin:0 auto;padding:0 16px;display:flex;justify-content:space-between;align-items:center;gap:8px;">
    <a href="/" style="font-size:1.25rem;font-weight:700;color:#0f172a;text-decoration:none;">EquityTake</a>
    <div style="display:flex;gap:8px;align-items:center;">
      <a href="/" style="padding:8px 12px;border-radius:8px;font-size:0.75rem;font-weight:600;color:#475569;text-decoration:none;">Home</a>
      <a href="/startup-groups/" style="padding:8px 12px;border-radius:8px;font-size:0.75rem;font-weight:600;color:#475569;text-decoration:none;">Startup groups</a>
      <a href="/cofounder-matching/" style="padding:8px 12px;border-radius:8px;font-size:0.75rem;font-weight:600;color:#475569;text-decoration:none;">Co-founder matching</a>
      <a href="/find-a-cofounder/" style="padding:8px 12px;border-radius:8px;font-size:0.75rem;font-weight:600;color:#475569;text-decoration:none;">Find a co-founder</a>
      <a href="/how-it-works/" style="padding:8px 12px;border-radius:8px;font-size:0.75rem;font-weight:600;color:#475569;text-decoration:none;">How it works</a>
      <a href="/blog/" style="padding:8px 12px;border-radius:8px;font-size:0.75rem;font-weight:600;color:#475569;text-decoration:none;">Blog</a>
      <a href="/about/" style="padding:8px 12px;border-radius:8px;font-size:0.75rem;font-weight:600;color:#475569;text-decoration:none;">About</a>
    </div>
  </nav>
</header>`;
}

function footerHtml() {
  return `<footer style="background:#0f172a;color:#fff;padding:48px 16px;">
  <div style="max-width:1152px;margin:0 auto;display:grid;grid-template-columns:repeat(4,1fr);gap:32px;">
    <div>
      <a href="/" style="font-size:1.25rem;font-weight:700;color:#fff;text-decoration:none;">EquityTake</a>
      <p style="color:#cbd5e1;font-size:0.875rem;line-height:1.6;margin:12px 0;">EquityTake is a startup group and co-founder matching platform. Create a group around your idea, find potential co-founders, and discuss proposed equity allocations within the group.</p>
    </div>
    <div>
      <h4 style="font-weight:600;color:#fff;margin:0 0 16px;">Platform</h4>
      <ul style="list-style:none;padding:0;margin:0;font-size:0.875rem;line-height:2;">
        <li><a href="/" style="color:#cbd5e1;text-decoration:none;">Home</a></li>
        <li><a href="/startup-groups/" style="color:#cbd5e1;text-decoration:none;">Startup groups</a></li>
        <li><a href="/communities-and-cooperatives/" style="color:#cbd5e1;text-decoration:none;">Communities &amp; cooperatives</a></li>
        <li><a href="/create-startup-group/" style="color:#cbd5e1;text-decoration:none;">Create a startup group</a></li>
        <li><a href="/cofounder-matching/" style="color:#cbd5e1;text-decoration:none;">Co-founder matching</a></li>
        <li><a href="/groups/" style="color:#cbd5e1;text-decoration:none;">Browse groups</a></li>
        <li><a href="/how-it-works/" style="color:#cbd5e1;text-decoration:none;">How it works</a></li>
      </ul>
    </div>
    <div>
      <h4 style="font-weight:600;color:#fff;margin:0 0 16px;">Resources</h4>
      <ul style="list-style:none;padding:0;margin:0;font-size:0.875rem;line-height:2;">
        <li><a href="/equity-for-cofounders/" style="color:#cbd5e1;text-decoration:none;">Equity for co-founders</a></li>
        <li><a href="/startup-equity-split/" style="color:#cbd5e1;text-decoration:none;">Startup equity split</a></li>
        <li><a href="/startup-team-building/" style="color:#cbd5e1;text-decoration:none;">Startup team building</a></li>
        <li><a href="/find-a-cofounder/" style="color:#cbd5e1;text-decoration:none;">Find a co-founder</a></li>
        <li><a href="/blog/" style="color:#cbd5e1;text-decoration:none;">Blog</a></li>
        <li><a href="/about/" style="color:#cbd5e1;text-decoration:none;">About</a></li>
      </ul>
    </div>
    <div>
      <h4 style="font-weight:600;color:#fff;margin:0 0 16px;">Legal</h4>
      <ul style="list-style:none;padding:0;margin:0;font-size:0.875rem;line-height:2;">
        <li><a href="/privacy/" style="color:#cbd5e1;text-decoration:none;">Privacy Policy</a></li>
        <li><a href="/terms/" style="color:#cbd5e1;text-decoration:none;">Terms of Service</a></li>
        <li><a href="/cookies/" style="color:#cbd5e1;text-decoration:none;">Cookie Policy</a></li>
      </ul>
    </div>
  </div>
  <div style="border-top:1px solid #334155;margin-top:32px;padding-top:24px;text-align:center;color:#94a3b8;font-size:0.875rem;">&copy; EquityTake</div>
</footer>`;
}

// Wrap body content with the shared header + footer so every prerendered page
// has crawlable nav links in raw HTML.
function withShell(bodyContent) {
  return `${headerHtml()}${bodyContent}${footerHtml()}`;
}

// ---------- Content generators for each route ----------
function link(href, text) {
  return `<a href="${esc(href)}" style="color:#ea580c;">${esc(text)}</a>`;
}

function pageShell(h1, bodyContent, linksHtml = '') {
  return withShell(`<main style="font-family:system-ui,-apple-system,sans-serif;color:#1e293b;max-width:800px;margin:0 auto;padding:20px;">
  <h1 style="font-size:2rem;font-weight:700;margin:0 0 16px;">${esc(h1)}</h1>
  ${bodyContent}
  ${linksHtml}
</main>`);
}

function relatedReadingHtml(links) {
  if (!links || links.length === 0) return '';
  const items = links.map((l) =>
    `<a href="${esc(l.href)}" style="color:#ea580c;font-size:0.95rem;">${esc(l.text)}</a>`
  ).join('<br>');
  return `<div style="border-top:1px solid #e2e8f0;padding-top:16px;margin-top:24px;">
    <p style="font-size:0.85rem;color:#94a3b8;font-weight:600;margin:0 0 8px;">Related reading</p>
    ${items}
  </div>`;
}

function marketingShell(h1, subtitle, extraBody = '') {
  const body = `
  <p style="font-size:1.1rem;line-height:1.6;color:#475569;margin:0 0 20px;">${esc(subtitle)}</p>
  <p style="margin:0 0 24px;">
    <a href="/create-startup-group/" style="display:inline-block;padding:12px 24px;background:#ea580c;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;margin-right:12px;">Create a startup group</a>
    <a href="/groups/" style="display:inline-block;padding:12px 24px;border:1px solid #cbd5e1;color:#1e293b;text-decoration:none;border-radius:8px;font-weight:600;">Browse groups</a>
  </p>
  <p style="font-size:0.9rem;color:#94a3b8;font-weight:500;margin:0 0 40px;">Free to use. Sign up to join or create a group. EquityTake is not a stock exchange and does not issue shares.</p>
  ${extraBody}
  <p style="font-size:0.85rem;color:#94a3b8;margin:24px 0;">Numbers and percentages on a group are proposals for discussion. EquityTake does not issue shares, collect investment, or incorporate companies. If anyone asks for funds, shares, or formal incorporation, get independent legal advice first.</p>`;
  const links = `<p style="margin:24px 0;">
    ${link('/startup-groups/', 'Startup groups')} | ${link('/create-startup-group/', 'Create a startup group')} | ${link('/cofounder-matching/', 'Co-founder matching')} | ${link('/groups/', 'Browse groups')} | ${link('/equity-for-cofounders/', 'Equity for co-founders')} | ${link('/startup-equity-split/', 'Startup equity split')} | ${link('/startup-team-building/', 'Startup team building')} | ${link('/how-it-works/', 'How it works')}
  </p>`;
  return pageShell(h1, body, links);
}

const routes = {
  '/': {
    title: 'Find Co-Founders & Startup Groups | EquityTake',
    description: 'Browse or create a startup group around an idea or project. Match co-founders inside the group and discuss proposed equity before you incorporate. Free to use.',
    h1: 'Find co-founders and build startup groups',
    bodyHtml: null, // built dynamically by buildHomepage()
  },
  '/groups': {
    title: 'Browse Startup Groups – EquityTake',
    description: 'Browse startup groups on EquityTake. Each group is one idea and one team conversation — create a group, match co-founders, and discuss proposed equity inside the group.',
    h1: 'Browse startup groups',
    bodyHtml: null, // generated dynamically with group data
  },
  '/startup-groups': {
    title: 'Startup Groups – EquityTake',
    description: 'Startup groups on EquityTake give each idea its own group, chat, and proposed equity discussion. Browse groups, match co-founders, and talk through equity before incorporating.',
    h1: 'Startup groups',
    bodyHtml: marketingShell(
      'Startup groups',
      'A group is one idea and one team conversation. You create a group, invite or match people, and talk about roles and proposed equity inside that group. Each group has its own chat, its own members, and its own proposed equity numbers. The numbers are there to start a discussion — they are not a signed cap table.',
      `<p style="color:#475569;line-height:1.7;margin:0 0 20px;"><a href="/groups/" style="color:#ea580c;">Browse all groups →</a></p>${relatedReadingHtml([
        { href: '/blog/startup-groups-that-actually-help-you-build/', text: 'What useful startup groups look like →' },
        { href: '/blog/how-to-join-a-startup-group-without-wasting-months/', text: 'Join playbook so you don\u2019t waste months →' },
      ])}`
    ),
  },
  '/create-startup-group': {
    title: 'Create a startup group around your idea | EquityTake',
    description: 'Start or join a startup group built on one idea or project. Match co-founders inside the group and discuss proposed equity before you incorporate. Free to use.',
    h1: 'Create a startup group around your idea',
    bodyHtml: marketingShell(
      'Create a startup group around your idea',
      'Gather founders around a project — then match as co-founders and talk through proposed equity splits inside the group. Creating a group is not creating a company. It is the first step in finding people who want to build the same idea as you. Name the idea, describe the problem, say which co-founders you need, and propose a starting equity split for the group to discuss. Once your group exists, people can find it, join it, and start talking with you in group chat.',
      `<p style="font-size:0.9rem;color:#94a3b8;font-weight:500;margin:16px 0 0 0;">Not profile dating. Not a hobby meetup.</p>${relatedReadingHtml([
        { href: '/blog/create-a-startup-group-around-your-idea/', text: 'Step-by-step: create a startup group around your idea →' },
        { href: '/blog/how-to-start-owning-a-business-from-scratch/', text: 'How to start owning a business from scratch →' },
      ])}`
    ),
  },
  '/cofounder-matching': {
    title: 'Co-Founder Matching – EquityTake',
    description: 'Co-founder matching on EquityTake happens through groups. Join or start a group around an idea and see who wants to build that idea with you.',
    h1: 'Co-founder matching',
    bodyHtml: marketingShell(
      'Co-founder matching',
      'Matching happens through groups. You do not swipe in the abstract. You join or start a group around an idea and see who wants to build that idea with you. This means every match starts with shared context — the same idea, the same group chat, the same proposed equity discussion. You are not matching with a profile picture alone. You are matching with people who chose the same problem.'
    ),
  },
  '/find-a-cofounder': {
    title: 'Find a Co-Founder – EquityTake',
    description: 'Find a co-founder on EquityTake. Browse groups, join one that fits, talk in group chat, see whether skills and working style match, then discuss proposed equity.',
    h1: 'Find a co-founder',
    bodyHtml: marketingShell(
      'Find a co-founder',
      'Browse groups, join one that fits, talk in group chat, see whether skills and working style match, then discuss proposed equity. Here is how: Browse groups — look at the ideas people are building. Join one that fits — pick a group whose idea you want to help build. Talk in group chat — see whether you actually want to work together. See whether skills and working style match — before committing to anything. Discuss proposed equity — talk through allocations, roles, and contributions inside the group.'
    ),
  },
  '/equity-for-cofounders': {
    title: 'Equity for Co-Founders – EquityTake',
    description: 'Equity for co-founders on EquityTake is about discussing proposed equity inside a group. It is not a stock exchange and not a law firm.',
    h1: 'Equity for co-founders',
    bodyHtml: marketingShell(
      'Equity for co-founders',
      'This product is for discussing proposed co-founder equity inside a group. It is not a stock exchange and not a law firm. When you see equity percentages on a group, they are starting points for a conversation. The group talks through who is doing what, when they joined, and what they are putting in — then decides together what feels fair.',
      relatedReadingHtml([
        { href: '/blog/how-to-split-startup-equity-fairly/', text: 'Practical guide to splitting equity fairly →' },
      ])
    ),
  },
  '/startup-equity-split': {
    title: 'Startup Equity Split – EquityTake',
    description: 'Talk through startup equity splits on EquityTake. Discuss who is doing what, when they joined, and what they are contributing. Everything is a discussion proposal, not a final cap table.',
    h1: 'Startup equity split',
    bodyHtml: marketingShell(
      'Startup equity split',
      'A startup equity split is one of the hardest early conversations. EquityTake gives your group a place to have it — out in the open, with the people who are actually going to build the thing. Talk about: who is doing what (roles, responsibilities, time commitment), when they joined (early members often carry more risk), what they are putting in (skills, capital, network, or sweat equity), and what happens if someone leaves (vesting and cliff concepts to discuss). Everything on EquityTake is labelled as a discussion proposal, not a final cap table. No tax, securities, or legal advice. If you are formalising a split, get independent legal advice first.',
      relatedReadingHtml([
        { href: '/blog/how-to-split-startup-equity-fairly/', text: 'Practical guide to splitting equity fairly →' },
      ])
    ),
  },
  '/startup-team-building': {
    title: 'Startup Team Building – EquityTake',
    description: 'Build a startup team on EquityTake. Start or join a group, meet people around one idea, agree roles, talk in chat, discuss equity, then take legal steps outside EquityTake if the team is real.',
    h1: 'Startup team building',
    bodyHtml: marketingShell(
      'Startup team building',
      'Team building on EquityTake means: start or join a group, meet people around one idea, agree roles, talk in chat, discuss equity, then take legal and company steps outside EquityTake if the team is real. EquityTake is where the team comes together and the conversation starts. Formal incorporation, share issuance, and contracts happen off-platform, with professional advice.'
    ),
  },
  '/communities-and-cooperatives': {
    title: 'Communities and Cooperatives – EquityTake',
    description: 'The same group format on EquityTake works for communities, cooperatives, and non-profit projects. Create a group, invite people, and discuss how the group should work.',
    h1: 'Communities and cooperatives',
    bodyHtml: marketingShell(
      'Communities and cooperatives',
      'The same group format also works if you are starting a community, a cooperative, or a non-profit project: someone begins with an idea, creates a group, invites people, and discusses how the group should work — including whether it is for-profit, non-profit, or a cooperative. The group can say it wants to be a business, a community project, or a cooperative. That label is a proposal for the group to discuss. EquityTake does not register charities, cooperatives, or companies. No money or assets are collected here. Creating a group is not incorporation and not charity registration.'
    ),
  },
  '/how-it-works': {
    title: 'How EquityTake Works | Idea to Team to Startup',
    description: 'See how EquityTake turns an idea into a founding team: create a group, discuss contributions, and propose equity using Proposed Company Value and Reference Value. Free to use.',
    h1: 'How EquityTake Works',
    bodyHtml: pageShell(
      'How EquityTake Works',
      `<p style="font-size:1.1rem;line-height:1.6;color:#475569;margin:0 0 20px;">From Idea to Team to Startup. Great businesses often start with an idea. An idea still needs the right people around it before it becomes something real.</p>
  <p style="font-weight:600;color:#1e293b;margin:0 0 20px;">Idea &rarr; Group &rarr; Contributions &rarr; Proposed Equity &rarr; Team &rarr; Startup</p>
  <p style="margin:0 0 24px;">
    <a href="/create-startup-group/" style="display:inline-block;padding:12px 24px;background:#ea580c;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;margin-right:12px;">Create a group</a>
    <a href="/groups/" style="display:inline-block;padding:12px 24px;border:1px solid #cbd5e1;color:#1e293b;text-decoration:none;border-radius:8px;font-weight:600;">Browse startup groups</a>
  </p>

  <h2 style="font-size:1.5rem;font-weight:700;margin:0 0 12px;">1. Start With an Idea</h2>
  <p style="color:#475569;line-height:1.7;margin:0 0 16px;">Have an idea for a business, project or startup? Create a group and explain what you want to build. It does not need to be fully developed. The group is where interested people explore the opportunity, ask questions and help shape it.</p>
  <p style="color:#475569;line-height:1.7;margin:0 0 8px;">When you create a group, you can set:</p>
  <ul style="color:#475569;line-height:1.7;padding-left:20px;margin:0 0 16px;">
    <li>what the business or project is about</li>
    <li>the type of people you are looking for</li>
    <li>the maximum number of co-founders</li>
    <li>the <strong>Proposed Company Value</strong></li>
    <li>how much equity is available</li>
    <li>whether the business is pre-incorporation or already incorporated</li>
  </ul>
  <p style="color:#475569;line-height:1.7;margin:0 0 16px;"><strong>Proposed Company Value</strong> is the value the group creator assigns to 100% of the business. It is a shared reference for discussing proposed equity. It is not an independent or professional valuation. Example: Proposed Company Value of $100,000. A proposed 5% equity allocation has a <strong>$5,000 Reference Value</strong>.</p>
  <p style="color:#475569;line-height:1.7;margin:0 0 40px;">Step-by-step: <a href="/blog/create-a-startup-group-around-your-idea/" style="color:#ea580c;">create a startup group around your idea</a>.</p>

  <h2 style="font-size:1.5rem;font-weight:700;margin:0 0 12px;">2. Build a Group Around the Idea</h2>
  <p style="color:#475569;line-height:1.7;margin:0 0 16px;">Once the group is published, other people can discover it and learn what you are trying to build. EquityTake brings people together <strong>around the idea</strong>, not by matching profiles. Potential co-founders can explore the opportunity, join the discussion and decide whether their experience, skills, resources or capital fit.</p>
  <p style="color:#475569;line-height:1.7;margin:0 0 40px;">
    <a href="/blog/startup-groups-that-actually-help-you-build/" style="color:#ea580c;">What useful startup groups look like</a> &middot;
    <a href="/blog/how-to-join-a-startup-group-without-wasting-months/" style="color:#ea580c;">How to join without wasting months</a>
  </p>

  <h2 style="font-size:1.5rem;font-weight:700;margin:0 0 12px;">3. Decide What You Can Contribute</h2>
  <p style="color:#475569;line-height:1.7;margin:0 0 16px;"><strong>Cash</strong> is money someone is prepared to put toward building the business. <strong>Skills / Tasks</strong> is work, expertise, time or specific responsibilities they are prepared to take on. A group might include the person with the original idea, a developer who can build the product, a marketer who can acquire customers, and someone prepared to contribute capital.</p>

  <h2 style="font-size:1.5rem;font-weight:700;margin:0 0 12px;">4. Apply for Equity</h2>
  <p style="color:#475569;line-height:1.7;margin:0 0 16px;">If someone wants to join, they can submit an equity application showing: the percentage of equity requested, whether the contribution is Cash or Skills / Tasks, what the person proposes to contribute, and the corresponding <strong>Reference Value</strong>.</p>
  <p style="color:#475569;line-height:1.7;margin:0 0 16px;"><strong>Reference Value = Proposed Company Value &times; equity percentage.</strong> Example: Proposed Company Value $20,000, proposed equity 5%, Reference Value $1,000. If the contribution is Skills / Tasks, it does <strong>not</strong> mean that cash was invested.</p>
  <p style="color:#475569;line-height:1.7;margin:0 0 40px;">More on the conversation: <a href="/blog/how-to-split-startup-equity-fairly/" style="color:#ea580c;">how to split startup equity fairly</a>.</p>

  <h2 style="font-size:1.5rem;font-weight:700;margin:0 0 12px;">5. Review, Discuss and Agree</h2>
  <p style="color:#475569;line-height:1.7;margin:0 0 40px;">An equity application is not accepted automatically. Applications stay <strong>Pending</strong> while the group administrator and members consider them. If the application is approved, that proposed equity is allocated to the member and removed from the equity still available.</p>

  <h2 style="font-size:1.5rem;font-weight:700;margin:0 0 12px;">6. Build the Team</h2>
  <p style="color:#475569;line-height:1.7;margin:0 0 16px;">As people join and proposed equity is allocated, an idea can become a structured founding team. The equity picture is: <strong>Founder equity + approved proposed allocations + available equity</strong>. Full allocation can mean a potential founding team has formed. It does not mean a company has been incorporated, or that legal shares have been issued.</p>

  <h2 style="font-size:1.5rem;font-weight:700;margin:0 0 12px;">7. Take the Startup Forward</h2>
  <p style="color:#475569;line-height:1.7;margin:0 0 40px;">EquityTake covers the stage between "I have an idea" and "we have a team that can build it." When a team is ready, the next steps are theirs: build the product, validate the business, prepare founder agreements, incorporate, raise finance, or get professional legal and financial advice.</p>

  <h2 style="font-size:1.5rem;font-weight:700;margin:0 0 12px;">Pre-incorporation and incorporated groups</h2>
  <p style="color:#475569;line-height:1.7;margin:0 0 16px;"><strong>Pre-incorporation.</strong> The business is not yet a company. Equity on EquityTake is a proposed, informal arrangement. It does not create legal shares or ownership.</p>
  <p style="color:#475569;line-height:1.7;margin:0 0 40px;"><strong>Incorporated.</strong> The business already exists. Equity on EquityTake is still a proposed allocation until the company has properly agreed and legally implemented it.</p>

  <h2 style="font-size:1.5rem;font-weight:700;margin:0 0 12px;">EquityTake does not sell shares</h2>
  <p style="color:#475569;line-height:1.7;margin:0 0 16px;">EquityTake does not issue shares, transfer legal ownership, hold investment funds, or automatically create legally binding equity agreements. Proposed Company Value, Reference Value and equity applications are discussion tools. Before formalising ownership, investment or company arrangements, get independent legal, financial and tax advice.</p>

  <h2 style="font-size:1.5rem;font-weight:700;margin:0 0 12px;">FAQ</h2>
  <dl style="color:#475569;line-height:1.7;margin:0 0 40px;">
    <dt style="font-weight:600;color:#1e293b;margin-top:16px;">What is Proposed Company Value?</dt>
    <dd style="margin:4px 0 0 0;">The value the group creator assigns to 100% of the business. It is a reference for equity talks, not a professional valuation.</dd>
    <dt style="font-weight:600;color:#1e293b;margin-top:16px;">How is Reference Value calculated?</dt>
    <dd style="margin:4px 0 0 0;">Proposed Company Value multiplied by the equity percentage. A $20,000 Proposed Company Value and 5% equity is a $1,000 Reference Value.</dd>
    <dt style="font-weight:600;color:#1e293b;margin-top:16px;">Does a Skills / Tasks application mean cash was invested?</dt>
    <dd style="margin:4px 0 0 0;">No. Reference Value is only the reference attached to that proposed equity. It is not cash invested.</dd>
    <dt style="font-weight:600;color:#1e293b;margin-top:16px;">Does EquityTake issue shares?</dt>
    <dd style="margin:4px 0 0 0;">No. Applications and allocations on EquityTake are proposed. They do not issue shares, transfer ownership, or create a binding agreement by themselves.</dd>
    <dt style="font-weight:600;color:#1e293b;margin-top:16px;">Is EquityTake free?</dt>
    <dd style="margin:4px 0 0 0;">Yes. Sign-in is the only gate. Create a group or browse groups after you sign in.</dd>
  </dl>

  <p style="margin:24px 0;">
    <a href="/create-startup-group/" style="display:inline-block;padding:12px 24px;background:#ea580c;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;margin-right:12px;">Create a group</a>
    <a href="/groups/" style="display:inline-block;padding:12px 24px;border:1px solid #cbd5e1;color:#1e293b;text-decoration:none;border-radius:8px;font-weight:600;">Explore active groups</a>
  </p>`
    ),
  },
  '/blog': {
    title: 'Blog – EquityTake',
    description: 'Insights, updates, and stories from the EquityTake team. Learn about building startups, finding co-founders, and growing your business.',
    h1: 'Blog',
    bodyHtml: null, // generated dynamically with blog post list
  },
  '/about': {
    title: 'About EquityTake – Find Co-Founders & Build Startups',
    description: 'Learn more about EquityTake - connecting co-founders to build startups together through collaborative groups. Join our community of entrepreneurs and innovators.',
    h1: 'About EquityTake',
    bodyHtml: pageShell(
      'About EquityTake',
      `<p style="font-size:1.1rem;color:#475569;margin:0 0 20px;">Connecting co-founders to build startups together</p>
  <p style="color:#475569;line-height:1.7;margin:0 0 20px;">EquityTake is a platform designed to help aspiring entrepreneurs connect with co-founders and build startups together. Our mission is to make starting a company more accessible by facilitating meaningful connections between people with complementary skills and shared visions.</p>
  <p style="color:#475569;line-height:1.7;margin:0 0 20px;">Through our platform, you can: browse and join startup groups with innovative ideas; connect with potential co-founders who share your passion; apply for equity in promising ventures; collaborate with team members to bring ideas to life; and access resources and tools to help your startup succeed.</p>
  <p style="color:#475569;line-height:1.7;margin:0 0 40px;">Whether you're a developer, designer, marketer, or business strategist, EquityTake provides the platform to find your perfect co-founder match and start building something amazing together.</p>`
    ),
  },
  '/privacy': {
    title: 'Privacy Policy – EquityTake',
    description: "EquityTake's Privacy Policy - Learn how we protect and handle your personal information, data collection practices, and your rights.",
    h1: 'Privacy Policy',
    bodyHtml: pageShell(
      'Privacy Policy',
      `<p style="font-size:1.1rem;color:#475569;margin:0 0 20px;">How we protect and handle your personal information</p>
  <p style="color:#475569;line-height:1.7;margin:0 0 20px;">At EquityTake, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, share, and protect your information when you use our platform to connect with co-founders and participate in startup groups.</p>
  <p style="color:#475569;line-height:1.7;margin:0 0 20px;">By using our services, you agree to the collection and use of information in accordance with this policy. We encourage you to read this policy carefully and contact us if you have any questions.</p>
  <h2 style="font-size:1.3rem;font-weight:700;margin:24px 0 8px;">Information we collect</h2>
  <p style="color:#475569;line-height:1.7;margin:0 0 20px;">Account data (name, email), profile data (username, avatar), group data, communication data, and automatically collected usage, device, location, and performance data.</p>
  <h2 style="font-size:1.3rem;font-weight:700;margin:24px 0 8px;">Your rights</h2>
  <p style="color:#475569;line-height:1.7;margin:0 0 20px;">Under GDPR and CCPA, you have rights to access, correct, delete, and restrict processing of your personal data. Contact admin@groupsandcrowds.com to exercise these rights.</p>
  <h2 style="font-size:1.3rem;font-weight:700;margin:24px 0 8px;">Security</h2>
  <p style="color:#475569;line-height:1.7;margin:0 0 40px;">We use TLS 1.3 for data in transit, AES-256 for data at rest, and Row Level Security in our database. Last updated January 15, 2025.</p>`
    ),
  },
  '/terms': {
    title: 'Terms of Service – EquityTake',
    description: "EquityTake's Terms of Service - Read our user agreement, usage rules, and legal guidelines for using our platform.",
    h1: 'Terms of Service',
    bodyHtml: pageShell(
      'Terms of Service',
      `<p style="font-size:1.1rem;color:#475569;margin:0 0 20px;">Legal terms and conditions for using EquityTake</p>
  <p style="color:#b91c1c;line-height:1.7;margin:0 0 20px;font-weight:600;">YOU ACKNOWLEDGE AND AGREE that participation in EquityTake involves significant financial risks, including total loss of investment, no refund guarantee, removal without cause, and group dissolution. By using this platform, you accept full responsibility for these risks.</p>
  <p style="color:#475569;line-height:1.7;margin:0 0 20px;">These Terms of Service govern your use of the EquityTake platform. By accessing or using our Platform, you agree to be bound by these Terms. If you do not agree to these Terms, do not use the Platform.</p>
  <h2 style="font-size:1.3rem;font-weight:700;margin:24px 0 8px;">Key terms</h2>
  <ul style="color:#475569;line-height:1.7;padding-left:20px;margin:0 0 20px;">
    <li>EquityTake does not issue shares, collect investment, or incorporate companies.</li>
    <li>Equity numbers are discussion proposals, not legal allocations.</li>
    <li>Limitation of liability is capped at $100 USD or amounts paid in the prior 12 months.</li>
    <li>Disputes are resolved through binding arbitration.</li>
  </ul>
  <p style="color:#475569;line-height:1.7;margin:0 0 40px;">Last updated January 15, 2025.</p>`
    ),
  },
  '/cookies': {
    title: 'Cookie Policy – EquityTake',
    description: "EquityTake's Cookie Policy - Learn about how we use cookies and similar technologies to enhance your experience on our platform.",
    h1: 'Cookie Policy',
    bodyHtml: pageShell(
      'Cookie Policy',
      `<p style="font-size:1.1rem;color:#475569;margin:0 0 20px;">How we use cookies and similar technologies</p>
  <p style="color:#475569;line-height:1.7;margin:0 0 20px;">This Cookie Policy explains how EquityTake uses cookies and similar tracking technologies when you visit our website and use our platform. This policy should be read alongside our Privacy Policy for a complete understanding of how we handle your personal information.</p>
  <p style="color:#475569;line-height:1.7;margin:0 0 20px;">When you visit EquityTake for the first time, a cookie consent banner appears. You can choose to accept all cookies, reject optional cookies, or customise your preferences by enabling or disabling Analytics and Marketing cookies individually. Essential cookies are always active and cannot be disabled.</p>
  <h2 style="font-size:1.3rem;font-weight:700;margin:24px 0 8px;">Types of cookies</h2>
  <ul style="color:#475569;line-height:1.7;padding-left:20px;margin:0 0 20px;">
    <li><strong>Essential</strong> — always active. Required for authentication, security, and core site functionality. These cannot be disabled.</li>
    <li><strong>Analytics</strong> — optional. Google Analytics (GA4) helps us understand how visitors interact with the site. Disabled by default until you opt in.</li>
    <li><strong>Marketing</strong> — optional. Meta (Facebook) Pixel and TikTok Pixel measure advertising performance and conversion events. Disabled by default until you opt in.</li>
  </ul>
  <h2 style="font-size:1.3rem;font-weight:700;margin:24px 0 8px;">Managing your preferences</h2>
  <p style="color:#475569;line-height:1.7;margin:0 0 20px;">You can change your cookie preferences at any time by clicking "Cookie Preferences" in the website footer. Withdrawing consent stops further optional tracking and clears existing tracking cookies from your browser.</p>
  <p style="color:#475569;line-height:1.7;margin:0 0 40px;">Last updated October 11, 2026. Contact: admin@groupsandcrowds.com.</p>`
    ),
  },
  '/sign-in': {
    title: 'Sign in to EquityTake',
    description: 'Sign in to your EquityTake account to find co-founders, join startup groups, and discuss proposed equity splits.',
    h1: 'Sign in to EquityTake',
    robots: 'noindex, follow',
    canonical: '/sign-in/',
    bodyHtml: withShell(`<main style="font-family:system-ui,-apple-system,sans-serif;color:#1e293b;max-width:480px;margin:0 auto;padding:20px;">
  <p style="text-align:center;margin:0 0 8px;font-size:1.5rem;font-weight:700;color:#1e293b;">EquityTake</p>
  <h1 style="font-size:1.75rem;font-weight:700;text-align:center;margin:0 0 8px;">Sign in to EquityTake</h1>
  <p style="font-size:0.9rem;color:#64748b;text-align:center;margin:0 0 24px;">Use your EquityTake account. This is not a Google, bank, or other site login.</p>
  <form style="display:flex;flex-direction:column;gap:16px;">
    <div>
      <label style="font-size:0.85rem;font-weight:600;color:#475569;display:block;margin:0 0 4px;" for="email">Email address</label>
      <input id="email" type="email" placeholder="Email address" style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:0.9rem;" />
    </div>
    <div>
      <label style="font-size:0.85rem;font-weight:600;color:#475569;display:block;margin:0 0 4px;" for="password">Password</label>
      <input id="password" type="password" placeholder="Password" style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:0.9rem;" />
    </div>
    <button type="submit" style="width:100%;padding:10px 12px;background:#ea580c;color:#fff;border:none;border-radius:8px;font-weight:600;font-size:0.9rem;cursor:pointer;">Sign In</button>
  </form>
  <p style="font-size:0.85rem;color:#475569;text-align:center;margin:20px 0 8px;">
    Don't have an account? <a href="/?auth=signup" style="color:#2563eb;font-weight:600;">Sign Up</a>
  </p>
  <p style="font-size:0.8rem;color:#94a3b8;text-align:center;margin:0 0 12px;">
    <a href="/forgot-password/" style="color:#2563eb;">Forgot password?</a>
  </p>
  <p style="font-size:0.8rem;color:#94a3b8;text-align:center;">
    <a href="/" style="color:#64748b;">equitytakeaway.com</a>
  </p>
</main>`),
  },
  '/404': {
    title: 'Page not found | EquityTake',
    description: 'The page you are looking for does not exist on EquityTake.',
    h1: 'Page not found',
    robots: 'noindex, follow',
    omitCanonical: true,
    bodyHtml: withShell(`<main style="font-family:system-ui,-apple-system,sans-serif;color:#1e293b;max-width:600px;margin:0 auto;padding:40px 20px;text-align:center;">
  <h1 style="font-size:2rem;font-weight:700;margin:0 0 16px;">Page not found</h1>
  <p style="color:#475569;line-height:1.6;margin:0 0 24px;">The page you are looking for does not exist, or it may have moved.</p>
  <p style="margin:0 0 16px;"><a href="/" style="display:inline-block;padding:12px 24px;background:#ea580c;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Go to the homepage</a></p>
  <p style="margin:0 0 8px;"><a href="/groups/" style="color:#ea580c;">Browse startup groups</a></p>
  <p style="margin:0 0 8px;"><a href="/blog/" style="color:#ea580c;">Read the blog</a></p>
  <p style="margin:0"><a href="/how-it-works/" style="color:#ea580c;">How it works</a></p>
</main>`),
  },
};

// ---------- Homepage with crawlable links + Explore section ----------
function buildHomepage(groups) {
  let groupsPreview = '';
  if (groups && groups.length > 0) {
    const items = groups.slice(0, 6).map((g) => {
      const name = esc(g.name || 'Untitled group');
      const slug = g.slug || g.id;
      const href = g.slug ? `/groups/${esc(g.slug)}/` : '/groups/';
      const desc = esc(truncate(stripHtml(g.description), 140));
      return `<div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:12px;">
        <h3 style="font-size:1.15rem;font-weight:600;margin:0 0 6px;"><a href="${href}" style="color:#1e293b;text-decoration:none;">${name}</a></h3>
        ${desc ? `<p style="color:#64748b;margin:0;font-size:0.9rem;">${desc}</p>` : ''}
      </div>`;
    }).join('\n');
    groupsPreview = `<div style="margin:24px 0;">${items}</div>`;
  } else {
    groupsPreview = `<p style="color:#64748b;margin:24px 0;">No public groups yet. <a href="/create-startup-group/" style="color:#ea580c;">Create the first one</a>.</p>`;
  }

  return withShell(`<main class="seo-snapshot" style="font-family:system-ui,-apple-system,sans-serif;color:#1e293b;max-width:800px;margin:0 auto;padding:20px;">
  <h1 style="font-size:2rem;font-weight:700;margin:0 0 16px;">Find co-founders and build startup groups</h1>
  <p style="font-size:1.1rem;line-height:1.6;color:#475569;margin:0 0 20px;">
    Start or join a group built on one idea — then match with co-founders and talk through proposed equity splits.
  </p>
  <p style="margin:0 0 24px;">
    <a href="/groups/" style="display:inline-block;padding:12px 24px;background:#ea580c;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;margin-right:12px;">Browse groups</a>
    <a href="/create-startup-group/" style="display:inline-block;padding:12px 24px;border:1px solid #cbd5e1;color:#1e293b;text-decoration:none;border-radius:8px;font-weight:600;">Create a group</a>
  </p>
  <p style="font-size:0.9rem;color:#94a3b8;font-weight:500;margin:0 0 40px;">Not profile dating. Not a hobby meetup.</p>

  <h2 style="font-size:1.5rem;font-weight:700;margin:0 0 12px;">How it works</h2>
  <p style="color:#475569;margin:0 0 20px;">Three steps from idea to co-founder conversations.</p>
  <ol style="color:#475569;line-height:1.7;padding-left:20px;margin:0 0 40px;">
    <li><strong>Create or join a group.</strong> Start a startup group around your idea, or browse existing groups and request to join one that fits your skills and interests.</li>
    <li><strong>Match with builders.</strong> Connect with potential co-founders inside the group. See what skills each member brings and find the right fit for your team.</li>
    <li><strong>Discuss proposed equity.</strong> Talk through proposed equity splits within the group. Numbers are discussion proposals — not legal shares or formal allocations.</li>
  </ol>

  <h2 style="font-size:1.5rem;font-weight:700;margin:0 0 12px;">Who it's for</h2>
  <p style="color:#475569;margin:0 0 20px;">EquityTake is built for people at the earliest stage of building something new.</p>
  <ul style="color:#475569;line-height:1.7;padding-left:20px;margin:0 0 40px;">
    <li><strong>Solo founders looking for co-founders.</strong> You have an idea and need the right people to make it real.</li>
    <li><strong>Builders looking to join a team.</strong> You have skills and want to contribute to a startup.</li>
    <li><strong>Early-stage teams forming.</strong> You're a small group starting out and want a structured space to discuss who does what and how equity might be split — before anything is formalised.</li>
    <li><strong>People exploring startup ideas.</strong> You're curious about startup building and want to see what others are working on. Browse groups freely — no account needed to look around.</li>
    <li><strong>People starting a self-governing community.</strong> You want to create a community that governns itself, for profit or non profit visions.</li>
    <li><strong>People looking for property partners.</strong> You want partners for a property investment or a development, and a group built around that project.</li>
  </ul>

  <h2 style="font-size:1.5rem;font-weight:700;margin:0 0 12px;">Why EquityTake</h2>
  <p style="color:#475569;margin:0 0 20px;">A place that starts from an idea or a project, not from a profile.</p>
  <ul style="color:#475569;line-height:1.7;padding-left:20px;margin:0 0 40px;">
    <li><strong>One idea, one group.</strong> You do not match profiles with no reason. You start a group around one idea or project, for profit or not, and the people join that.</li>
    <li><strong>Free to use.</strong> EquityTake is fully free. Browse groups, create a group, join a group, and discuss proposed equity — no subscription, no paywall, no hidden costs.</li>
    <li><strong>Auth for trust.</strong> You can browse groups without signing in. Creating a group, joining a group, and chatting require an account — so every member is a real person, not an anonymous post.</li>
  </ul>

  <h2 style="font-size:1.5rem;font-weight:700;margin:0 0 12px;">Active groups</h2>
  ${groupsPreview}
  <p style="margin:0 0 40px;"><a href="/groups/" style="color:#ea580c;font-weight:600;">Browse all groups →</a></p>

  <h2 style="font-size:1.5rem;font-weight:700;margin:0 0 12px;">Explore</h2>
  <p style="color:#475569;margin:0 0 16px;">From idea or project → startup group → co-founders + proposed equity.</p>
  <ul style="color:#475569;line-height:1.7;padding-left:20px;margin:0 0 40px;">
    <li><a href="/create-startup-group/" style="color:#ea580c;">Create a startup group around your idea</a></li>
    <li><a href="/startup-team-building/" style="color:#ea580c;">Startup team building</a></li>
    <li><a href="/startup-groups/" style="color:#ea580c;">Startup groups</a></li>
    <li><a href="/find-a-cofounder/" style="color:#ea580c;">Find a co-founder</a></li>
    <li><a href="/cofounder-matching/" style="color:#ea580c;">Co-founder matching</a></li>
    <li><a href="/equity-for-cofounders/" style="color:#ea580c;">Equity for co-founders</a></li>
    <li><a href="/startup-equity-split/" style="color:#ea580c;">Startup equity split</a></li>
    <li><a href="/how-it-works/" style="color:#ea580c;">How it works</a></li>
    <li><a href="/blog/" style="color:#ea580c;">Blog</a></li>
  </ul>

  <h2 style="font-size:1.5rem;font-weight:700;margin:0 0 12px;">Frequently asked questions</h2>
  <dl style="color:#475569;line-height:1.7;margin:0 0 40px;">
    <dt style="font-weight:600;color:#1e293b;margin-top:16px;">Is EquityTake free to use?</dt>
    <dd style="margin:4px 0 0 0;">Yes. EquityTake is fully free. You can browse, create, and join groups, and discuss proposed equity splits at no cost. There is no subscription or paywall.</dd>
    <dt style="font-weight:600;color:#1e293b;margin-top:16px;">Do I need an account to browse groups?</dt>
    <dd style="margin:4px 0 0 0;">No. You can browse all public groups freely without signing in. You only need an account to create a group, join a group, or participate in group discussions.</dd>
    <dt style="font-weight:600;color:#1e293b;margin-top:16px;">Are the equity numbers legal shares?</dt>
    <dd style="margin:4px 0 0 0;">No. Equity numbers shown on a group are proposals for discussion only. EquityTake does not issue shares, allocate legal ownership, or incorporate companies. If anyone asks you for funds, shares, or formal incorporation, get independent legal advice first.</dd>
    <dt style="font-weight:600;color:#1e293b;margin-top:16px;">Is EquityTake a stock exchange or investment platform?</dt>
    <dd style="margin:4px 0 0 0;">No. EquityTake is a co-founder matching and startup groups platform. It is not a stock exchange, investment platform, or legal incorporation service. The equity discussions are non-binding proposals to help teams talk through ownership before formalising anything.</dd>
    <dt style="font-weight:600;color:#1e293b;margin-top:16px;">How does co-founder matching work?</dt>
    <dd style="margin:4px 0 0 0;">Create or join a group around a startup idea. Inside the group, you can see other members' skills and interests. From there, you can connect directly and discuss whether you'd make a good co-founder team.</dd>
    <dt style="font-weight:600;color:#1e293b;margin-top:16px;">Can I discuss a startup equity split before incorporating?</dt>
    <dd style="margin:4px 0 0 0;">Yes — that's exactly what the proposed equity feature is for. Team members can suggest equity splits and discuss them openly within the group. These are non-binding proposals to help you align before spending money on legal incorporation.</dd>
  </dl>
</main>`);
}

// ---------- Generate /groups page with live data ----------
function buildGroupsPage(groups) {
  let groupsHtml = '';
  if (groups && groups.length > 0) {
    const items = groups.slice(0, 20).map((g) => {
      const name = esc(g.name || 'Untitled group');
      const desc = esc(truncate(stripHtml(g.description), 160));
      const industry = g.industry ? esc(g.industry) : '';
      const tags = Array.isArray(g.tags) && g.tags.length > 0
        ? g.tags.map((t) => esc(t)).join(', ')
        : '';
      const slug = g.slug || g.id;
      const linkHref = g.slug ? `/groups/${esc(g.slug)}/` : '/groups/';
      return `<div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:12px;">
        <h3 style="font-size:1.2rem;font-weight:600;margin:0 0 8px;"><a href="${linkHref}" style="color:#1e293b;text-decoration:none;">${name}</a></h3>
        ${desc ? `<p style="color:#64748b;margin:0 0 8px;font-size:0.95rem;">${desc}</p>` : ''}
        ${industry ? `<p style="color:#94a3b8;margin:0 0 4px;font-size:0.85rem;">Industry: ${industry}</p>` : ''}
        ${tags ? `<p style="color:#94a3b8;margin:0;font-size:0.85rem;">Tags: ${tags}</p>` : ''}
      </div>`;
    }).join('\n');
    groupsHtml = `<div style="margin:24px 0;">${items}</div>`;
  } else {
    groupsHtml = `<p style="color:#64748b;margin:24px 0;">No public groups available yet. Be the first to <a href="/create-startup-group/" style="color:#ea580c;">create one</a>.</p>`;
  }

  return withShell(`<main style="font-family:system-ui,-apple-system,sans-serif;color:#1e293b;max-width:800px;margin:0 auto;padding:20px;">
  <h1 style="font-size:2rem;font-weight:700;margin:0 0 16px;">Browse startup groups</h1>
  <p style="font-size:1.1rem;line-height:1.6;color:#475569;margin:0 0 20px;">Each group is one idea and one team conversation. Browse, join, or create your own.</p>
  <p style="margin:0 0 24px;">
    <a href="/create-startup-group/" style="display:inline-block;padding:12px 24px;background:#ea580c;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;margin-right:12px;">Create a startup group</a>
    <a href="/cofounder-matching/" style="display:inline-block;padding:12px 24px;border:1px solid #cbd5e1;color:#1e293b;text-decoration:none;border-radius:8px;font-weight:600;">Co-founder matching</a>
  </p>
  ${groupsHtml}
  <p style="font-size:0.85rem;color:#94a3b8;margin:24px 0;">Numbers and percentages on a group are proposals for discussion. EquityTake does not issue shares, collect investment, or incorporate companies.</p>
  <p style="font-size:0.9rem;color:#64748b;margin:16px 0 0 0;">New here? <a href="/blog/how-to-join-a-startup-group-without-wasting-months/" style="color:#ea580c;">How to join a startup group without wasting months →</a></p>
</main>`);
}

// ---------- Generate a single group page ----------
// Renders a crawlable, self-canonical HTML page for a public, active group.
// Only public group fields are used — no member data, chat content, emails, or
// phone numbers. React Router hydrates and takes over after load.
function buildGroupPage(group) {
  const name = esc(group.name || 'Untitled group');
  const description = esc(buildGroupDescription(group));
  const industry = group.industry ? esc(group.industry) : '';
  const equityAvailable = (group.equity_available != null) ? `${esc(group.equity_available)}% equity available` : '';
  const companyValue = group.funding_needed ? `Proposed Company Value: ${esc(group.funding_needed)}` : '';
  const tags = Array.isArray(group.tags) && group.tags.length > 0
    ? group.tags.map((t) => esc(t)).join(', ')
    : '';
  const fullDesc = esc(truncate(stripHtml(group.description), 400));

  const metaRows = [
    industry && `<p style="color:#94a3b8;margin:0 0 4px;font-size:0.9rem;">Industry: ${industry}</p>`,
    equityAvailable && `<p style="color:#94a3b8;margin:0 0 4px;font-size:0.9rem;">${equityAvailable}</p>`,
    companyValue && `<p style="color:#94a3b8;margin:0 0 4px;font-size:0.9rem;">${companyValue}</p>`,
    tags && `<p style="color:#94a3b8;margin:0;font-size:0.9rem;">Tags: ${tags}</p>`,
  ].filter(Boolean).join('\n');

  return withShell(`<main style="font-family:system-ui,-apple-system,sans-serif;color:#1e293b;max-width:800px;margin:0 auto;padding:20px;">
  <h1 style="font-size:2rem;font-weight:700;margin:0 0 16px;">${name}</h1>
  <p style="font-size:1.05rem;line-height:1.6;color:#475569;margin:0 0 20px;">${description}</p>
  ${metaRows ? `<div style="margin:0 0 24px;">${metaRows}</div>` : ''}
  ${fullDesc ? `<div style="color:#475569;line-height:1.7;margin:0 0 24px;">${fullDesc}</div>` : ''}
  <p style="margin:0 0 24px;">
    <a href="/sign-in/" style="display:inline-block;padding:12px 24px;background:#ea580c;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;margin-right:12px;">Sign in to join</a>
    <a href="/groups/" style="display:inline-block;padding:12px 24px;border:1px solid #cbd5e1;color:#1e293b;text-decoration:none;border-radius:8px;font-weight:600;">Browse all groups</a>
  </p>
  <p style="font-size:0.85rem;color:#94a3b8;margin:24px 0;">Equity numbers are proposals for discussion. EquityTake does not issue shares, collect investment, or incorporate companies. If anyone asks for funds, shares, or formal incorporation, get independent legal advice first.</p>
  <p style="font-size:0.9rem;color:#64748b;margin:16px 0 0 0;"><a href="/how-it-works/" style="color:#ea580c;">How it works</a> &middot; <a href="/cofounder-matching/" style="color:#ea580c;">Co-founder matching</a> &middot; <a href="/create-startup-group/" style="color:#ea580c;">Create your own group</a></p>
</main>`);
}

function buildGroupDescription(group) {
  const parts = [];
  const desc = stripHtml(group.description || '').slice(0, 140);
  if (desc) parts.push(desc + (group.description && group.description.length > 140 ? '...' : ''));
  if (group.industry) parts.push(`Industry: ${group.industry}`);
  if (group.equity_available != null) parts.push(`${group.equity_available}% equity available`);
  if (group.funding_needed) parts.push(`Company Value: ${group.funding_needed}`);
  return parts.join(' | ') || `Join ${group.name || 'this group'} on EquityTake — connect with co-founders and discuss proposed equity.`;
}

// ---------- Generate /blog page with live data ----------
function buildBlogListPage(posts) {
  let postsHtml = '';
  if (posts && posts.length > 0) {
    const items = posts.map((p) => {
      const title = esc(p.title || 'Untitled');
      const slug = esc(p.slug || '');
      const excerpt = esc(truncate(stripHtml(p.excerpt || p.content_body), 200));
      const date = p.published_at
        ? new Date(p.published_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
        : '';
      return `<div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:12px;">
        <h3 style="font-size:1.2rem;font-weight:600;margin:0 0 4px;"><a href="/blog/${slug}/" style="color:#1e293b;text-decoration:none;">${title}</a></h3>
        ${date ? `<p style="color:#94a3b8;margin:0 0 8px;font-size:0.85rem;">${date}</p>` : ''}
        ${excerpt ? `<p style="color:#64748b;margin:0;font-size:0.95rem;">${excerpt}</p>` : ''}
      </div>`;
    }).join('\n');
    postsHtml = `<div style="margin:24px 0;">${items}</div>`;
  } else {
    postsHtml = `<p style="color:#64748b;margin:24px 0;">No blog posts available yet.</p>`;
  }

  return withShell(`<main style="font-family:system-ui,-apple-system,sans-serif;color:#1e293b;max-width:800px;margin:0 auto;padding:20px;">
  <h1 style="font-size:2rem;font-weight:700;margin:0 0 16px;">Blog</h1>
  <p style="font-size:1.1rem;line-height:1.6;color:#475569;margin:0 0 20px;">Insights, updates, and stories from the EquityTake team. Learn about building startups, finding co-founders, and growing your business.</p>
  ${postsHtml}
</main>`);
}

// ---------- Markdown to HTML converter (sanitised) ----------
// Normalise an internal href to a trailing slash.
// - Adds trailing slash to internal paths (starting with "/" or the site origin)
//   that have no file extension, no query, no hash, and don't already end in "/".
// - Leaves external links, assets, anchors, and mailto: untouched.
function normalizeHref(href) {
  if (!href) return href;
  let url = href.trim();
  // Only normalise internal links: root-relative or pointing at our origin.
  const isOrigin = url.startsWith(SITE_ORIGIN);
  const isRoot = url.startsWith('/');
  if (!isOrigin && !isRoot) return href;
  // Extract the path portion.
  let path = isOrigin ? url.slice(SITE_ORIGIN.length) : url;
  // Leave query strings and hashes alone (e.g. /?auth=signup, /blog/#section).
  if (path.includes('?') || path.includes('#')) return href;
  // Leave the homepage alone.
  if (path === '/') return href;
  // Leave files with extensions alone (e.g. /favicon.svg, /assets/index.js).
  if (/\.[a-zA-Z0-9]{1,8}$/.test(path)) return href;
  // Already has trailing slash.
  if (path.endsWith('/')) return href;
  // Add the trailing slash.
  const normalized = path + '/';
  return isOrigin ? SITE_ORIGIN + normalized : normalized;
}

function renderMarkdown(md) {
  if (!md) return '';
  let text = String(md);

  // Extract existing HTML tags (e.g. <a href="...">) and protect them
  const htmlTokens = [];
  text = text.replace(/<[^>]+>/g, (m) => {
    // Normalise hrefs inside existing HTML <a> tags from the blog content.
    const normalised = m.replace(/href="([^"]*)"/g, (_, href) => `href="${normalizeHref(href)}"`);
    htmlTokens.push(normalised);
    return `\x00HTML${htmlTokens.length - 1}\x00`;
  });

  // Escape HTML entities in the remaining text
  text = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Convert markdown links [text](url) to <a> tags (with trailing-slash normalisation)
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, linkText, url) => {
    return `<a href="${normalizeHref(url)}">${linkText}</a>`;
  });

  // Bold **text** or __text__
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // Italic *text* or _text_ (but not ** which was already handled)
  text = text.replace(/(^|[^*])\*([^*\n]+)\*(?![*])/g, '$1<em>$2</em>');
  text = text.replace(/(^|[^_])_([^_\n]+)_(?!_)/g, '$1<em>$2</em>');

  // Restore protected HTML tokens
  text = text.replace(/\x00HTML(\d+)\x00/g, (_, i) => htmlTokens[Number(i)]);

  // Split into lines and process block-level elements
  const lines = text.split('\n');
  const result = [];
  let inList = false;
  let listType = null;
  let inParagraph = [];

  function flushParagraph() {
    if (inParagraph.length > 0) {
      result.push(`<p>${inParagraph.join(' ')}</p>`);
      inParagraph = [];
    }
  }
  function closeList() {
    if (inList) {
      result.push(`</${listType}>`);
      inList = false;
      listType = null;
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();

    // Headings
    const hMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (hMatch) {
      flushParagraph();
      closeList();
      const level = hMatch[1].length;
      result.push(`<h${level}>${hMatch[2]}</h${level}>`);
      continue;
    }

    // Unordered list items
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

    // Ordered list items
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

    // Empty line — paragraph break
    if (trimmed === '') {
      flushParagraph();
      closeList();
      continue;
    }

    // Normal text line — accumulate into paragraph
    closeList();
    inParagraph.push(trimmed);
  }

  flushParagraph();
  closeList();

  return result.join('\n');
}

// ---------- Safe JSON embedding for prerendered HTML ----------
// Escapes characters that can break out of a <script type="application/json">
// context: </script>, <!--, and U+2028/U+2029 (JSON line/paragraph separators
// that are valid in JSON but invalid in JS string literals).
function safeJsonForHtml(jsonString) {
  return jsonString
    .replace(/<\//g, '<\\/')
    .replace(/<!--/g, '<\\!--')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

// ---------- Generate a single blog post page ----------
// IMPORTANT: No truncation. The full rendered markdown body is written to the
// prerendered HTML so View Source shows the complete article.
//
// The post's public data is also embedded as a JSON payload inside a
// <script type="application/json" id="prerendered-blog-post"> tag so that
// BlogPostPage can initialise from it without a runtime Supabase request.
// This ensures the article remains visible even if Supabase is temporarily
// unreachable after hydration.
function buildBlogPostPage(post) {
  const title = esc(post.title || 'Untitled');
  const excerpt = post.meta_description || post.excerpt || truncate(stripHtml(post.content_body), 160);
  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';
  // Render the FULL markdown body — no truncation.
  const rawBody = post.content_body || '';
  const bodyHtml = renderMarkdown(rawBody);

  // Build the embedded JSON payload. Only include public, published fields.
  const embeddedData = {
    slug: post.slug,
    title: post.title,
    content_body: post.content_body,
    excerpt: post.excerpt,
    featured_image_url: post.featured_image_url || null,
    is_published: true,
    meta_description: post.meta_description || null,
    published_at: post.published_at || null,
    updated_at: post.updated_at || null,
  };
  const embeddedJson = safeJsonForHtml(JSON.stringify(embeddedData));

  const body = `<main style="font-family:system-ui,-apple-system,sans-serif;color:#1e293b;max-width:800px;margin:0 auto;padding:20px;">
  <h1 style="font-size:2rem;font-weight:700;margin:0 0 8px;">${title}</h1>
  ${date ? `<p style="color:#94a3b8;margin:0 0 24px;font-size:0.9rem;">Published ${date}</p>` : ''}
  <div style="color:#475569;line-height:1.7;font-size:1.05rem;">${bodyHtml}</div>
  <p style="margin:32px 0 16px;"><a href="/blog/" style="color:#ea580c;">&larr; Back to blog</a></p>
</main>`;
  return { body: withShell(body), headExtra: `<script type="application/json" id="prerendered-blog-post">${embeddedJson}</script>` };
}

// ---------- Neutral blog fallback for unknown /blog/* URLs ----------
// Served by Netlify when no prerendered blog post HTML exists for a slug.
// Contains no homepage metadata, no canonical, no robots tag, and no JSON-LD
// so that crawlers do not associate this URL with the homepage. React Router
// hydrates and fetches from Supabase to determine whether the article exists.
function buildBlogFallback() {
  return withShell(`<main style="font-family:system-ui,-apple-system,sans-serif;color:#1e293b;max-width:800px;margin:0 auto;padding:20px;">
  <h1 style="font-size:2rem;font-weight:700;margin:0 0 8px;">EquityTake Blog</h1>
  <p style="color:#64748b;line-height:1.7;margin:0 0 24px;">Loading article…</p>
  <p><a href="/blog/" style="color:#ea580c;">&larr; Back to blog</a></p>
</main>`);
}

// ---------- Sitemap generation ----------
function buildSitemap(posts, groups) {
  const staticEntries = [
    { path: '/', lastmod: TODAY, changefreq: 'daily', priority: '1.0' },
    { path: '/groups/', lastmod: TODAY, changefreq: 'daily', priority: '0.9' },
    { path: '/startup-groups/', lastmod: TODAY, changefreq: 'monthly', priority: '0.8' },
    { path: '/create-startup-group/', lastmod: TODAY, changefreq: 'monthly', priority: '0.8' },
    { path: '/cofounder-matching/', lastmod: TODAY, changefreq: 'monthly', priority: '0.8' },
    { path: '/find-a-cofounder/', lastmod: TODAY, changefreq: 'monthly', priority: '0.8' },
    { path: '/equity-for-cofounders/', lastmod: TODAY, changefreq: 'monthly', priority: '0.8' },
    { path: '/startup-equity-split/', lastmod: TODAY, changefreq: 'monthly', priority: '0.8' },
    { path: '/startup-team-building/', lastmod: TODAY, changefreq: 'monthly', priority: '0.8' },
    { path: '/communities-and-cooperatives/', lastmod: TODAY, changefreq: 'monthly', priority: '0.8' },
    { path: '/how-it-works/', lastmod: TODAY, changefreq: 'monthly', priority: '0.8' },
    { path: '/blog/', lastmod: TODAY, changefreq: 'weekly', priority: '0.8' },
    { path: '/about/', lastmod: TODAY, changefreq: 'monthly', priority: '0.7' },
    { path: '/privacy/', lastmod: TODAY, changefreq: 'monthly', priority: '0.3' },
    { path: '/terms/', lastmod: TODAY, changefreq: 'monthly', priority: '0.3' },
    { path: '/cookies/', lastmod: TODAY, changefreq: 'monthly', priority: '0.3' },
  ];

  const postEntries = (posts || []).filter((p) => p.slug).map((p) => ({
    path: `/blog/${p.slug}/`,
    lastmod: p.published_at ? p.published_at.slice(0, 10) : TODAY,
    changefreq: 'monthly',
    priority: '0.7',
  }));

  const groupEntries = [];

  const all = [...staticEntries, ...postEntries, ...groupEntries];
  const urls = all.map((e) => `  <url>
    <loc>${SITE_ORIGIN}${e.path}</loc>
    <lastmod>${e.lastmod}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

// ---------- Write a file ----------
function writeRoute(distDir, routePath, html) {
  let filePath;
  if (routePath === '/') {
    filePath = join(distDir, 'index.html');
  } else if (routePath === '/404') {
    // 404 is a standalone file at dist/404.html (Netlify catch-all)
    filePath = join(distDir, '404.html');
  } else {
    // Remove leading slash
    const cleanPath = routePath.replace(/^\//, '');
    const dir = join(distDir, cleanPath);
    mkdirSync(dir, { recursive: true });
    filePath = join(dir, 'index.html');
  }
  writeFileSync(filePath, html, 'utf8');
  console.log(`  ✓ Prerendered: ${routePath} → ${filePath.replace(distDir, '.')}`);
}

// ---------- Main ----------
async function main() {
  const distDir = join(process.cwd(), 'dist');

  if (!existsSync(distDir)) {
    console.error('ERROR: dist/ directory not found. Run "vite build" first.');
    process.exit(1);
  }

  console.log('🔍 Fetching live data from Supabase...');
  let posts, groups;
  try {
    [posts, groups] = await Promise.all([
      fetchPublishedBlogPosts(),
      fetchPublicGroups(),
    ]);
  } catch (e) {
    console.error('❌ Prerender aborted: failed to fetch live data from Supabase.');
    console.error('   Error:', e.message);
    console.error('   A network error during prerender must fail the build loudly — no partial/noindex HTML written.');
    process.exit(1);
  }
  console.log(`   Found ${posts.length} blog posts, ${groups.length} public groups`);

  // Read the original dist/index.html to extract the correct asset filenames
  const builtIndex = readFileSync(join(distDir, 'index.html'), 'utf8');
  const jsMatch = builtIndex.match(/src="\/(assets\/index-[^"]+\.js)"/);
  const cssMatch = builtIndex.match(/href="\/(assets\/index-[^"]+\.css)"/);
  const jsAsset = jsMatch ? jsMatch[1] : 'assets/index.js';
  const cssAsset = cssMatch ? cssMatch[1] : 'assets/index.css';

  function buildHtmlWithAssets(opts) {
    const html = buildHtml(opts);
    return html
      .replace('/assets/index-6dIil5pz.js', `/${jsAsset}`)
      .replace('/assets/index-B5vig-LC.css', `/${cssAsset}`)
      .replace('/src/main.tsx', `/${jsAsset}`);
  }

  let generated = 0;
  let skipped = 0;

  console.log('\n📄 Prerendering static routes...');
  for (const [routePath, config] of Object.entries(routes)) {
    let bodyHtml = config.bodyHtml;

    // Dynamic pages
    if (routePath === '/') {
      bodyHtml = buildHomepage(groups);
    } else if (routePath === '/groups') {
      bodyHtml = buildGroupsPage(groups);
    } else if (routePath === '/blog') {
      bodyHtml = buildBlogListPage(posts);
    }

    if (!bodyHtml) {
      console.log(`  ⚠ Skipped (no body): ${routePath}`);
      skipped++;
      continue;
    }

    const html = buildHtmlWithAssets({
      path: routePath,
      title: config.title,
      description: config.description,
      h1: config.h1,
      bodyHtml,
      ogType: 'website',
      robots: config.robots,
      canonical: config.canonical || routePath,
      omitCanonical: config.omitCanonical || false,
    });
    writeRoute(distDir, routePath, html);
    generated++;
  }

  console.log('\n👥 Prerendering public group pages...');
  for (const group of groups) {
    if (!group.slug) continue;
    const routePath = `/groups/${group.slug}`;
    const bodyHtml = buildGroupPage(group);
    const title = `${group.name || 'Untitled group'} – EquityTake`;
    const description = buildGroupDescription(group);
    const ogImage = absoluteImageUrl(group.cover_image) || DEFAULT_OG_IMAGE;
    const ogImageAlt = group.name ? `${group.name} — group cover image` : '';
    const html = buildHtmlWithAssets({
      path: routePath,
      title,
      description,
      h1: group.name || 'Untitled group',
      bodyHtml,
      ogType: 'website',
      ogImage,
      ogImageAlt,
      robots: 'noindex, follow',
      canonical: routePath,
    });
    writeRoute(distDir, routePath, html);
    generated++;
  }

  console.log('\n📝 Prerendering blog posts...');
  for (const post of posts) {
    if (!post.slug) continue;
    const routePath = `/blog/${post.slug}`;
    const { body: bodyHtml, headExtra: blogHeadExtra } = buildBlogPostPage(post);
    const title = `${post.title} – EquityTake Blog`;
    const description = post.meta_description || post.excerpt || truncate(stripHtml(post.content_body), 160);
    // Per-post og:image from the post's featured image; fall back to default.
    const ogImage = absoluteImageUrl(post.featured_image_url) || DEFAULT_OG_IMAGE;
    const ogImageAlt = post.title ? `${post.title} — article cover image` : '';
    const html = buildHtmlWithAssets({
      path: routePath,
      title,
      description,
      h1: post.title,
      bodyHtml,
      ogType: 'article',
      ogImage,
      ogImageAlt,
      canonical: routePath,
      headExtra: blogHeadExtra,
    });
    writeRoute(distDir, routePath, html);
    generated++;
  }

  // Neutral blog fallback: served by Netlify's /blog/* redirect rule when no
  // prerendered blog post HTML exists for the requested slug. Contains no
  // homepage canonical, no robots tag, and no JSON-LD. React Router hydrates
  // and fetches from Supabase to confirm whether the article exists.
  console.log('\n📝 Writing neutral blog fallback...');
  const blogFallbackHtml = buildHtmlWithAssets({
    path: '/blog-fallback',
    title: 'EquityTake Blog',
    description: 'EquityTake blog — insights on finding co-founders and building startups.',
    h1: 'EquityTake Blog',
    bodyHtml: buildBlogFallback(),
    ogType: 'website',
    omitCanonical: true,
    omitRobots: true,
    omitOgUrl: true,
  });
  const fallbackDir = join(distDir, 'blog-fallback');
  mkdirSync(fallbackDir, { recursive: true });
  writeFileSync(join(fallbackDir, 'index.html'), blogFallbackHtml, 'utf8');
  console.log(`  ✓ Wrote dist/blog-fallback/index.html`);
  generated++;

  // Regenerate sitemap.xml from the live blog posts so it always has the
  // correct trailing-slash URLs and current lastmod dates.
  console.log('\n🗺  Regenerating sitemap.xml...');
  const sitemapPath = join(distDir, 'sitemap.xml');
  writeFileSync(sitemapPath, buildSitemap(posts, groups), 'utf8');
  console.log(`  ✓ Wrote ${sitemapPath.replace(distDir, '.')}`);

  // Generate SPA-only noindex HTML files for app routes that must stay as
  // client-only fallbacks (login, dashboard, profile, settings, etc.). These
  // are NOT in the sitemap and carry meta robots noindex so they are not
  // indexed. They exist so the hosting 404 catch-all doesn't fire for real
  // SPA routes, and so crawlers that do hit them see noindex.
  const spaRoutes = [
    '/forgot-password',
    '/reset-password',
    '/redirect',
    '/payment/success',
    '/payment/cancelled',
    '/profile',
    '/settings',
  ];
  console.log('\n🔒 Writing SPA-only noindex route stubs...');
  for (const spaPath of spaRoutes) {
    const stubHtml = buildHtmlWithAssets({
      path: spaPath,
      title: 'EquityTake',
      description: 'EquityTake — sign in or continue to your account.',
      h1: 'EquityTake',
      bodyHtml: withShell('<main style="font-family:system-ui,sans-serif;text-align:center;padding:40px 20px;"><p style="color:#64748b;">Loading…</p></main>'),
      ogType: 'website',
      robots: 'noindex, follow',
      canonical: spaPath,
    });
    writeRoute(distDir, spaPath, stubHtml);
    generated++;
  }

  console.log(`\n✅ Prerender complete: ${generated} pages generated, ${skipped} skipped.`);
}

main().catch((err) => {
  console.error('Prerender failed:', err);
  process.exit(1);
});
