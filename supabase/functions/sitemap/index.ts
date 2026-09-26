import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const BASE_URL = "https://equitytakeaway.com";

const STATIC_PAGES: { path: string; changefreq: string; priority: string }[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/groups", changefreq: "daily", priority: "0.9" },
  { path: "/startup-groups", changefreq: "monthly", priority: "0.8" },
  { path: "/create-startup-group", changefreq: "monthly", priority: "0.8" },
  { path: "/cofounder-matching", changefreq: "monthly", priority: "0.8" },
  { path: "/find-a-cofounder", changefreq: "monthly", priority: "0.8" },
  { path: "/equity-for-cofounders", changefreq: "monthly", priority: "0.8" },
  { path: "/startup-equity-split", changefreq: "monthly", priority: "0.8" },
  { path: "/startup-team-building", changefreq: "monthly", priority: "0.8" },
  { path: "/communities-and-cooperatives", changefreq: "monthly", priority: "0.8" },
  { path: "/how-it-works", changefreq: "monthly", priority: "0.8" },
  { path: "/blog", changefreq: "weekly", priority: "0.8" },
  { path: "/about", changefreq: "monthly", priority: "0.7" },
  { path: "/privacy", changefreq: "monthly", priority: "0.3" },
  { path: "/terms", changefreq: "monthly", priority: "0.3" },
  { path: "/cookies", changefreq: "monthly", priority: "0.3" },
];

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry(loc: string, lastmod: string, changefreq: string, priority: string): string {
  return [
    "  <url>",
    `    <loc>${escapeXml(loc)}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    "  </url>",
  ].join("\n");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const today = new Date().toISOString().split("T")[0];

  const entries: string[] = [];

  for (const page of STATIC_PAGES) {
    entries.push(urlEntry(`${BASE_URL}${page.path}`, today, page.changefreq, page.priority));
  }

  let blogCount = 0;
  if (supabaseUrl && supabaseKey) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: posts, error } = await supabase
      .from("site_content")
      .select("slug, updated_at, published_at")
      .eq("content_type", "blog_post")
      .eq("is_published", true)
      .order("published_at", { ascending: false });

    if (!error && posts) {
      for (const post of posts) {
        const slug = (post.slug || "").replace(/^-+/, "");
        if (!slug) continue;
        const lastmod = (post.updated_at || post.published_at || today)
          .split("T")[0];
        entries.push(urlEntry(`${BASE_URL}/blog/${slug}`, lastmod, "monthly", "0.7"));
        blogCount++;
      }
    }
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    "</urlset>",
  ].join("\n");

  return new Response(xml, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});
