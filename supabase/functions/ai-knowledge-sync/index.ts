import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

// ─────────────────────────────────────────────────────────────────────────────
// CORS
// ─────────────────────────────────────────────────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const OPENAI_MODEL = 'gpt-4o-mini';

// ─────────────────────────────────────────────────────────────────────────────
// Limits
// ─────────────────────────────────────────────────────────────────────────────
const MAX_PAGES_TO_FETCH = 12;
const MAX_CONTENT_CHARS_PER_PAGE = 3000;
const MAX_SUGGESTIONS = 20;
const MAX_EXISTING_ENTRIES_TO_COMPARE = 200;

// ─────────────────────────────────────────────────────────────────────────────
// Structured feature manifest — derived from actual application routes and
// known component behavior. Only verified functionality is documented here.
// This is NOT user-generated content and does not change at runtime.
// ─────────────────────────────────────────────────────────────────────────────
const FEATURE_MANIFEST = `
VERIFIED EQUITYTAKE FUNCTIONALITY (from application code):

PUBLIC PAGES:
- Home (/) — landing page with platform overview and call to action
- How It Works (/how-it-works/) — explains the platform process
- About (/about/) — about the company
- Blog (/blog/) — list of blog articles
- Blog posts (/blog/:slug/) — individual articles
- Startup Groups (/startup-groups/) — browse and search public groups
- Create Startup Group (/create-startup-group/) — form to create a new group (requires sign-in)
- Communities and Cooperatives (/communities-and-cooperatives/) — information page
- Co-founder Matching (/cofounder-matching/) — information about matching
- Find a Co-founder (/find-a-cofounder/) — browse co-founders
- Equity for Co-founders (/equity-for-cofounders/) — explains equity offerings
- Startup Equity Split (/startup-equity-split/) — equity splitting guidance
- Startup Team Building (/startup-team-building/) — team building guidance
- Groups list (/groups/) — all public groups
- Group profile (/groups/:slug/) — public group profile page
- Group management (/groups/:slug/manage/) — group creator dashboard (requires ownership)
- Privacy Policy (/privacy/), Terms (/terms/), Cookies (/cookies/)

ACCOUNT FEATURES:
- Sign up with email and password; username is required at registration
- Sign in page (/sign-in/)
- Forgot password page (/forgot-password/) — sends reset email
- Reset password page (/reset-password/) — sets new password after reset link
- Profile page (/profile/) — shows joined groups and subscription status
- Site settings (/settings/) — admin-only area for site management

GROUP CREATION:
- Authenticated users can create a startup group via /create-startup-group/
- Group fields include: name, description, tags, industry, location, equity available %, Proposed Company Value, max members (2 to 1000), group stage (Pre-incorporation or Incorporated)
- Groups can be public or private
- Groups can be location-based or worldwide
- The group creator is the "starter"

GROUP MANAGEMENT:
- Group creators can manage their group at /groups/:slug/manage/
- Creators can edit group details, equity available, and group settings
- Creators can accept or reject equity applications from joiners

EQUITY PROCESS:
- Each group sets a Proposed Company Value and equity available percentage
- Reference Value = Proposed Company Value × Equity Percentage
- Users can apply for equity by proposing a contribution (skills, funding, or services)
- The group creator reviews and accepts or rejects applications
- EquityTake does not issue shares, transfer ownership, or collect payment
- Any actual legal ownership must be established outside the platform

COMMUNICATION:
- Groups have group chat functionality
- Community forums are available for all users
- Private conversations between users are supported

SUBSCRIPTIONS:
- EquityTake is completely free — no subscription fees, no credit card required
- All features are available at no cost

ADMIN FEATURES:
- Site admin can manage logo, announcements, important messages
- Site admin can enable/disable the AI support assistant (kill switch)
- Site admin can manage AI knowledge base entries
- Site admin can manage blog and about page content
`;

