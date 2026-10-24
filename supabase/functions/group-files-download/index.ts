import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // User client to verify identity and role
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse file_id from request body
    let fileId: string;
    try {
      const body = await req.json();
      fileId = body.file_id;
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!fileId || typeof fileId !== "string") {
      return new Response(
        JSON.stringify({ error: "File ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Service-role client to fetch file record (bypasses RLS for the lookup)
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // Step 1: Fetch the file record
    const { data: fileRecord, error: fetchError } = await serviceClient
      .from("group_files")
      .select("id, group_id, storage_path, original_filename")
      .eq("id", fileId)
      .maybeSingle();

    if (fetchError || !fileRecord) {
      return new Response(
        JSON.stringify({ error: "File not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Verify the caller's role in the file's group
    const { data: role, error: roleError } = await userClient
      .rpc("get_group_file_role", { p_group_id: fileRecord.group_id });

    if (roleError || !role) {
      return new Response(
        JSON.stringify({ error: "Access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Check download permission — starter, admin, cofounder can download
    if (!["starter", "admin", "cofounder"].includes(role)) {
      return new Response(
        JSON.stringify({ error: "You do not have permission to download files" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 4: Generate a short-lived signed URL (60 seconds)
    const { data: signedUrlData, error: signedUrlError } = await serviceClient
      .storage
      .from("group-files")
      .createSignedUrl(fileRecord.storage_path, 60, {
        download: fileRecord.original_filename,
      });

    if (signedUrlError || !signedUrlData) {
      console.error("[group-files-download] Signed URL generation failed:", signedUrlError);
      return new Response(
        JSON.stringify({ error: "Failed to generate download link" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        url: signedUrlData.signedUrl,
        filename: fileRecord.original_filename,
        expires_in: 60,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("[group-files-download] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
