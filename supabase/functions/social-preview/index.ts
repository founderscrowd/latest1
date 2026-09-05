import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const DEFAULT_SHARE_IMAGE = "https://equitytakeaway.com/social-share-default.png";
const SITE_NAME = "EquityTake";
const SITE_URL = "https://equitytakeaway.com";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildShareDescription(group: any): string {
  const parts: string[] = [];
  const desc = (group.description || "").slice(0, 140);
  if (desc) parts.push(desc + (group.description.length > 140 ? "..." : ""));
  if (group.industry) parts.push(`Industry: ${group.industry}`);
  if (group.equity_available != null) parts.push(`${group.equity_available}% equity available`);
  if (group.funding_needed) parts.push(`Funding: ${group.funding_needed}`);
  return parts.join(" | ") || `Join ${group.name} on EquityTake - connect with co-founders and build startups together`;
}

function generateHtml(group: any, slug: string): string {
  const groupName = escapeHtml(group.name || "EquityTake Group");
  const description = escapeHtml(buildShareDescription(group));
  const groupUrl = `${SITE_URL}/groups/${slug}`;
  const shareImage = group.cover_image || DEFAULT_SHARE_IMAGE;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${groupName} | ${SITE_NAME}</title>
  <meta name="description" content="${description}" />

  <!-- Open Graph -->
  <meta property="og:title" content="${groupName} | ${SITE_NAME}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${groupUrl}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  <meta property="og:image" content="${shareImage}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${groupName} | ${SITE_NAME}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${shareImage}" />

  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a1e2e; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { max-width: 600px; text-align: center; padding: 2rem; }
    h1 { font-size: 1.8rem; margin-bottom: 0.5rem; }
    p { color: #94a3b8; font-size: 1rem; line-height: 1.6; }
    .cta { display: inline-block; margin-top: 1.5rem; padding: 0.75rem 2rem; background: #ea580c; color: #fff; border-radius: 0.5rem; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${groupName}</h1>
    <p>${description}</p>
    <a class="cta" href="${groupUrl}">View on ${SITE_NAME}</a>
  </div>
  <script>
    // Redirect real browsers to the SPA
    window.location.href = "${groupUrl}";
  </script>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");

  if (!slug) {
    return new Response(JSON.stringify({ error: "Missing slug parameter" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data: group, error } = await supabase
      .from("groups")
      .select("id, name, slug, description, industry, equity_available, funding_needed, cover_image, is_public")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !group) {
      return new Response(JSON.stringify({ error: "Group not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = generateHtml(group, slug);

    return new Response(html, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
