/**
 * Build-time prerender script.
 * Generates unique HTML files under dist/ for every public route and
 * every published blog post, so crawlers see real content in View Source
 * without needing JavaScript. The React SPA still hydrates and takes over
 * after load.
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

// ---------- Build the static <head> + <body> for a route ----------
function buildHtml({
  path,
  title,
  description,
  h1,
  bodyHtml,
  canonical,
  ogType = 'website',
}) {
  const fullTitle = title;
  const url = `https://equitytakeaway.com${path}`;

  return `<!doctype html>
<html lang="en">
  <head>
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-MJF82NJCD6"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-MJF82NJCD6');
    </script>

    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="apple-touch-icon" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#0a1e2e" />
    <title>${esc(fullTitle)}</title>
    <meta name="description" content="${esc(description)}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${esc(canonical || url)}" />

    <!-- Open Graph / Social sharing -->
    <meta property="og:title" content="${esc(fullTitle)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:url" content="${esc(url)}" />
    <meta property="og:type" content="${esc(ogType)}" />
    <meta property="og:site_name" content="EquityTake" />
    <meta property="og:image" content="https://equitytakeaway.com/social-share-default.jpg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(fullTitle)}" />
    <meta name="twitter:description" content="${esc(description)}" />
    <meta name="twitter:image" content="https://equitytakeaway.com/social-share-default.jpg" />

    <!-- Meta Pixel Code -->
    <script>
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '1614166306981071');
      fbq('track', 'PageView');
    </script>
    <!-- End Meta Pixel Code -->

    <script type="module" crossorigin src="/assets/index-6dIil5pz.js"></script>
    <link rel="stylesheet" href="/assets/index-B5vig-LC.css" />
  </head>
  <body>
    <!-- Meta Pixel Code (noscript fallback) -->
    <noscript>
      <img height="1" width="1" style="display:none"
        src="https://www.facebook.com/tr?id=1614166306981071&ev=PageView&noscript=1" alt="" />
    </noscript>
    <!-- End Meta Pixel Code (noscript) -->
    <div id="root">${bodyHtml}</div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
}

// ---------- Supabase data fetching ----------
async function fetchPublishedBlogPosts() {
  try {
    const url = `${SUPABASE_URL}/rest/v1/site_content?content_type=eq.blog_post&is_published=eq.true&order=published_at.desc`;
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) {
      console.warn(`   Blog posts fetch returned ${res.status}: ${await res.text()}`);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn('   Blog posts fetch error:', e.message);
    return [];
  }
}

async function fetchPublicGroups() {
  try {
    const url = `${SUPABASE_URL}/rest/v1/groups?is_public=eq.true&status=eq.active&order=created_at.desc&limit=20`;
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) {
      console.warn(`   Groups fetch returned ${res.status}: ${await res.text()}`);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn('   Groups fetch error:', e.message);
    return [];
  }
}

// ---------- Content generators for each route ----------
function link(href, text) {
  return `<a href="${esc(href)}" style="color:#ea580c;">${esc(text)}</a>`;
}

function pageShell(h1, bodyContent, linksHtml = '') {
  return `<main style="font-family:system-ui,-apple-system,sans-serif;color:#1e293b;max-width:800px;margin:0 auto;padding:20px;">
  <h1 style="font-size:2rem;font-weight:700;margin:0 0 16px;">${esc(h1)}</h1>
  ${bodyContent}
  ${linksHtml}
</main>`;
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
    <a href="/create-startup-group" style="display:inline-block;padding:12px 24px;background:#ea580c;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;margin-right:12px;">Create a startup group</a>
    <a href="/groups" style="display:inline-block;padding:12px 24px;border:1px solid #cbd5e1;color:#1e293b;text-decoration:none;border-radius:8px;font-weight:600;">Browse groups</a>
  </p>
  <p style="font-size:0.9rem;color:#94a3b8;font-weight:500;margin:0 0 40px;">Free to use. Sign up to join or create a group. EquityTake is not a stock exchange and does not issue shares.</p>
  ${extraBody}
  <p style="font-size:0.85rem;color:#94a3b8;margin:24px 0;">Numbers and percentages on a group are proposals for discussion. EquityTake does not issue shares, collect investment, or incorporate companies. If anyone asks for funds, shares, or formal incorporation, get independent legal advice first.</p>`;
  const links = `<p style="margin:24px 0;">
    ${link('/startup-groups', 'Startup groups')} | ${link('/create-startup-group', 'Create a startup group')} | ${link('/cofounder-matching', 'Co-founder matching')} | ${link('/groups', 'Browse groups')} | ${link('/equity-for-cofounders', 'Equity for co-founders')} | ${link('/startup-equity-split', 'Startup equity split')} | ${link('/startup-team-building', 'Startup team building')} | ${link('/how-it-works', 'How it works')}
  </p>`;
  return pageShell(h1, body, links);
}

const routes = {
  '/': {
    title: 'Find Co-Founders & Startup Groups | EquityTake',
    description: 'Browse or create a startup group around an idea or project. Match co-founders inside the group and discuss proposed equity before you incorporate. Free to use.',
    h1: 'Find co-founders and build startup groups',
    bodyHtml: `<main class="seo-snapshot" style="font-family:system-ui,-apple-system,sans-serif;color:#1e293b;max-width:800px;margin:0 auto;padding:20px;">
  <h1 style="font-size:2rem;font-weight:700;margin:0 0 16px;">Find co-founders and build startup groups</h1>
  <p style="font-size:1.1rem;line-height:1.6;color:#475569;margin:0 0 20px;">
    Start or join a group built on one idea — then match with co-founders and talk through proposed equity splits.
  </p>
  <p style="margin:0 0 24px;">
    <a href="/groups" style="display:inline-block;padding:12px 24px;background:#ea580c;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;margin-right:12px;">Browse groups</a>
    <a href="/create-startup-group" style="display:inline-block;padding:12px 24px;border:1px solid #cbd5e1;color:#1e293b;text-decoration:none;border-radius:8px;font-weight:600;">Create a group</a>
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
  </ul>

  <h2 style="font-size:1.5rem;font-weight:700;margin:0 0 12px;">Why EquityTake</h2>
  <p style="color:#475569;margin:0 0 20px;">A focused space for building, not just networking.</p>
  <ul style="color:#475569;line-height:1.7;padding-left:20px;margin:0 0 40px;">
    <li><strong>Useful building groups.</strong> Every group is centred on a specific idea or venture. Instead of empty networking, you join a group with a purpose — finding co-founders and working through the early questions together.</li>
    <li><strong>Free to use.</strong> EquityTake is fully free. Browse groups, create a group, join a group, and discuss proposed equity — no subscription, no paywall, no hidden costs.</li>
    <li><strong>Auth for trust.</strong> You can browse groups without signing in. Creating a group, joining a group, and chatting require an account — so every member is a real person, not an anonymous post.</li>
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

  <h2 style="font-size:1.5rem;font-weight:700;margin:0 0 12px;">Explore more</h2>
  <ul style="color:#475569;line-height:1.7;padding-left:20px;margin:0 0 40px;">
    <li><a href="/how-it-works" style="color:#ea580c;">How it works</a></li>
    <li><a href="/groups" style="color:#ea580c;">Browse all groups</a></li>
    <li><a href="/cofounder-matching" style="color:#ea580c;">Co-founder matching</a></li>
    <li><a href="/find-a-cofounder" style="color:#ea580c;">Find a co-founder</a></li>
    <li><a href="/startup-groups" style="color:#ea580c;">Startup groups</a></li>
    <li><a href="/startup-equity-split" style="color:#ea580c;">Startup equity split</a></li>
    <li><a href="/about" style="color:#ea580c;">About EquityTake</a></li>
    <li><a href="/blog" style="color:#ea580c;">Blog</a></li>
  </ul>
</main>`,
  },
  '/groups': {
    title: 'Browse Startup Groups – EquityTake',
    description: 'Browse startup groups on EquityTake. Each group is one idea and one team conversation — create a group, match co-founders, and discuss proposed equity inside the group.',
    h1: 'Browse startup groups',
    bodyHtml: null, // generated dynamically with group data
  },
  '/startup-groups': {
    title: 'Startup Groups – EquityTake',
    description: 'Browse startup groups on EquityTake. Each group is one idea and one team conversation — create a group, match co-founders, and discuss proposed equity inside the group.',
    h1: 'Startup groups',
    bodyHtml: marketingShell(
      'Startup groups',
      'A group is one idea and one team conversation. You create a group, invite or match people, and talk about roles and proposed equity inside that group. Each group has its own chat, its own members, and its own proposed equity numbers. The numbers are there to start a discussion — they are not a signed cap table.',
      `<p style="color:#475569;line-height:1.7;margin:0 0 20px;"><a href="/groups" style="color:#ea580c;">Browse all groups →</a></p>${relatedReadingHtml([
        { href: '/blog/startup-groups-that-actually-help-you-build', text: 'What useful startup groups look like →' },
        { href: '/blog/how-to-join-a-startup-group-without-wasting-months', text: 'Join playbook so you don\u2019t waste months →' },
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
        { href: '/blog/create-a-startup-group-around-your-idea', text: 'Step-by-step: create a startup group around your idea →' },
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
        { href: '/blog/how-to-split-startup-equity-fairly', text: 'Practical guide to splitting equity fairly →' },
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
        { href: '/blog/how-to-split-startup-equity-fairly', text: 'Practical guide to splitting equity fairly →' },
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
    <a href="/create-startup-group" style="display:inline-block;padding:12px 24px;background:#ea580c;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;margin-right:12px;">Create a group</a>
    <a href="/groups" style="display:inline-block;padding:12px 24px;border:1px solid #cbd5e1;color:#1e293b;text-decoration:none;border-radius:8px;font-weight:600;">Browse startup groups</a>
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
  <p style="color:#475569;line-height:1.7;margin:0 0 40px;">Step-by-step: <a href="/blog/create-a-startup-group-around-your-idea" style="color:#ea580c;">create a startup group around your idea</a>.</p>

  <h2 style="font-size:1.5rem;font-weight:700;margin:0 0 12px;">2. Build a Group Around the Idea</h2>
  <p style="color:#475569;line-height:1.7;margin:0 0 16px;">Once the group is published, other people can discover it and learn what you are trying to build. EquityTake brings people together <strong>around the idea</strong>, not by matching profiles. Potential co-founders can explore the opportunity, join the discussion and decide whether their experience, skills, resources or capital fit.</p>
  <p style="color:#475569;line-height:1.7;margin:0 0 40px;">
    <a href="/blog/startup-groups-that-actually-help-you-build" style="color:#ea580c;">What useful startup groups look like</a> &middot;
    <a href="/blog/how-to-join-a-startup-group-without-wasting-months" style="color:#ea580c;">How to join without wasting months</a>
  </p>

  <h2 style="font-size:1.5rem;font-weight:700;margin:0 0 12px;">3. Decide What You Can Contribute</h2>
  <p style="color:#475569;line-height:1.7;margin:0 0 16px;"><strong>Cash</strong> is money someone is prepared to put toward building the business. <strong>Skills / Tasks</strong> is work, expertise, time or specific responsibilities they are prepared to take on. A group might include the person with the original idea, a developer who can build the product, a marketer who can acquire customers, and someone prepared to contribute capital.</p>

  <h2 style="font-size:1.5rem;font-weight:700;margin:0 0 12px;">4. Propose an Equity Claim</h2>
  <p style="color:#475569;line-height:1.7;margin:0 0 16px;">If someone wants to join, they can propose an equity claim showing: the percentage of equity requested, whether the contribution is Cash or Skills / Tasks, what the person proposes to contribute, and the corresponding <strong>Reference Value</strong>.</p>
  <p style="color:#475569;line-height:1.7;margin:0 0 16px;"><strong>Reference Value = Proposed Company Value &times; equity percentage.</strong> Example: Proposed Company Value $20,000, proposed equity 5%, Reference Value $1,000. If the contribution is Skills / Tasks, it does <strong>not</strong> mean that cash was invested.</p>
  <p style="color:#475569;line-height:1.7;margin:0 0 40px;">More on the conversation: <a href="/blog/how-to-split-startup-equity-fairly" style="color:#ea580c;">how to split startup equity fairly</a>.</p>

  <h2 style="font-size:1.5rem;font-weight:700;margin:0 0 12px;">5. Review, Discuss and Agree</h2>
  <p style="color:#475569;line-height:1.7;margin:0 0 40px;">An equity claim is not accepted automatically. Claims stay <strong>Pending</strong> while the group administrator and members consider them. If the claim is approved, that proposed equity is allocated to the member and removed from the equity still available.</p>

  <h2 style="font-size:1.5rem;font-weight:700;margin:0 0 12px;">6. Build the Team</h2>
  <p style="color:#475569;line-height:1.7;margin:0 0 16px;">As people join and proposed equity is allocated, an idea can become a structured founding team. The equity picture is: <strong>Founder equity + approved proposed allocations + available equity</strong>. Full allocation can mean a potential founding team has formed. It does not mean a company has been incorporated, or that legal shares have been issued.</p>

  <h2 style="font-size:1.5rem;font-weight:700;margin:0 0 12px;">7. Take the Startup Forward</h2>
  <p style="color:#475569;line-height:1.7;margin:0 0 40px;">EquityTake covers the stage between "I have an idea" and "we have a team that can build it." When a team is ready, the next steps are theirs: build the product, validate the business, prepare founder agreements, incorporate, raise finance, or get professional legal and financial advice.</p>

  <h2 style="font-size:1.5rem;font-weight:700;margin:0 0 12px;">Pre-incorporation and incorporated groups</h2>
  <p style="color:#475569;line-height:1.7;margin:0 0 16px;"><strong>Pre-incorporation.</strong> The business is not yet a company. Equity on EquityTake is a proposed, informal arrangement. It does not create legal shares or ownership.</p>
  <p style="color:#475569;line-height:1.7;margin:0 0 40px;"><strong>Incorporated.</strong> The business already exists. Equity on EquityTake is still a proposed allocation until the company has properly agreed and legally implemented it.</p>

  <h2 style="font-size:1.5rem;font-weight:700;margin:0 0 12px;">EquityTake does not sell shares</h2>
  <p style="color:#475569;line-height:1.7;margin:0 0 16px;">EquityTake does not issue shares, transfer legal ownership, hold investment funds, or automatically create legally binding equity agreements. Proposed Company Value, Reference Value and equity claims are discussion tools. Before formalising ownership, investment or company arrangements, get independent legal, financial and tax advice.</p>

  <h2 style="font-size:1.5rem;font-weight:700;margin:0 0 12px;">FAQ</h2>
  <dl style="color:#475569;line-height:1.7;margin:0 0 40px;">
    <dt style="font-weight:600;color:#1e293b;margin-top:16px;">What is Proposed Company Value?</dt>
    <dd style="margin:4px 0 0 0;">The value the group creator assigns to 100% of the business. It is a reference for equity talks, not a professional valuation.</dd>
    <dt style="font-weight:600;color:#1e293b;margin-top:16px;">How is Reference Value calculated?</dt>
    <dd style="margin:4px 0 0 0;">Proposed Company Value multiplied by the equity percentage. A $20,000 Proposed Company Value and 5% equity is a $1,000 Reference Value.</dd>
    <dt style="font-weight:600;color:#1e293b;margin-top:16px;">Does a Skills / Tasks claim mean cash was invested?</dt>
    <dd style="margin:4px 0 0 0;">No. Reference Value is only the reference attached to that proposed equity. It is not cash invested.</dd>
    <dt style="font-weight:600;color:#1e293b;margin-top:16px;">Does EquityTake issue shares?</dt>
    <dd style="margin:4px 0 0 0;">No. Claims and allocations on EquityTake are proposed. They do not issue shares, transfer ownership, or create a binding agreement by themselves.</dd>
    <dt style="font-weight:600;color:#1e293b;margin-top:16px;">Is EquityTake free?</dt>
    <dd style="margin:4px 0 0 0;">Yes. Sign-in is the only gate. Create a group or browse groups after you sign in.</dd>
  </dl>

  <p style="margin:24px 0;">
    <a href="/create-startup-group" style="display:inline-block;padding:12px 24px;background:#ea580c;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;margin-right:12px;">Create a group</a>
    <a href="/groups" style="display:inline-block;padding:12px 24px;border:1px solid #cbd5e1;color:#1e293b;text-decoration:none;border-radius:8px;font-weight:600;">Explore active groups</a>
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
  <p style="color:#475569;line-height:1.7;margin:0 0 20px;">Through our platform, you can: browse and join startup groups with innovative ideas; connect with potential co-founders who share your passion; claim equity stakes in promising ventures; collaborate with team members to bring ideas to life; and access resources and tools to help your startup succeed.</p>
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
  <p style="color:#475569;line-height:1.7;margin:0 0 20px;">Under GDPR and CCPA, you have rights to access, correct, delete, and restrict processing of your personal data. Contact equitytake@gmail.com to exercise these rights.</p>
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
  <p style="color:#475569;line-height:1.7;margin:0 0 20px;">By continuing to use our website, you consent to our use of cookies as described in this policy, unless you have disabled them through your browser settings or our cookie preference center.</p>
  <h2 style="font-size:1.3rem;font-weight:700;margin:24px 0 8px;">Types of cookies</h2>
  <ul style="color:#475569;line-height:1.7;padding-left:20px;margin:0 0 20px;">
    <li><strong>Essential</strong> — always active, required for the site to function.</li>
    <li><strong>Analytics</strong> — optional, help us understand how visitors use the site.</li>
    <li><strong>Functional</strong> — optional, remember preferences and settings.</li>
    <li><strong>Marketing</strong> — requires consent, used to show relevant content.</li>
  </ul>
  <p style="color:#475569;line-height:1.7;margin:0 0 40px;">You can manage cookies through your browser settings. Last updated January 15, 2025. Contact: equitytake@gmail.com.</p>`
    ),
  },
};

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
      const linkHref = g.slug ? `/groups/${esc(g.slug)}` : `/groups`;
      return `<div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:12px;">
        <h3 style="font-size:1.2rem;font-weight:600;margin:0 0 8px;"><a href="${linkHref}" style="color:#1e293b;text-decoration:none;">${name}</a></h3>
        ${desc ? `<p style="color:#64748b;margin:0 0 8px;font-size:0.95rem;">${desc}</p>` : ''}
        ${industry ? `<p style="color:#94a3b8;margin:0 0 4px;font-size:0.85rem;">Industry: ${industry}</p>` : ''}
        ${tags ? `<p style="color:#94a3b8;margin:0;font-size:0.85rem;">Tags: ${tags}</p>` : ''}
      </div>`;
    }).join('\n');
    groupsHtml = `<div style="margin:24px 0;">${items}</div>`;
  } else {
    groupsHtml = `<p style="color:#64748b;margin:24px 0;">No public groups available yet. Be the first to <a href="/create-startup-group" style="color:#ea580c;">create one</a>.</p>`;
  }

  const body = `<main style="font-family:system-ui,-apple-system,sans-serif;color:#1e293b;max-width:800px;margin:0 auto;padding:20px;">
  <h1 style="font-size:2rem;font-weight:700;margin:0 0 16px;">Browse startup groups</h1>
  <p style="font-size:1.1rem;line-height:1.6;color:#475569;margin:0 0 20px;">Each group is one idea and one team conversation. Browse, join, or create your own.</p>
  <p style="margin:0 0 24px;">
    <a href="/create-startup-group" style="display:inline-block;padding:12px 24px;background:#ea580c;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;margin-right:12px;">Create a startup group</a>
    <a href="/cofounder-matching" style="display:inline-block;padding:12px 24px;border:1px solid #cbd5e1;color:#1e293b;text-decoration:none;border-radius:8px;font-weight:600;">Co-founder matching</a>
  </p>
  ${groupsHtml}
  <p style="font-size:0.85rem;color:#94a3b8;margin:24px 0;">Numbers and percentages on a group are proposals for discussion. EquityTake does not issue shares, collect investment, or incorporate companies.</p>
  <p style="font-size:0.9rem;color:#64748b;margin:16px 0 0 0;">New here? <a href="/blog/how-to-join-a-startup-group-without-wasting-months" style="color:#ea580c;">How to join a startup group without wasting months →</a></p>
</main>`;
  return body;
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
        <h3 style="font-size:1.2rem;font-weight:600;margin:0 0 4px;"><a href="/blog/${slug}" style="color:#1e293b;text-decoration:none;">${title}</a></h3>
        ${date ? `<p style="color:#94a3b8;margin:0 0 8px;font-size:0.85rem;">${date}</p>` : ''}
        ${excerpt ? `<p style="color:#64748b;margin:0;font-size:0.95rem;">${excerpt}</p>` : ''}
      </div>`;
    }).join('\n');
    postsHtml = `<div style="margin:24px 0;">${items}</div>`;
  } else {
    postsHtml = `<p style="color:#64748b;margin:24px 0;">No blog posts available yet.</p>`;
  }

  const body = `<main style="font-family:system-ui,-apple-system,sans-serif;color:#1e293b;max-width:800px;margin:0 auto;padding:20px;">
  <h1 style="font-size:2rem;font-weight:700;margin:0 0 16px;">Blog</h1>
  <p style="font-size:1.1rem;line-height:1.6;color:#475569;margin:0 0 20px;">Insights, updates, and stories from the EquityTake team. Learn about building startups, finding co-founders, and growing your business.</p>
  ${postsHtml}
</main>`;
  return body;
}

// Convert Markdown links [text](url) to HTML <a> tags, leaving existing HTML untouched
function convertMarkdownLinks(text) {
  return text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, text, url) => {
    return `<a href="${url}">${text}</a>`;
  });
}

// Strip all HTML tags except <a> (preserves existing and converted links)
function stripHtmlPreserveLinks(html) {
  if (!html) return '';
  // Protect <a ...>text</a> by replacing with placeholders, strip other tags, then restore
  const links = [];
  let protectedHtml = String(html).replace(/<a\s+[^>]*>[\s\S]*?<\/a>/gi, (match) => {
    links.push(match);
    return `\x00LINK${links.length - 1}\x00`;
  });
  // Strip remaining HTML tags
  let text = protectedHtml.replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // Restore links
  text = text.replace(/\x00LINK(\d+)\x00/g, (_, i) => links[Number(i)]);
  return text;
}

// ---------- Generate a single blog post page ----------
function buildBlogPostPage(post) {
  const title = esc(post.title || 'Untitled');
  const excerpt = post.meta_description || post.excerpt || truncate(stripHtml(post.content_body), 160);
  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';
  // Convert Markdown links to real <a> tags, then strip other HTML but preserve links
  const rawBody = post.content_body || '';
  const withLinks = convertMarkdownLinks(rawBody);
  const bodyText = stripHtmlPreserveLinks(withLinks);
  // Show full content for crawlers, truncated to 5000 chars
  const fullBody = truncate(bodyText, 5000);

  const body = `<main style="font-family:system-ui,-apple-system,sans-serif;color:#1e293b;max-width:800px;margin:0 auto;padding:20px;">
  <h1 style="font-size:2rem;font-weight:700;margin:0 0 8px;">${title}</h1>
  ${date ? `<p style="color:#94a3b8;margin:0 0 24px;font-size:0.9rem;">Published ${date}</p>` : ''}
  <div style="color:#475569;line-height:1.7;font-size:1.05rem;">${fullBody}</div>
  <p style="margin:32px 0 16px;"><a href="/blog" style="color:#ea580c;">← Back to blog</a></p>
</main>`;
  return body;
}

// ---------- Write a file ----------
function writeRoute(distDir, routePath, html) {
  let filePath;
  if (routePath === '/') {
    filePath = join(distDir, 'index.html');
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
  const [posts, groups] = await Promise.all([
    fetchPublishedBlogPosts(),
    fetchPublicGroups(),
  ]);
  console.log(`   Found ${posts.length} blog posts, ${groups.length} public groups`);

  // Read the original dist/index.html to extract the correct asset filenames
  const builtIndex = readFileSync(join(distDir, 'index.html'), 'utf8');
  const jsMatch = builtIndex.match(/src="\/(assets\/index-[^"]+\.js)"/);
  const cssMatch = builtIndex.match(/href="\/(assets\/index-[^"]+\.css)"/);
  const jsAsset = jsMatch ? jsMatch[1] : 'assets/index.js';
  const cssAsset = cssMatch ? cssMatch[1] : 'assets/index.css';

  let generated = 0;
  let skipped = 0;

  // Patch the buildHtml function to use the actual built assets
  function buildHtmlWithAssets(opts) {
    const html = buildHtml(opts);
    return html
      .replace('/assets/index-6dIil5pz.js', `/${jsAsset}`)
      .replace('/assets/index-B5vig-LC.css', `/${cssAsset}`)
      .replace('/src/main.tsx', `/${jsAsset}`);
  }

  console.log('\n📄 Prerendering static routes...');
  for (const [routePath, config] of Object.entries(routes)) {
    let bodyHtml = config.bodyHtml;

    // Dynamic pages
    if (routePath === '/groups') {
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
    });
    writeRoute(distDir, routePath, html);
    generated++;
  }

  console.log('\n📝 Prerendering blog posts...');
  for (const post of posts) {
    if (!post.slug) continue;
    const routePath = `/blog/${post.slug}`;
    const bodyHtml = buildBlogPostPage(post);
    const title = `${post.title} – EquityTake Blog`;
    const description = post.meta_description || post.excerpt || truncate(stripHtml(post.content_body), 160);
    const html = buildHtmlWithAssets({
      path: routePath,
      title,
      description,
      h1: post.title,
      bodyHtml,
      ogType: 'article',
    });
    writeRoute(distDir, routePath, html);
    generated++;
  }

  console.log(`\n✅ Prerender complete: ${generated} pages generated, ${skipped} skipped.`);
}

main().catch((err) => {
  console.error('Prerender failed:', err);
  process.exit(1);
});