// ─────────────────────────────────────────────────────────────────────────────
// Helper: check if user is site admin
// ─────────────────────────────────────────────────────────────────────────────
async function isUserSiteAdmin(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('is_site_admin')
      .eq('id', userId)
      .maybeSingle();
    if (error) return false;
    return data?.is_site_admin === true;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: fetch published site content from Supabase
// ─────────────────────────────────────────────────────────────────────────────
async function fetchPublishedContent(): Promise<{ title: string; content: string; source: string }[]> {
  const results: { title: string; content: string; source: string }[] = [];

  try {
    const { data, error } = await supabase
      .from('site_content')
      .select('title, slug, content_body, excerpt, content_type')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(MAX_PAGES_TO_FETCH);

    if (!error && data) {
      for (const item of data) {
        const bodyText = (item.content_body || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const excerptText = (item.excerpt || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        const combined = `${item.title}. ${excerptText} ${bodyText}`.slice(0, MAX_CONTENT_CHARS_PER_PAGE);
        const source = item.content_type === 'blog_post'
          ? `https://equitytakeaway.com/blog/${item.slug}/`
          : `https://equitytakeaway.com/about/`;
        results.push({ title: item.title, content: combined, source });
      }
    }
  } catch (e) {
    console.error('Error fetching published content:', e);
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: fetch existing knowledge entries for dedup comparison
// ─────────────────────────────────────────────────────────────────────────────
async function fetchExistingKnowledge(): Promise<{ id: string; title: string; question: string; answer: string }[]> {
  try {
    const { data, error } = await supabase
      .from('ai_knowledge')
      .select('id, title, question, answer')
      .limit(MAX_EXISTING_ENTRIES_TO_COMPARE);

    if (!error && data) {
      return data;
    }
  } catch (e) {
    console.error('Error fetching existing knowledge:', e);
  }
  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: call OpenAI to generate knowledge suggestions from content
// ─────────────────────────────────────────────────────────────────────────────
interface RawSuggestion {
  title: string;
  question: string;
  answer: string;
  category: string;
  keywords: string;
  source_reference: string;
}

async function generateSuggestions(
  contentItems: { title: string; content: string; source: string }[],
  existingEntries: { id: string; title: string; question: string; answer: string }[]
): Promise<RawSuggestion[]> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured');
  }

  const contentBlock = contentItems.map((item, i) => {
    return `--- Content ${i + 1}: ${item.title} ---
Source: ${item.source}
${item.content}`;
  }).join('\n\n');

  const existingBlock = existingEntries.length > 0
    ? existingEntries.map((e, i) => `Existing ${i + 1}: Q="${e.question}" A="${e.answer.slice(0, 200)}"`).join('\n')
    : 'No existing entries.';

  const prompt = `You are a knowledge base generator for the EquityTake platform. Your job is to read the following website content and verified feature documentation, then generate practical knowledge-base entries that a support AI assistant can use to answer user questions.

WEBSITE CONTENT:
${contentBlock}

VERIFIED FEATURE DOCUMENTATION:
${FEATURE_MANIFEST}

EXISTING KNOWLEDGE ENTRIES (avoid duplicates — do not generate entries with the same or very similar questions):
${existingBlock}

INSTRUCTIONS:
1. Generate up to ${MAX_SUGGESTIONS} knowledge entries based ONLY on the content and verified features above.
2. Each entry should answer a natural question a visitor might ask.
3. Do NOT invent features, buttons, or navigation that are not in the content or verified features.
4. If content is a blog opinion piece, generate entries about what the platform does, not opinions from the blog.
5. Answers must be concise (2-4 sentences), factual, and based on the provided information.
6. Categories should be one of: Getting Started, Equity Management, Groups, Account & Profile, Communication, Pricing, Platform Information, Policies.
7. Keywords should be comma-separated phrases users might type.
8. Set source_reference to the URL or "Verified Feature Documentation" depending on where the info came from.

Return ONLY a JSON array (no markdown, no explanation) of objects with these fields:
[{"title":"...","question":"...","answer":"...","category":"...","keywords":"...","source_reference":"..."}]`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: 'You are a knowledge base generator. You output only valid JSON arrays.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 4000,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error: HTTP ${response.status} - ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const rawText = data.choices?.[0]?.message?.content ?? '[]';

  let suggestions: RawSuggestion[];
  try {
    // Strip any markdown fences if present
    const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    suggestions = JSON.parse(cleaned);
  } catch {
    console.error('Failed to parse OpenAI response as JSON:', rawText.slice(0, 500));
    return [];
  }

  if (!Array.isArray(suggestions)) return [];

  return suggestions.filter(s =>
    s && typeof s.title === 'string' && typeof s.question === 'string' && typeof s.answer === 'string'
  ).slice(0, MAX_SUGGESTIONS);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: classify and dedup suggestions against existing entries
// ─────────────────────────────────────────────────────────────────────────────
interface ClassifiedSuggestion extends RawSuggestion {
  type: 'new' | 'updated' | 'conflict' | 'needs_review';
  existing_entry_id?: string;
  existing_entry_title?: string;
  existing_entry_answer?: string;
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function isSimilarQuestion(q1: string, q2: string): boolean {
  const n1 = normalizeText(q1);
  const n2 = normalizeText(q2);
  if (n1 === n2) return true;
  // Check if one contains the other (for paraphrased questions)
  if (n1.length > 10 && n2.length > 10) {
    const words1 = new Set(n1.split(' '));
    const words2 = new Set(n2.split(' '));
    const intersection = [...words1].filter(w => words2.has(w) && w.length > 3);
    const smaller = Math.min(words1.size, words2.size);
    if (smaller > 0 && intersection.length / smaller >= 0.6) return true;
  }
  return false;
}

function classifySuggestions(
  raw: RawSuggestion[],
  existing: { id: string; title: string; question: string; answer: string }[]
): ClassifiedSuggestion[] {
  return raw.map(s => {
    const match = existing.find(e => isSimilarQuestion(s.question, e.question));

    if (!match) {
      return { ...s, type: 'new' as const };
    }

    const existingNormalized = normalizeText(match.answer);
    const newNormalized = normalizeText(s.answer);

    if (existingNormalized === newNormalized) {
      // Skip exact duplicates — don't create a suggestion
      return { ...s, type: 'duplicate' as any, existing_entry_id: match.id };
    }

    // Check if the answers are substantially different (potential conflict)
    const existingWords = new Set(existingNormalized.split(' '));
    const newWords = new Set(newNormalized.split(' '));
    const intersection = [...existingWords].filter(w => newWords.has(w));
    const larger = Math.max(existingWords.size, newWords.size);
    const similarity = larger > 0 ? intersection.length / larger : 0;

    if (similarity < 0.4) {
      return {
        ...s,
        type: 'conflict' as const,
        existing_entry_id: match.id,
        existing_entry_title: match.title,
        existing_entry_answer: match.answer,
      };
    }

    return {
      ...s,
      type: 'updated' as const,
      existing_entry_id: match.id,
      existing_entry_title: match.title,
      existing_entry_answer: match.answer,
    };
  }).filter(s => s.type !== 'duplicate') as ClassifiedSuggestion[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // ── Auth check ─────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isAdmin = await isUserSiteAdmin(user.id);
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Only site administrators can run knowledge sync.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Check OpenAI key ───────────────────────────────────────────────────
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key is not configured. Please contact support.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Create sync run record ─────────────────────────────────────────────
    const { data: syncRun } = await supabase
      .from('ai_knowledge_sync_runs')
      .insert({
        initiated_by: user.id,
        status: 'running',
      })
      .select('id')
      .single();

    const syncRunId = syncRun?.id ?? null;

    // ── Fetch content sources ──────────────────────────────────────────────
    const [contentItems, existingEntries] = await Promise.all([
      fetchPublishedContent(),
      fetchExistingKnowledge(),
    ]);

    // Always include the feature manifest as a "content source" even if
    // no published content was found
    const allContent = [...contentItems];
    if (allContent.length === 0 || allContent.length < 3) {
      allContent.push({
        title: 'Verified Feature Documentation',
        content: FEATURE_MANIFEST.slice(0, MAX_CONTENT_CHARS_PER_PAGE),
        source: 'Verified Feature Documentation',
      });
    }

    // ── Generate suggestions via OpenAI ────────────────────────────────────
    const rawSuggestions = await generateSuggestions(allContent, existingEntries);

    // ── Classify and dedup ─────────────────────────────────────────────────
    const classified = classifySuggestions(rawSuggestions, existingEntries);

    // ── Store suggestions in database ──────────────────────────────────────
    let newCount = 0, updatedCount = 0, conflictCount = 0, needsReviewCount = 0;

    const suggestionsToInsert = classified.map(s => {
      if (s.type === 'new') newCount++;
      else if (s.type === 'updated') updatedCount++;
      else if (s.type === 'conflict') conflictCount++;
      else needsReviewCount++;

      return {
        suggestion_type: s.type,
        status: 'pending',
        title: s.title,
        question: s.question,
        answer: s.answer,
        category: s.category || 'General',
        keywords: s.keywords || null,
        source_reference: s.source_reference || null,
        existing_entry_id: s.existing_entry_id || null,
        existing_entry_title: s.existing_entry_title || null,
        existing_entry_answer: s.existing_entry_answer || null,
        sync_run_id: syncRunId,
      };
    });

    if (suggestionsToInsert.length > 0) {
      await supabase
        .from('ai_knowledge_suggestions')
        .insert(suggestionsToInsert);
    }

    // ── Update sync run record ─────────────────────────────────────────────
    await supabase
      .from('ai_knowledge_sync_runs')
      .update({
        status: 'completed',
        pages_scanned: allContent.length,
        suggestions_generated: suggestionsToInsert.length,
        new_count: newCount,
        updated_count: updatedCount,
        conflict_count: conflictCount,
        needs_review_count: needsReviewCount,
        completed_at: new Date().toISOString(),
      })
      .eq('id', syncRunId);

    return new Response(
      JSON.stringify({
        success: true,
        sync_run_id: syncRunId,
        pages_scanned: allContent.length,
        suggestions_generated: suggestionsToInsert.length,
        new_count: newCount,
        updated_count: updatedCount,
        conflict_count: conflictCount,
        needs_review_count: needsReviewCount,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Knowledge sync error:', error.message);

    // Try to mark the sync run as failed if we have its ID
    // (We don't have syncRunId in this scope, so we just log)

    return new Response(
      JSON.stringify({ error: error.message || 'Knowledge sync failed. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
